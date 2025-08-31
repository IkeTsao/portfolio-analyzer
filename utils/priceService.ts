export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: string;
  source: 'yahoo' | 'exchangerate' | 'coingecko' | 'twse';
}

export interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated: string;
}

// 直接調用免費股價API (Firebase靜態網站兼容)
export async function fetchStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    console.log(`獲取股價: ${symbol}`);
    
    // 使用Yahoo Finance的非官方API
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`股價API請求失敗: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      return {
        symbol,
        price: currentPrice,
        change,
        changePercent,
        currency: meta.currency || 'USD',
        timestamp: new Date().toISOString(),
        source: 'yahoo',
      };
    }
    
    return null;
  } catch (error) {
    console.error(`獲取股價失敗 ${symbol}:`, error);
    return null;
  }
}

// 直接調用台銀匯率API (Firebase靜態網站兼容)
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    console.log('獲取匯率數據');
    
    // 由於CORS限制，直接使用備用數據
    // 在實際部署中，可以使用代理服務器或CORS代理
    console.log('使用備用匯率數據 (CORS限制)');
    return getDefaultExchangeRates();
    
  } catch (error) {
    console.error('獲取匯率失敗:', error);
    return getDefaultExchangeRates();
  }
}

// 預設匯率（當API失敗時使用）
function getDefaultExchangeRates(): Record<string, number> {
  return {
    USD_TWD: 30.665,  // 台銀即期賣出價
    EUR_TWD: 36.055,  // 台銀即期賣出價
    GBP_TWD: 41.655,  // 台銀即期賣出價
    CHF_TWD: 38.41,   // 台銀即期賣出價
  };
}

// 向後兼容的函數
export const getStockPrice = fetchStockPrice;
export const getExchangeRate = async (from: string, to: string) => {
  const rates = await fetchExchangeRates();
  const key = `${from}_${to}`;
  return {
    from,
    to,
    rate: rates[key] || 1,
    timestamp: new Date().toISOString(),
  };
};

// 批量更新價格
export async function updateAllPrices(holdings: any[]): Promise<PriceData[]> {
  const pricePromises: Promise<PriceData | null>[] = [];
  
  for (const holding of holdings) {
    // 如果有手動輸入的現價，跳過API獲取
    if (holding.currentPrice && holding.currentPrice > 0) {
      pricePromises.push(Promise.resolve({
        symbol: holding.symbol,
        price: holding.currentPrice,
        change: 0,
        changePercent: 0,
        currency: holding.currency,
        timestamp: holding.lastUpdated || new Date().toISOString(),
        source: 'yahoo' as const,
      }));
      continue;
    }

    // 現金類型不需要價格更新
    if (holding.type === 'cash') {
      pricePromises.push(Promise.resolve({
        symbol: holding.symbol,
        price: 1,
        change: 0,
        changePercent: 0,
        currency: holding.currency,
        timestamp: new Date().toISOString(),
        source: 'yahoo' as const,
      }));
      continue;
    }

    // 其他類型使用API獲取價格
    pricePromises.push(fetchStockPrice(holding.symbol));
  }
  
  const results = await Promise.all(pricePromises);
  return results.filter((price): price is PriceData => price !== null);
}

