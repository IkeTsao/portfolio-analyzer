import type { NextApiRequest, NextApiResponse } from 'next';

interface FinancialIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  category: 'index' | 'bond' | 'commodity' | 'crypto';
  timestamp: string;
}

interface ApiResponse {
  success: boolean;
  data?: FinancialIndicator[];
  error?: string;
}

// 金融指標配置
const INDICATORS_CONFIG = [
  // 美國指數
  { symbol: 'DX-Y.NYB', name: '美元指數', category: 'index' as const, unit: '' },
  { symbol: '^DJI', name: '道瓊指數', category: 'index' as const, unit: '' },
  { symbol: '^GSPC', name: 'S&P 500', category: 'index' as const, unit: '' },
  
  // 台股指數
  { symbol: '^TWII', name: '台股指數', category: 'index' as const, unit: '' },
  
  // 債券利率
  { symbol: '^TNX', name: '美國10年公債', category: 'bond' as const, unit: '%' },
  { symbol: '^TYX', name: '美國30年公債', category: 'bond' as const, unit: '%' },
  
  // 商品
  { symbol: 'GC=F', name: '黃金', category: 'commodity' as const, unit: '$' },
  
  // 加密貨幣
  { symbol: 'BTC-USD', name: '比特幣', category: 'crypto' as const, unit: '$' },
];

// 備用數據
const FALLBACK_DATA: { [key: string]: number } = {
  'DX-Y.NYB': 104.5,
  '^DJI': 34500,
  '^GSPC': 4400,
  '^TWII': 17000,
  '^TNX': 4.5,
  '^TYX': 4.8,
  'GC=F': 2000,
  'BTC-USD': 45000,
};

async function fetchYahooFinanceData(symbol: string): Promise<any> {
  try {
    // 使用 Yahoo Finance API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000), // 使用 AbortSignal.timeout 替代 timeout 屬性
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response format');
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    
    if (!meta) {
      throw new Error('No meta data available');
    }

    return {
      price: meta.regularMarketPrice || meta.previousClose || 0,
      change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      changePercent: meta.regularMarketChangePercent || 0,
      currency: meta.currency || 'USD',
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

async function fetchAlternativeData(symbol: string): Promise<any> {
  try {
    // 備用 API 或其他數據源
    // 這裡可以添加其他金融數據 API 作為備用
    
    // 暫時返回模擬數據
    const fallbackValue = FALLBACK_DATA[symbol] || 0;
    return {
      price: fallbackValue,
      change: 0,
      changePercent: 0,
      currency: 'USD',
    };
  } catch (error) {
    console.error(`Error fetching alternative data for ${symbol}:`, error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { symbols } = req.query;
    
    // 如果沒有指定 symbols，返回所有指標
    const targetSymbols = symbols 
      ? (Array.isArray(symbols) ? symbols : [symbols])
      : INDICATORS_CONFIG.map(config => config.symbol);

    const results: FinancialIndicator[] = [];

    // 並行獲取所有指標數據
    const fetchPromises = targetSymbols.map(async (symbol) => {
      const config = INDICATORS_CONFIG.find(c => c.symbol === symbol);
      if (!config) {
        console.warn(`Unknown symbol: ${symbol}`);
        return null;
      }

      try {
        // 首先嘗試 Yahoo Finance
        const data = await fetchYahooFinanceData(symbol);
        
        return {
          symbol: config.symbol,
          name: config.name,
          value: data.price,
          change: data.change,
          changePercent: data.changePercent,
          unit: config.unit,
          category: config.category,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Primary fetch failed for ${symbol}, trying alternative:`, error);
        
        try {
          // 嘗試備用數據源
          const data = await fetchAlternativeData(symbol);
          
          return {
            symbol: config.symbol,
            name: config.name,
            value: data.price,
            change: data.change,
            changePercent: data.changePercent,
            unit: config.unit,
            category: config.category,
            timestamp: new Date().toISOString(),
          };
        } catch (fallbackError) {
          console.error(`All fetch methods failed for ${symbol}:`, fallbackError);
          
          // 返回備用靜態數據
          return {
            symbol: config.symbol,
            name: config.name,
            value: FALLBACK_DATA[symbol] || 0,
            change: 0,
            changePercent: 0,
            unit: config.unit,
            category: config.category,
            timestamp: new Date().toISOString(),
          };
        }
      }
    });

    const fetchResults = await Promise.all(fetchPromises);
    
    // 過濾掉 null 結果
    fetchResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });

    // 設置緩存標頭（5分鐘）
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Financial indicators API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// 添加超時處理
export const config = {
  api: {
    responseLimit: false,
    externalResolver: true,
  },
};

