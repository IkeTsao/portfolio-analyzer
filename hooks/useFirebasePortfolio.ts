'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Holding, 
  Account, 
  PriceData, 
  ExchangeRate, 
  PortfolioStats 
} from '@/types/portfolio';
import {
  loadAccounts,
  loadHoldings,
  loadPriceData,
  loadExchangeRates,
  savePriceData,
  saveExchangeRates,
  loadLastUpdate,
  subscribeToHoldings,
  subscribeToAccounts,
  migrateFromLocalStorage,
  initializeAuth,
} from '@/utils/firebaseStorage';
import {
  updateAllPrices,
  fetchExchangeRates,
} from '@/utils/priceService';
import {
  calculatePortfolioStats,
  calculateHoldingDetails,
} from '@/utils/portfolioCalculations';

export const useFirebasePortfolio = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [migrationCompleted, setMigrationCompleted] = useState(false);

  // 初始化 Firebase 認證
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuth();
        setAuthInitialized(true);
        
        // 檢查是否需要從 localStorage 遷移數據
        const hasLocalData = typeof window !== 'undefined' && (
          localStorage.getItem('portfolio_holdings') ||
          localStorage.getItem('portfolio_accounts')
        );
        
        if (hasLocalData && !migrationCompleted) {
          console.log('🔄 檢測到本地數據，開始遷移到 Firebase...');
          await migrateFromLocalStorage();
          setMigrationCompleted(true);
        }
      } catch (error) {
        console.error('Firebase 認證初始化失敗:', error);
        setAuthInitialized(true); // 即使失敗也要繼續
      }
    };

    initAuth();
  }, [migrationCompleted]);

  // 載入初始數據
  useEffect(() => {
    if (!authInitialized) return;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        const [
          loadedAccounts,
          loadedHoldings,
          loadedPriceData,
          loadedExchangeRates,
          lastUpdateTime
        ] = await Promise.all([
          loadAccounts(),
          loadHoldings(),
          loadPriceData(),
          loadExchangeRates(),
          loadLastUpdate()
        ]);

        setAccounts(loadedAccounts);
        setHoldings(loadedHoldings);
        setPriceData(loadedPriceData);
        setExchangeRates(loadedExchangeRates);
        setLastUpdate(lastUpdateTime);
      } catch (error) {
        console.error('載入初始數據失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [authInitialized]);

  // 設置實時監聽器
  useEffect(() => {
    if (!authInitialized) return;

    // 監聽持倉變化
    const unsubscribeHoldings = subscribeToHoldings((newHoldings) => {
      setHoldings(newHoldings);
    });

    // 監聽帳戶變化
    const unsubscribeAccounts = subscribeToAccounts((newAccounts) => {
      setAccounts(newAccounts);
    });

    // 清理監聽器
    return () => {
      if (unsubscribeHoldings) unsubscribeHoldings();
      if (unsubscribeAccounts) unsubscribeAccounts();
    };
  }, [authInitialized]);

  // 計算投資組合統計
  useEffect(() => {
    if (holdings.length > 0 && exchangeRates.length > 0) {
      const holdingsWithDetails = calculateHoldingDetails(holdings, priceData, exchangeRates);
      
      const stats = calculatePortfolioStats(holdings, priceData, exchangeRates);
      setPortfolioStats(stats);
    } else {
      setPortfolioStats(null);
    }
  }, [holdings, priceData, exchangeRates]);

  // 更新價格數據
  const updatePrices = useCallback(async () => {
    setLoading(true);
    try {
      const symbols = Array.from(new Set(holdings.map(h => h.symbol)));
      const newPriceData = await updateAllPrices(holdings);
      
      setPriceData(newPriceData);
      await savePriceData(newPriceData);
      
      const now = new Date().toISOString();
      setLastUpdate(now);
    } catch (error) {
      console.error('更新價格失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [holdings, priceData]);

  // 更新匯率
  const updateExchangeRates = useCallback(async () => {
    try {
      const newRates = await fetchExchangeRates();
      // 轉換為 ExchangeRate[] 格式
      const ratesArray = Object.entries(newRates).map(([key, rate]) => {
        const [from, to] = key.split('_');
        return { from, to, rate, timestamp: new Date().toISOString() };
      });
      setExchangeRates(ratesArray);
      await saveExchangeRates(ratesArray);
    } catch (error) {
      console.error('更新匯率失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 重新載入所有數據
  const refreshData = useCallback(async () => {
    if (!authInitialized) return;

    setLoading(true);
    try {
      const [
        loadedAccounts,
        loadedHoldings,
        loadedPriceData,
        loadedExchangeRates
      ] = await Promise.all([
        loadAccounts(),
        loadHoldings(),
        loadPriceData(),
        loadExchangeRates()
      ]);

      setAccounts(loadedAccounts);
      setHoldings(loadedHoldings);
      setPriceData(loadedPriceData);
      setExchangeRates(loadedExchangeRates);
    } catch (error) {
      console.error('重新載入數據失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [authInitialized]);

  // 獲取持倉詳細信息
  const getHoldingsWithDetails = useCallback(() => {
    return calculateHoldingDetails(holdings, priceData, exchangeRates);
  }, [holdings, priceData, exchangeRates]);

  // 按帳戶分組的持倉
  const getHoldingsByAccount = useCallback(() => {
    const grouped: { [accountId: string]: Holding[] } = {};
    
    holdings.forEach(holding => {
      if (!grouped[holding.accountId]) {
        grouped[holding.accountId] = [];
      }
      grouped[holding.accountId].push(holding);
    });
    
    return grouped;
  }, [holdings]);

  return {
    // 數據狀態
    accounts,
    holdings,
    priceData,
    exchangeRates,
    portfolioStats,
    loading,
    lastUpdate,
    authInitialized,
    migrationCompleted,
    
    // 操作方法
    updatePrices,
    updateExchangeRates,
    refreshData,
    getHoldingsWithDetails,
    getHoldingsByAccount,
    
    // 設置方法
    setAccounts,
    setHoldings,
    setPriceData,
    setExchangeRates,
  };
};

export default useFirebasePortfolio;

