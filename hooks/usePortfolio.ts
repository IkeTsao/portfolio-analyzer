// 投資組合數據管理Hook
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
  getLastUpdateTime,
} from '@/utils/portfolioStorage';
import {
  updateAllPrices,
  fetchExchangeRates,
} from '@/utils/priceService';
import {
  calculatePortfolioStats,
  calculateHoldingDetails,
} from '@/utils/portfolioCalculations';

export const usePortfolio = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // 載入初始數據
  useEffect(() => {
    const loadInitialData = () => {
      const loadedAccounts = loadAccounts();
      const loadedHoldings = loadHoldings();
      const loadedPriceData = loadPriceData();
      const loadedExchangeRates = loadExchangeRates();
      const lastUpdateTime = getLastUpdateTime();

      setAccounts(loadedAccounts);
      setHoldings(loadedHoldings);
      setPriceData(loadedPriceData);
      setExchangeRates(loadedExchangeRates);
      setLastUpdate(lastUpdateTime);
    };

    loadInitialData();
  }, []);

  // 計算投資組合統計
  useEffect(() => {
    if (holdings.length > 0) {
      const stats = calculatePortfolioStats(holdings, priceData, exchangeRates);
      setPortfolioStats(stats);
    }
  }, [holdings, priceData, exchangeRates]);

  // 更新價格數據
  const updatePrices = useCallback(async (manualPrices?: { [symbol: string]: number }, forceUpdate: boolean = true) => {
    if (holdings.length === 0) return;

    setLoading(true);
    try {
      // 更新股票和其他資產價格，默認強制更新
      const newPriceData = await updateAllPrices(holdings, forceUpdate);
      setPriceData(newPriceData);
      savePriceData(newPriceData);

      // 更新匯率
      const uniqueCurrencies = Array.from(new Set(holdings.map(h => h.currency)));
      const baseCurrency = 'TWD';
      const otherCurrencies = uniqueCurrencies.filter(c => c !== baseCurrency);
      
      if (otherCurrencies.length > 0) {
        const newExchangeRates = await fetchExchangeRates();
        
        // 轉換為ExchangeRate格式
        const rateArray: ExchangeRate[] = [];
        for (const [currency, rate] of Object.entries(newExchangeRates)) {
          rateArray.push({
            from: 'TWD',
            to: currency,
            rate: 1 / rate, // 轉換為TWD對其他貨幣的匯率
            timestamp: new Date().toISOString(),
          });
        }

        setExchangeRates(rateArray);
        saveExchangeRates(rateArray);
      }

      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setLoading(false);
    }
  }, [holdings]);

  // 獲取需要手動輸入價格的共同基金
  const getMutualFundsForManualInput = useCallback(() => {
    return holdings.filter(h => h.type === 'fund');
  }, [holdings]);

  // 刷新持倉數據
  const refreshHoldings = useCallback(() => {
    const loadedHoldings = loadHoldings();
    setHoldings(loadedHoldings);
  }, []);

  // 獲取持倉詳細資訊
  const getHoldingDetails = useCallback(() => {
    return calculateHoldingDetails(holdings, priceData, exchangeRates);
  }, [holdings, priceData, exchangeRates]);

  // 按帳戶獲取持倉
  const getHoldingsByAccount = useCallback((accountId: string) => {
    return holdings.filter(h => h.accountId === accountId);
  }, [holdings]);

  // 按類型獲取持倉
  const getHoldingsByType = useCallback((type: string) => {
    return holdings.filter(h => h.type === type);
  }, [holdings]);

  // 檢查是否需要更新價格（超過5分鐘）
  const shouldUpdatePrices = useCallback(() => {
    if (!lastUpdate) return true;
    
    const lastUpdateTime = new Date(lastUpdate);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
    
    return diffMinutes > 5; // 5分鐘更新一次
  }, [lastUpdate]);

  // 計算投資組合統計
  useEffect(() => {
    if (holdings.length > 0) {
      const stats = calculatePortfolioStats(holdings, priceData, exchangeRates);
      setPortfolioStats(stats);
    } else {
      setPortfolioStats(null);
    }
  }, [holdings, priceData, exchangeRates]);

  // 自動更新價格
  useEffect(() => {
    if (holdings.length > 0 && shouldUpdatePrices()) {
      // 自動更新使用非強制模式，保留手動輸入的價格
      updatePrices(undefined, false);
    }
  }, [holdings, shouldUpdatePrices, updatePrices]);

  return {
    // 數據
    accounts,
    holdings,
    priceData,
    exchangeRates,
    portfolioStats,
    lastUpdate,
    loading,

    // 方法
    updatePrices,
    refreshHoldings,
    getHoldingDetails,
    getHoldingsByAccount,
    getHoldingsByType,
    getMutualFundsForManualInput,
    shouldUpdatePrices,
  };
};

