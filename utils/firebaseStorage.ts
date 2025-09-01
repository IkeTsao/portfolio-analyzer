import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Account, Holding, ExchangeRate, PriceData } from '@/types/portfolio';

// 用戶狀態管理
let currentUser: User | null = null;
let authInitialized = false;

// 初始化匿名認證
export const initializeAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (authInitialized) {
      resolve(currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        authInitialized = true;
        
        // 初始化用戶數據
        await initializeUserData(user.uid);
        
        unsubscribe();
        resolve(user);
      } else {
        // 如果沒有用戶，創建匿名用戶
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          authInitialized = true;
          
          // 初始化用戶數據
          await initializeUserData(result.user.uid);
          
          unsubscribe();
          resolve(result.user);
        } catch (error) {
          console.error('匿名登入失敗:', error);
          authInitialized = true;
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
};

// 初始化用戶數據
const initializeUserData = async (userId: string) => {
  try {
    console.log('🔧 初始化用戶數據:', userId);
    
    // 檢查是否已有帳戶
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const accountsSnapshot = await getDocs(accountsRef);
    
    if (accountsSnapshot.empty) {
      console.log('📝 創建默認帳戶');
      
      // 創建默認帳戶
      const defaultAccounts: Account[] = [
        {
          id: 'etrade',
          name: 'ETRADE',
          type: 'brokerage',
          currency: 'USD',
          holdings: [],
        },
        {
          id: 'ib',
          name: 'Interactive Brokers',
          type: 'brokerage',
          currency: 'USD',
          holdings: [],
        },
        {
          id: 'cash-twd',
          name: '現金帳戶 (台幣)',
          type: 'bank',
          currency: 'TWD',
          holdings: [],
        }
      ];
      
      // 保存默認帳戶
      for (const account of defaultAccounts) {
        await setDoc(doc(db, `users/${userId}/accounts`, account.id), account);
      }
      
      console.log('✅ 默認帳戶創建完成');
    }
    
    // 初始化匯率數據
    const exchangeRatesRef = doc(db, `users/${userId}/exchangeRates`, 'current');
    const exchangeRatesDoc = await getDoc(exchangeRatesRef);
    
    if (!exchangeRatesDoc.exists()) {
      console.log('💱 初始化匯率數據');
      
      const defaultRates: ExchangeRate[] = [
        { from: 'USD', to: 'TWD', rate: 30.665, timestamp: new Date().toISOString() },
        { from: 'EUR', to: 'TWD', rate: 36.055, timestamp: new Date().toISOString() },
        { from: 'GBP', to: 'TWD', rate: 41.655, timestamp: new Date().toISOString() },
        { from: 'CHF', to: 'TWD', rate: 38.41, timestamp: new Date().toISOString() },
        { from: 'JPY', to: 'TWD', rate: 0.2089, timestamp: new Date().toISOString() },
        { from: 'CNY', to: 'TWD', rate: 4.234, timestamp: new Date().toISOString() },
        { from: 'HKD', to: 'TWD', rate: 3.932, timestamp: new Date().toISOString() },
      ];
      
      await setDoc(exchangeRatesRef, { rates: defaultRates });
      console.log('✅ 匯率數據初始化完成');
    }
    
  } catch (error) {
    console.error('❌ 初始化用戶數據失敗:', error);
  }
};

// 獲取用戶ID
const getUserId = (): string => {
  if (!currentUser) {
    throw new Error('用戶未認證');
  }
  return currentUser.uid;
};

// 帳戶管理
export const loadAccounts = async (): Promise<Account[]> => {
  try {
    const userId = getUserId();
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const snapshot = await getDocs(accountsRef);
    
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Account[];
    
    console.log(`📊 載入 ${accounts.length} 個帳戶`);
    return accounts;
  } catch (error) {
    console.error('載入帳戶失敗:', error);
    return [];
  }
};

export const saveAccount = async (account: Account): Promise<void> => {
  try {
    const userId = getUserId();
    await setDoc(doc(db, `users/${userId}/accounts`, account.id), account);
    console.log(`✅ 帳戶已保存: ${account.name}`);
  } catch (error) {
    console.error('保存帳戶失敗:', error);
    throw error;
  }
};

// 持倉管理
export const loadHoldings = async (): Promise<Holding[]> => {
  try {
    const userId = getUserId();
    const holdingsRef = collection(db, `users/${userId}/holdings`);
    const snapshot = await getDocs(holdingsRef);
    
    const holdings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Holding[];
    
    console.log(`📊 載入 ${holdings.length} 個持倉`);
    return holdings;
  } catch (error) {
    console.error('載入持倉失敗:', error);
    return [];
  }
};

export const addHolding = async (holding: Holding): Promise<void> => {
  try {
    const userId = getUserId();
    await setDoc(doc(db, `users/${userId}/holdings`, holding.id), {
      ...holding,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ 持倉已新增: ${holding.symbol}`);
  } catch (error) {
    console.error('新增持倉失敗:', error);
    throw error;
  }
};

export const updateHolding = async (id: string, holding: Partial<Holding>): Promise<void> => {
  try {
    const userId = getUserId();
    await updateDoc(doc(db, `users/${userId}/holdings`, id), {
      ...holding,
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ 持倉已更新: ${id}`);
  } catch (error) {
    console.error('更新持倉失敗:', error);
    throw error;
  }
};

export const deleteHolding = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    await deleteDoc(doc(db, `users/${userId}/holdings`, id));
    console.log(`✅ 持倉已刪除: ${id}`);
  } catch (error) {
    console.error('刪除持倉失敗:', error);
    throw error;
  }
};

