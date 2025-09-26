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
  
  // 獲取唯一的股票代碼，避免重複請求
  const uniqueSymbols = new Set<string>();
  const symbolToHoldings = new Map<string, any[]>();
  
  // 分組持倉按股票代碼
  for (const holding of holdings) {
    if (holding.type === 'cash') {
      continue; // 現金類型跳過
    }
    
    const symbol = holding.symbol.toUpperCase();
    uniqueSymbols.add(symbol);
    
    if (!symbolToHoldings.has(symbol)) {
      symbolToHoldings.set(symbol, []);
    }
    symbolToHoldings.get(symbol)!.push(holding);
  }
  
  console.log(`需要更新價格的唯一股票代碼: ${Array.from(uniqueSymbols).join(', ')}`);
  
  // 為每個唯一代碼獲取價格
  for (const symbol of Array.from(uniqueSymbols)) {
    const holdingsForSymbol = symbolToHoldings.get(symbol)!;
    const firstHolding = holdingsForSymbol[0];
    
    // 檢查是否需要更新價格
    const priceSource = firstHolding.priceSource;
    const hasCurrentPrice = firstHolding.currentPrice && firstHolding.currentPrice > 0;
    
    if (forceUpdate) {
      // 強制更新：只保留手動輸入的價格
      if (priceSource === 'manual') {
        console.log(`[保留手動價格] ${symbol}: ${firstHolding.currentPrice}`);
        pricePromises.push(Promise.resolve({
          symbol: symbol,
          price: firstHolding.currentPrice,
          change: 0,
          changePercent: 0,
          currency: firstHolding.currency,
          timestamp: firstHolding.lastUpdated || new Date().toISOString(),
          source: 'yahoo' as const,
        }));
      } else {
        console.log(`[強制更新] ${symbol}: 準備獲取最新價格`);
        pricePromises.push(fetchStockPrice(symbol));
      }
    } else {
      // 非強制更新：只為沒有價格的項目獲取價格
      if (hasCurrentPrice) {
        console.log(`[保留現有價格] ${symbol}: ${firstHolding.currentPrice} (來源: ${priceSource || '未知'})`);
        pricePromises.push(Promise.resolve({
          symbol: symbol,
          price: firstHolding.currentPrice,
          change: 0,
          changePercent: 0,
          currency: firstHolding.currency,
          timestamp: firstHolding.lastUpdated || new Date().toISOString(),
          source: 'yahoo' as const,
        }));
      } else {
        console.log(`[獲取新價格] ${symbol}: 沒有現價，準備獲取`);
        pricePromises.push(fetchStockPrice(symbol));
      }
    }
  }
  
  // 為現金類型添加固定價格
  for (const holding of holdings) {
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
    }
  }
  
  const results = await Promise.all(pricePromises);
  const validResults = results.filter((price): price is PriceData => price !== null);
  
  // 創建價格映射表
  const priceMap = new Map<string, PriceData>();
  for (const priceData of validResults) {
    priceMap.set(priceData.symbol.toUpperCase(), priceData);
  }
  
  // 將API獲取的新價格更新到所有相同代碼的持倉數據中
  for (const holding of holdings) {
    if (holding.type === 'cash') {
      continue; // 現金類型跳過
    }
    
    const symbol = holding.symbol.toUpperCase();
    const priceData = priceMap.get(symbol);
    
    if (priceData) {
      const priceSource = holding.priceSource;
      
      // 只有在以下情況才更新價格：
      // 1. 強制更新且不是手動價格
      // 2. 非強制更新且沒有現價
      const shouldUpdate = (forceUpdate && priceSource !== 'manual') ||
                          (!forceUpdate && (!holding.currentPrice || holding.currentPrice <= 0));
      
      if (shouldUpdate) {
        console.log(`[價格更新] ${holding.symbol}: ${holding.currentPrice || '無'} → ${priceData.price} (來源: API)`);
        holding.currentPrice = priceData.price;
        holding.lastUpdated = priceData.timestamp;
        holding.priceSource = 'api'; // 標記為 API 來源
        holdingsModified = true;
      } else {
        console.log(`[跳過更新] ${holding.symbol}: 保持 ${holding.currentPrice} (來源: ${priceSource})`);
      }
    } else {
      // 如果沒有獲取到價格數據，記錄警告
      if (!holding.currentPrice || holding.currentPrice <= 0) {
        console.warn(`⚠️ 無法獲取 ${holding.symbol} 的價格數據`);
      }
    }
  }
  
  // 如果有修改持倉數據，保存到localStorage
  if (holdingsModified) {
    try {
      localStorage.setItem('portfolio_holdings', JSON.stringify(holdings));
      console.log('已保存更新後的持倉數據到localStorage');
    } catch (error) {
      console.error('保存持倉數據失敗:', error);
    }
  }
  
  return validResults;
}
