// 歷史匯率管理工具
export interface HistoricalExchangeRates {
  USD: number;
  EUR: number;
  JPY: number;
  GBP: number;
  AUD: number;
  timestamp: number;
}

// 從歷史記錄中獲取指定日期的匯率
export const getHistoricalExchangeRates = (date: string): HistoricalExchangeRates | null => {
  try {
    const saved = localStorage.getItem('portfolioHistoricalData');
    if (!saved) return null;
    
    const records = JSON.parse(saved);
    const record = records.find((r: any) => r.date === date);
    
    if (record && record.exchangeRates) {
      return record.exchangeRates;
    }
    
    return null;
  } catch (error) {
    console.error('獲取歷史匯率失敗:', error);
    return null;
  }
};

// 獲取最新的歷史匯率（如果今天沒有記錄，則使用最近的記錄）
export const getLatestHistoricalExchangeRates = (): HistoricalExchangeRates | null => {
  try {
    const saved = localStorage.getItem('portfolioHistoricalData');
    if (!saved) return null;
    
    const records = JSON.parse(saved);
    if (records.length === 0) return null;
    
    // 按日期排序，獲取最新的記錄
    const sortedRecords = records.sort((a: any, b: any) => b.date.localeCompare(a.date));
    
    for (const record of sortedRecords) {
      if (record.exchangeRates) {
        return record.exchangeRates;
      }
    }
    
    return null;
  } catch (error) {
    console.error('獲取最新歷史匯率失敗:', error);
    return null;
  }
};

// 檢查是否應該使用歷史匯率（今天是否有記錄）
export const shouldUseHistoricalRates = (): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const historicalRates = getHistoricalExchangeRates(today);
  return historicalRates !== null;
};

// 獲取用於計算的匯率（優先使用歷史記錄，否則使用當前匯率）
export const getCalculationExchangeRates = async (): Promise<HistoricalExchangeRates> => {
  // 首先檢查是否有今天的歷史記錄
  const today = new Date().toISOString().split('T')[0];
  const todayRates = getHistoricalExchangeRates(today);
  
  if (todayRates) {
    console.log('使用今日歷史匯率進行計算');
    return todayRates;
  }
  
  // 如果沒有今天的記錄，嘗試獲取最新的歷史記錄
  const latestHistoricalRates = getLatestHistoricalExchangeRates();
  
  if (latestHistoricalRates) {
    console.log('使用最新歷史匯率進行計算');
    return latestHistoricalRates;
  }
  
  // 如果沒有任何歷史記錄，獲取當前匯率
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${baseUrl}/api/exchange-rate`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        console.log('使用當前即時匯率進行計算');
        return {
          USD: data.data.USD || 32.0,
          EUR: data.data.EUR || 35.0,
          JPY: data.data.JPY || 0.22,
          GBP: data.data.GBP || 40.0,
          AUD: data.data.AUD || 21.0,
          timestamp: Date.now(),
        };
      }
    }
  } catch (error) {
    console.warn('獲取當前匯率失敗:', error);
  }
  
  // 最後使用備用匯率
  console.log('使用備用匯率進行計算');
  return {
    USD: 32.0,
    EUR: 35.0,
    JPY: 0.22,
    GBP: 40.0,
    AUD: 21.0,
    timestamp: Date.now(),
  };
};