// 價格數據管理
export const loadPriceData = async (): Promise<PriceData[]> => {
  try {
    const userId = getUserId();
    const priceDataRef = doc(db, `users/${userId}/priceData`, 'current');
    const doc_snapshot = await getDoc(priceDataRef);
    
    if (doc_snapshot.exists()) {
      const data = doc_snapshot.data();
      console.log(`📊 載入 ${data.prices?.length || 0} 個價格數據`);
      return data.prices || [];
    }
    
    return [];
  } catch (error) {
    console.error('載入價格數據失敗:', error);
    return [];
  }
};

export const savePriceData = async (priceData: PriceData[]): Promise<void> => {
  try {
    const userId = getUserId();
    await setDoc(doc(db, `users/${userId}/priceData`, 'current'), {
      prices: priceData,
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ 價格數據已保存: ${priceData.length} 個`);
  } catch (error) {
    console.error('保存價格數據失敗:', error);
    throw error;
  }
};

// 匯率數據管理
export const loadExchangeRates = async (): Promise<ExchangeRate[]> => {
  try {
    const userId = getUserId();
    const exchangeRatesRef = doc(db, `users/${userId}/exchangeRates`, 'current');
    const doc_snapshot = await getDoc(exchangeRatesRef);
    
    if (doc_snapshot.exists()) {
      const data = doc_snapshot.data();
      console.log(`💱 載入 ${data.rates?.length || 0} 個匯率數據`);
      return data.rates || [];
    }
    
    return [];
  } catch (error) {
    console.error('載入匯率數據失敗:', error);
    return [];
  }
};

export const saveExchangeRates = async (exchangeRates: ExchangeRate[]): Promise<void> => {
  try {
    const userId = getUserId();
    await setDoc(doc(db, `users/${userId}/exchangeRates`, 'current'), {
      rates: exchangeRates,
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ 匯率數據已保存: ${exchangeRates.length} 個`);
  } catch (error) {
    console.error('保存匯率數據失敗:', error);
    throw error;
  }
};

// 最後更新時間
export const loadLastUpdate = async (): Promise<string | null> => {
  try {
    const userId = getUserId();
    const lastUpdateRef = doc(db, `users/${userId}/metadata`, 'lastUpdate');
    const doc_snapshot = await getDoc(lastUpdateRef);
    
    if (doc_snapshot.exists()) {
      return doc_snapshot.data().timestamp || null;
    }
    
    return null;
  } catch (error) {
    console.error('載入最後更新時間失敗:', error);
    return null;
  }
};

// 實時訂閱
export const subscribeToHoldings = (callback: (holdings: Holding[]) => void): Unsubscribe => {
  const userId = getUserId();
  const holdingsRef = collection(db, `users/${userId}/holdings`);
  
  return onSnapshot(holdingsRef, (snapshot) => {
    const holdings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Holding[];
    
    console.log(`🔄 持倉數據更新: ${holdings.length} 個`);
    callback(holdings);
  }, (error) => {
    console.error('持倉訂閱失敗:', error);
  });
};

export const subscribeToAccounts = (callback: (accounts: Account[]) => void): Unsubscribe => {
  const userId = getUserId();
  const accountsRef = collection(db, `users/${userId}/accounts`);
  
  return onSnapshot(accountsRef, (snapshot) => {
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Account[];
    
    console.log(`🔄 帳戶數據更新: ${accounts.length} 個`);
    callback(accounts);
  }, (error) => {
    console.error('帳戶訂閱失敗:', error);
  });
};

// 從本地存儲遷移數據
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    console.log('🔄 開始從本地存儲遷移數據...');
    
    // 檢查本地存儲中的數據
    const localHoldings = localStorage.getItem('portfolio_holdings');
    const localAccounts = localStorage.getItem('portfolio_accounts');
    
    if (localHoldings) {
      const holdings = JSON.parse(localHoldings) as Holding[];
      console.log(`📦 發現本地持倉數據: ${holdings.length} 個`);
      
      for (const holding of holdings) {
        await addHolding(holding);
      }
      
      // 清除本地數據
      localStorage.removeItem('portfolio_holdings');
      console.log('✅ 持倉數據遷移完成');
    }
    
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts) as Account[];
      console.log(`📦 發現本地帳戶數據: ${accounts.length} 個`);
      
      for (const account of accounts) {
        await saveAccount(account);
      }
      
      // 清除本地數據
      localStorage.removeItem('portfolio_accounts');
      console.log('✅ 帳戶數據遷移完成');
    }
    
    console.log('🎉 數據遷移完成');
  } catch (error) {
    console.error('❌ 數據遷移失敗:', error);
  }
};

