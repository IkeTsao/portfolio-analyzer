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
export async function updateAllPrices(holdings: any[], forceUpdate: boolean = false): Promise<PriceData[]> {
  const pricePromises: Promise<PriceData | null>[] = [];
  let holdingsModified = false;
  
  for (const holding of holdings) {
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

    // 根據 priceSource 和 forceUpdate 決定是否更新價格
    const priceSource = holding.priceSource;
    const hasCurrentPrice = holding.currentPrice && holding.currentPrice > 0;
    
    // 強制更新時的邏輯
    if (forceUpdate) {
      // 保留 CSV 和手動輸入的價格，只更新 API 價格或沒有價格的項目
      if (priceSource === 'csv' || priceSource === 'manual') {
        console.log(`[保留${priceSource === 'csv' ? 'CSV' : '手動'}價格] ${holding.symbol}: ${holding.currentPrice} (來源: ${priceSource})`);
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
      
      // 對於 API 價格或沒有價格來源的項目，進行更新
      console.log(`[強制更新] ${holding.symbol}: 準備獲取最新價格 (當前來源: ${priceSource || '無'})`);
      pricePromises.push(fetchStockPrice(holding.symbol));
    } else {
      // 非強制更新時，只為沒有價格的項目獲取價格
      if (hasCurrentPrice) {
        console.log(`[保留現有價格] ${holding.symbol}: ${holding.currentPrice} (來源: ${priceSource || '未知'})`);
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
      
      // 沒有價格時獲取新價格
      console.log(`[獲取新價格] ${holding.symbol}: 沒有現價，準備獲取`);
      pricePromises.push(fetchStockPrice(holding.symbol));
    }
  }
  
  const results = await Promise.all(pricePromises);
  const validResults = results.filter((price): price is PriceData => price !== null);
  
  // 將API獲取的新價格更新到持倉數據中
  for (const priceData of validResults) {
    const holding = holdings.find(h => h.symbol === priceData.symbol);
    if (holding && holding.type !== 'cash') {
      const priceSource = holding.priceSource;
      
      // 只有在以下情況才更新價格：
      // 1. 強制更新且不是 CSV 或手動價格
      // 2. 非強制更新且沒有現價
      const shouldUpdate = (forceUpdate && priceSource !== 'csv' && priceSource !== 'manual') ||
                          (!forceUpdate && (!holding.currentPrice || holding.currentPrice <= 0));
      
      if (shouldUpdate) {
        console.log(`[價格更新] ${holding.symbol}: ${holding.currentPrice} → ${priceData.price} (來源: API)`);
        holding.currentPrice = priceData.price;
        holding.lastUpdated = priceData.timestamp;
        holding.priceSource = 'api'; // 標記為 API 來源
        holdingsModified = true;
        console.log(`✅ 已更新 ${holding.symbol} 的現價為 ${priceData.price}`);
      } else {
        console.log(`[跳過更新] ${holding.symbol}: 保持 ${holding.currentPrice} (來源: ${priceSource})`);
      }
    }
  }
  
  // 如果有修改持倉數據，保存到localStorage
  if (holdingsModified) {
    try {
      localStorage.setItem('portfolioHoldings', JSON.stringify(holdings));
      console.log('已保存更新後的持倉數據到localStorage');
    } catch (error) {
      console.error('保存持倉數據失敗:', error);
    }
  }
  
  return validResults;
}
