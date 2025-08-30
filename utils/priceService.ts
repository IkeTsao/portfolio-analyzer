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

// 使用API路由獲取股票價格 (修復 Vercel 環境)
export async function fetchStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    console.log(`獲取股票價格: ${symbol}`);
    
    // 修復：使用完整 URL 確保在 Vercel 環境中正常工作
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${baseUrl}/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
    
    if (!response.ok) {
      console.error(`API請求失敗: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return {
        symbol: symbol.toUpperCase(),
        price: result.data.price,
        change: result.data.change,
        changePercent: result.data.changePercent,
        currency: result.data.currency,
        timestamp: result.data.lastUpdated,
        source: 'yahoo',
      };
    } else {
      console.error(`API返回錯誤: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`獲取 ${symbol} 價格失敗:`, error);
    return null;
  }
}

// 使用API路由獲取匯率 (修復 Vercel 環境)
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    console.log('獲取匯率數據');
    
    // 修復：使用完整 URL 確保在 Vercel 環境中正常工作
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${baseUrl}/api/exchange-rate`);
    
    if (!response.ok) {
      console.error(`匯率API請求失敗: ${response.status}`);
      return getDefaultExchangeRates();
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const rates: Record<string, number> = {};
      result.data.forEach((rate: ExchangeRate) => {
        rates[rate.currency] = rate.rate;
      });
      return rates;
    } else {
      console.error(`匯率API返回錯誤: ${result.error}`);
      return getDefaultExchangeRates();
    }
  } catch (error) {
    console.error('獲取匯率失敗:', error);
    return getDefaultExchangeRates();
  }
}

// 預設匯率（當API失敗時使用）
function getDefaultExchangeRates(): Record<string, number> {
  return {
    USD: 31.50,
    EUR: 34.20,
    GBP: 39.80,
    CHF: 35.10,
  };
}

// 向後兼容的函數
export const getStockPrice = fetchStockPrice;
export const getExchangeRate = async (from: string, to: string) => {
  const rates = await fetchExchangeRates();
  return {
    from,
    to,
    rate: rates[to] || 1,
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
