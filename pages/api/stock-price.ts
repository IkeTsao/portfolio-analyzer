import { NextApiRequest, NextApiResponse } from 'next';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

interface ApiResponse {
  success: boolean;
  data?: StockPrice;
  error?: string;
}

// Yahoo Finance API endpoints
const YAHOO_ENDPOINTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart/',
  'https://query2.finance.yahoo.com/v8/finance/chart/',
];

// 特殊股票代碼映射
const SPECIAL_SYMBOLS: Record<string, string> = {
  // ETFs
  'GLD': 'GLD',
  'IBIT': 'IBIT',
  'ARKK': 'ARKK',
  'QQQ': 'QQQ',
  'SPY': 'SPY',
  'VTI': 'VTI',
  'IEF': 'IEF',
  'TLT': 'TLT',
  'AVAV': 'AVAV',
  
  // 個股
  'TSLA': 'TSLA',
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'GOOGL': 'GOOGL',
  'AMZN': 'AMZN',
  'NVDA': 'NVDA',
  'B': 'BRK-B',  // Berkshire Hathaway Class B
  'LEU': 'LEU',
  'MAGS': 'MAGS',
  'TEM': 'TEM',
  
  // 礦業股票
  'BARRICK': 'GOLD',  // Barrick Gold Corporation
  'GOLD': 'GOLD',
  
  // 特殊代碼處理
  '0P0001D3K': 'VTI',  // 假設這是某種基金代碼，映射到相似的ETF
};

async function fetchFromYahoo(symbol: string): Promise<StockPrice | null> {
  const mappedSymbol = SPECIAL_SYMBOLS[symbol.toUpperCase()] || symbol.toUpperCase();
  
  for (const endpoint of YAHOO_ENDPOINTS) {
    try {
      const url = `${endpoint}${mappedSymbol}`;
      console.log(`嘗試獲取 ${mappedSymbol} 的價格，使用端點: ${endpoint}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`端點 ${endpoint} 響應失敗: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data?.chart?.result?.[0]?.meta) {
        const meta = data.chart.result[0].meta;
        const currentPrice = meta.regularMarketPrice || meta.previousClose;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        
        if (currentPrice && previousClose) {
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;
          
          console.log(`成功獲取 ${mappedSymbol} 價格: $${currentPrice}`);
          
          return {
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            currency: meta.currency || 'USD',
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.log(`端點 ${endpoint} 請求失敗:`, error);
      continue;
    }
  }
  
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // 設置CORS頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: '只支持GET請求'
    });
  }

  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({
      success: false,
      error: '請提供有效的股票代碼'
    });
  }

  try {
    console.log(`API請求: 獲取 ${symbol} 的價格`);
    
    const stockPrice = await fetchFromYahoo(symbol);
    
    if (stockPrice) {
      return res.status(200).json({
        success: true,
        data: stockPrice
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `無法獲取 ${symbol} 的價格數據`
      });
    }
  } catch (error) {
    console.error('API錯誤:', error);
    return res.status(500).json({
      success: false,
      error: '服務器內部錯誤'
    });
  }
}

