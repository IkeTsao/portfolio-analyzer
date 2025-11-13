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
  calculateTopHoldings,
  TopHolding,
} from '@/utils/portfolioCalculations';

export const usePortfolio = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);
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
        
        // 轉換為ExchangeRate格式 - 修正匯率方向
        const rateArray: ExchangeRate[] = [];
        for (const [currency, rate] of Object.entries(newExchangeRates)) {
          // API返回的是外幣對台幣的匯率（如USD=30.66），直接使用
          rateArray.push({
            from: currency,  // 外幣
            to: 'TWD',      // 台幣
            rate: rate,     // 外幣對台幣的匯率
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
    try {
      const loadedHoldings = loadHoldings();
      setHoldings(loadedHoldings);
      console.log('持倉數據刷新成功，共', loadedHoldings.length, '筆');
    } catch (error) {
      console.error('刷新持倉數據失敗:', error);
      // 發生錯誤時不更新狀態，保持現有數據
    }
  }, []);

  // 獲取持倉詳細資訊
  // 更新持倉計算欄位
  const updateHoldingCalculations = useCallback(() => {
    // 使用函數式更新來避免依賴問題
    setHoldings(currentHoldings => {
      if (currentHoldings.length === 0) return currentHoldings;
      
      // 獲取當前的價格和匯率數據
      const currentPriceData = loadPriceData();
      const currentExchangeRates = loadExchangeRates();
      
      // 計算完整的持倉詳細資料
      const calculatedHoldings = calculateHoldingDetails(currentHoldings, currentPriceData, currentExchangeRates);
      
      // 更新 localStorage 中的計算欄位
      const updatedHoldings = currentHoldings.map(holding => {
        const calculated = calculatedHoldings.find(c => c.id === holding.id);
        if (calculated) {
          return {
            ...holding,
            currentValue: calculated.currentValue,
            costValue: calculated.costValue,
            gainLoss: calculated.gainLoss,
            gainLossPercent: calculated.gainLossPercent,
            exchangeRate: calculated.exchangeRate,
          };
        }
        return holding;
      });
      
      // 儲存更新後的資料到 localStorage
      localStorage.setItem('portfolio_holdings', JSON.stringify(updatedHoldings));
      
      return updatedHoldings;
    });
  }, []); // 空依賴陣列，避免無限循環

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

  // 當價格或匯率更新時，自動更新計算欄位
  useEffect(() => {
    if (holdings.length > 0 && (priceData.length > 0 || exchangeRates.length > 0)) {
      updateHoldingCalculations();
    }
  }, [priceData, exchangeRates]); // 移除 updateHoldingCalculations 依賴避免無限循環

  // 計算投資組合統計 - 確保使用最新的持倉數據
  useEffect(() => {
    if (holdings.length > 0) {
      // 獲取最新的持倉數據（包含計算欄位）
      const latestHoldings = loadHoldings();
      const stats = calculatePortfolioStats(latestHoldings, priceData, exchangeRates);
      const topHoldingsData = calculateTopHoldings(latestHoldings);
      setPortfolioStats(stats);
      setTopHoldings(topHoldingsData);
    } else {
      setPortfolioStats(null);
      setTopHoldings([]);
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
    topHoldings,
    lastUpdate,
    loading,

    // 方法
    updatePrices,
    refreshHoldings,
    getHoldingDetails,
    updateHoldingCalculations,
    getHoldingsByAccount,
    getHoldingsByType,
    getMutualFundsForManualInput,
    shouldUpdatePrices,
  };
};

