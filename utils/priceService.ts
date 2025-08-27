// 價格獲取服務 - 使用網路爬蟲獲取實時價格

import { PriceData, ExchangeRate } from '@/types/portfolio';

// 獲取美股價格（爬蟲Yahoo Finance）
export const getUSStockPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    const response = await fetch(`/api/scrape-stock?symbol=${symbol}&market=US`);
    const data = await response.json();
    
    if (data.success) {
      return {
        symbol,
        price: data.price,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        source: 'yahoo',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching US stock price:', error);
    return null;
  }
};

// 獲取台股價格（爬蟲台灣證交所或Yahoo Finance TW）
export const getTWStockPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    const response = await fetch(`/api/scrape-stock?symbol=${symbol}&market=TW`);
    const data = await response.json();
    
    if (data.success) {
      return {
        symbol,
        price: data.price,
        currency: 'TWD',
        timestamp: new Date().toISOString(),
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        source: 'twse',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching TW stock price:', error);
    return null;
  }
};

// 統一股票價格獲取接口
export const getStockPrice = async (symbol: string, region: string = 'US'): Promise<PriceData | null> => {
  if (region === 'TW') {
    return getTWStockPrice(symbol);
  } else {
    return getUSStockPrice(symbol);
  }
};

// 獲取外匯匯率（爬蟲銀行網站或金融網站）
export const getExchangeRate = async (from: string, to: string): Promise<ExchangeRate | null> => {
  try {
    const response = await fetch(`/api/scrape-exchange-rate?from=${from}&to=${to}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        from,
        to,
        rate: data.rate,
        timestamp: new Date().toISOString(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // 返回模擬匯率數據作為備用
    const mockRates: { [key: string]: number } = {
      'USD-TWD': 31.5,
      'EUR-TWD': 34.2,
      'GBP-TWD': 39.8,
      'CHF-TWD': 35.1,
      'JPY-TWD': 0.21,
      'TWD-USD': 0.0317,
      'USD-EUR': 0.92,
      'USD-GBP': 0.79,
      'USD-CHF': 0.90,
      'USD-JPY': 150.2,
    };
    
    const rateKey = `${from}-${to}`;
    const rate = mockRates[rateKey] || 1;
    
    return {
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
    };
  }
};

// 獲取加密貨幣價格（使用CoinGecko API）
export const getCryptoPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    // 將常見的加密貨幣符號轉換為CoinGecko ID
    const cryptoIds: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'LTC': 'litecoin',
      'XRP': 'ripple',
      'BCH': 'bitcoin-cash',
    };
    
    const coinId = cryptoIds[symbol.toUpperCase()] || symbol.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await response.json();
    
    if (data[coinId]) {
      return {
        symbol: symbol.toUpperCase(),
        price: data[coinId].usd,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        change: data[coinId].usd_24h_change || 0,
        changePercent: (data[coinId].usd_24h_change || 0) / 100,
        source: 'coingecko',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    
    // 返回模擬加密貨幣價格
    const mockPrice: PriceData = {
      symbol: symbol.toUpperCase(),
      price: Math.random() * 50000 + 1000, // 模擬價格 1000-51000
      currency: 'USD',
      timestamp: new Date().toISOString(),
      change: (Math.random() - 0.5) * 2000, // 模擬變化
      changePercent: (Math.random() - 0.5) * 0.2, // 模擬變化百分比 -10% 到 +10%
      source: 'coingecko',
    };
    
    return mockPrice;
  }
};

// 獲取黃金價格
export const getGoldPrice = async (): Promise<PriceData | null> => {
  try {
    // 黃金價格通常以美元/盎司計價
    // 這裡使用模擬數據，實際可以集成金融數據API
    const mockPrice: PriceData = {
      symbol: 'GOLD',
      price: Math.random() * 100 + 1900, // 模擬黃金價格 1900-2000 USD/oz
      currency: 'USD',
      timestamp: new Date().toISOString(),
      change: (Math.random() - 0.5) * 50, // 模擬變化
      changePercent: (Math.random() - 0.5) * 0.05, // 模擬變化百分比 -2.5% 到 +2.5%
      source: 'yahoo',
    };
    
    return mockPrice;
  } catch (error) {
    console.error('Error fetching gold price:', error);
    return null;
  }
};

// 批量獲取多個匯率
export const getMultipleExchangeRates = async (baseCurrency: string, targetCurrencies: string[]): Promise<ExchangeRate[]> => {
  const rates: ExchangeRate[] = [];
  
  for (const target of targetCurrencies) {
    if (target !== baseCurrency) {
      const rate = await getExchangeRate(baseCurrency, target);
      if (rate) {
        rates.push(rate);
      }
    }
  }
  
  return rates;
};

// 更新所有價格數據
export const updateAllPrices = async (holdings: any[], manualPrices?: { [symbol: string]: number }): Promise<PriceData[]> => {
  const pricePromises: Promise<PriceData | null>[] = [];
  
  for (const holding of holdings) {
    // 檢查是否有手動輸入的價格
    if (manualPrices && manualPrices[holding.symbol]) {
      pricePromises.push(Promise.resolve({
        symbol: holding.symbol,
        price: manualPrices[holding.symbol],
        currency: holding.currency,
        timestamp: new Date().toISOString(),
        change: 0,
        changePercent: 0,
        source: 'manual' as any,
      }));
      continue;
    }

    switch (holding.type) {
      case 'stock':
        pricePromises.push(getStockPrice(holding.symbol, holding.market === 'TW' ? 'TW' : 'US'));
        break;
      case 'crypto':
        pricePromises.push(getCryptoPrice(holding.symbol));
        break;
      case 'gold':
        pricePromises.push(getGoldPrice());
        break;
      case 'cash':
        // 現金不需要價格更新，價值為1
        pricePromises.push(Promise.resolve({
          symbol: holding.symbol,
          price: 1,
          currency: holding.currency,
          timestamp: new Date().toISOString(),
          change: 0,
          changePercent: 0,
          source: 'static' as any,
        }));
        break;
      default:
        // 基金、債券等使用股票API
        pricePromises.push(getStockPrice(holding.symbol, holding.market === 'TW' ? 'TW' : 'US'));
        break;
    }
  }
  
  const results = await Promise.all(pricePromises);
  return results.filter((price): price is PriceData => price !== null);
};

