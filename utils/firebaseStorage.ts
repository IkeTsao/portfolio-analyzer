// Firebase 存儲服務 - 替代 localStorage
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
        unsubscribe();
        resolve(user);
      } else {
        // 如果沒有用戶，創建匿名用戶
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          authInitialized = true;
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

// 獲取用戶文檔路徑
const getUserDocPath = (collection: string) => {
  if (!currentUser) {
    throw new Error('用戶未認證');
  }
  return `users/${currentUser.uid}/${collection}`;
};

// 通用的 Firestore 操作
class FirebaseStorageService {
  
  // 保存數據到 Firestore
  async saveData<T>(collectionName: string, data: T): Promise<void> {
    await initializeAuth();
    if (!currentUser) throw new Error('用戶未認證');
    
    const docRef = doc(db, getUserDocPath(collectionName), 'data');
    await setDoc(docRef, {
      data,
      updatedAt: serverTimestamp(),
      userId: currentUser.uid
    });
  }

  // 從 Firestore 載入數據
  async loadData<T>(collectionName: string, defaultValue: T): Promise<T> {
    await initializeAuth();
    if (!currentUser) return defaultValue;
    
    try {
      const docRef = doc(db, getUserDocPath(collectionName), 'data');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const result = docSnap.data();
        return result.data as T;
      }
    } catch (error) {
      console.error(`載入 ${collectionName} 失敗:`, error);
    }
    
    return defaultValue;
  }

  // 監聽數據變化
  subscribeToData<T>(
    collectionName: string, 
    callback: (data: T | null) => void
  ): Unsubscribe | null {
    if (!currentUser) return null;
    
    const docRef = doc(db, getUserDocPath(collectionName), 'data');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const result = doc.data();
        callback(result.data as T);
      } else {
        callback(null);
      }
    });
  }
}

const firebaseStorage = new FirebaseStorageService();

// 帳戶管理
export const saveAccounts = async (accounts: Account[]): Promise<void> => {
  await firebaseStorage.saveData('accounts', accounts);
};

export const loadAccounts = async (): Promise<Account[]> => {
  const defaultAccounts: Account[] = [
    {
      id: 'etrade',
      name: 'Etrade',
      type: 'brokerage',
      currency: 'USD',
      holdings: [],
    },
    {
      id: 'fubon',
      name: '富邦銀行',
      type: 'bank',
      currency: 'TWD',
      holdings: [],
    },
    {
      id: 'esun',
      name: '玉山銀行',
      type: 'bank',
      currency: 'TWD',
      holdings: [],
    },
  ];
  
  return await firebaseStorage.loadData('accounts', defaultAccounts);
};

// 持倉管理
export const saveHoldings = async (holdings: Holding[]): Promise<void> => {
  await firebaseStorage.saveData('holdings', holdings);
};

export const loadHoldings = async (): Promise<Holding[]> => {
  return await firebaseStorage.loadData('holdings', []);
};

export const addHolding = async (holding: Holding): Promise<void> => {
  const holdings = await loadHoldings();
  holdings.push(holding);
  await saveHoldings(holdings);
};

export const updateHolding = async (holdingId: string, updates: Partial<Holding>): Promise<void> => {
  const holdings = await loadHoldings();
  const index = holdings.findIndex(h => h.id === holdingId);
  if (index !== -1) {
    holdings[index] = { ...holdings[index], ...updates };
    await saveHoldings(holdings);
  }
};

export const deleteHolding = async (holdingId: string): Promise<void> => {
  const holdings = await loadHoldings();
  const filtered = holdings.filter(h => h.id !== holdingId);
  await saveHoldings(filtered);
};

// 清空所有持倉數據
export const clearAllHoldings = async (): Promise<void> => {
  await saveHoldings([]);
};

// 批量添加持倉
export const addMultipleHoldings = async (holdings: Holding[]): Promise<void> => {
  const existingHoldings = await loadHoldings();
  const allHoldings = [...existingHoldings, ...holdings];
  await saveHoldings(allHoldings);
};

// 匯率管理
export const saveExchangeRates = async (rates: ExchangeRate[]): Promise<void> => {
  await firebaseStorage.saveData('exchangeRates', rates);
};

export const loadExchangeRates = async (): Promise<ExchangeRate[]> => {
  return await firebaseStorage.loadData('exchangeRates', []);
};

// 價格數據管理
export const savePriceData = async (priceData: PriceData[]): Promise<void> => {
  await firebaseStorage.saveData('priceData', priceData);
};

export const loadPriceData = async (): Promise<PriceData[]> => {
  return await firebaseStorage.loadData('priceData', []);
};

// 最後更新時間
export const saveLastUpdate = async (timestamp: string): Promise<void> => {
  await firebaseStorage.saveData('lastUpdate', timestamp);
};

export const loadLastUpdate = async (): Promise<string | null> => {
  return await firebaseStorage.loadData('lastUpdate', null);
};

// 數據監聽器 (實時同步)
export const subscribeToHoldings = (callback: (holdings: Holding[]) => void): Unsubscribe | null => {
  return firebaseStorage.subscribeToData('holdings', (data) => {
    callback(data || []);
  });
};

export const subscribeToAccounts = (callback: (accounts: Account[]) => void): Unsubscribe | null => {
  return firebaseStorage.subscribeToData('accounts', (data) => {
    callback(data || []);
  });
};

// 離線支援 - 檢查網路狀態
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// 數據遷移 - 從 localStorage 遷移到 Firebase
export const migrateFromLocalStorage = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // 遷移帳戶
    const localAccounts = localStorage.getItem('portfolio_accounts');
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts);
      await saveAccounts(accounts);
      console.log('✅ 帳戶數據已遷移到 Firebase');
    }

    // 遷移持倉
    const localHoldings = localStorage.getItem('portfolio_holdings');
    if (localHoldings) {
      const holdings = JSON.parse(localHoldings);
      await saveHoldings(holdings);
      console.log('✅ 持倉數據已遷移到 Firebase');
    }

    // 遷移匯率
    const localRates = localStorage.getItem('portfolio_exchange_rates');
    if (localRates) {
      const rates = JSON.parse(localRates);
      await saveExchangeRates(rates);
      console.log('✅ 匯率數據已遷移到 Firebase');
    }

    // 遷移價格數據
    const localPrices = localStorage.getItem('portfolio_price_data');
    if (localPrices) {
      const prices = JSON.parse(localPrices);
      await savePriceData(prices);
      console.log('✅ 價格數據已遷移到 Firebase');
    }

    // 遷移最後更新時間
    const localUpdate = localStorage.getItem('portfolio_last_update');
    if (localUpdate) {
      await saveLastUpdate(localUpdate);
      console.log('✅ 更新時間已遷移到 Firebase');
    }

    console.log('🎉 所有數據已成功遷移到 Firebase！');
  } catch (error) {
    console.error('❌ 數據遷移失敗:', error);
  }
};

export default firebaseStorage;

