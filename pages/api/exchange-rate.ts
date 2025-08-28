import { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated: string;
}

interface ApiResponse {
  success: boolean;
  data?: ExchangeRate[];
  error?: string;
}

// 支持的貨幣對
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'];

async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const rates: ExchangeRate[] = [];
  
  try {
    // 使用免費的匯率API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`API響應失敗: ${response.status}`);
    }

    const data = await response.json();
    
    if (data?.rates) {
      const lastUpdated = new Date().toISOString();
      
      for (const currency of SUPPORTED_CURRENCIES) {
        if (data.rates[currency]) {
          // 轉換為 1 外幣 = X 台幣
          const rate = 1 / data.rates[currency];
          rates.push({
            currency,
            rate: Math.round(rate * 100) / 100, // 保留兩位小數
            lastUpdated,
          });
        }
      }
    }
  } catch (error) {
    console.error('獲取匯率失敗:', error);
    
    // 如果API失敗，返回預設匯率
    const fallbackRates = {
      USD: 31.50,
      EUR: 34.20,
      GBP: 39.80,
      CHF: 35.10,
    };
    
    const lastUpdated = new Date().toISOString();
    
    for (const [currency, rate] of Object.entries(fallbackRates)) {
      rates.push({
        currency,
        rate,
        lastUpdated,
      });
    }
  }
  
  return rates;
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

  try {
    console.log('API請求: 獲取匯率數據');
    
    const exchangeRates = await fetchExchangeRates();
    
    return res.status(200).json({
      success: true,
      data: exchangeRates
    });
  } catch (error) {
    console.error('匯率API錯誤:', error);
    return res.status(500).json({
      success: false,
      error: '服務器內部錯誤'
    });
  }
}

