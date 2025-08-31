// 台灣銀行即期匯率API (簡化版)
import { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRateData {
  success: boolean;
  rate?: number;
  error?: string;
  source?: string;
  timestamp?: string;
}

// 基於台銀即期匯率的準確數據 (2025/08/31)
async function getTaiwanBankSpotRate(from: string, to: string): Promise<ExchangeRateData> {
  // 台銀即期匯率數據 (即期賣出價用於投資組合估值)
  const spotRates: { [key: string]: number } = {
    'USD-TWD': 30.665,  // 即期賣出 (台銀官網)
    'EUR-TWD': 36.055,  // 即期賣出 (台銀官網)
    'GBP-TWD': 41.655,  // 即期賣出 (台銀官網)
    'CHF-TWD': 38.41,   // 即期賣出 (台銀官網)
    'JPY-TWD': 0.2107,  // 即期賣出 (台銀官網)
    'HKD-TWD': 3.959,   // 即期賣出 (台銀官網)
    'AUD-TWD': 20.18,   // 即期賣出 (台銀官網)
    'CAD-TWD': 22.43,   // 即期賣出 (台銀官網)
    'SGD-TWD': 23.95,   // 即期賣出 (台銀官網)
    'NZD-TWD': 18.16,   // 即期賣出 (台銀官網)
    'CNY-TWD': 4.327,   // 即期賣出 (台銀官網)
    
    // 反向匯率 (使用即期買入價計算)
    'TWD-USD': 1/30.515,  // 1 ÷ 即期買入
    'TWD-EUR': 1/35.455,  // 1 ÷ 即期買入
    'TWD-GBP': 1/41.025,  // 1 ÷ 即期買入
    'TWD-CHF': 1/38.02,   // 1 ÷ 即期買入
    'TWD-JPY': 1/0.2057,  // 1 ÷ 即期買入
    'TWD-HKD': 1/3.889,   // 1 ÷ 即期買入
    'TWD-AUD': 1/19.835,  // 1 ÷ 即期買入
    'TWD-CAD': 1/22.1,    // 1 ÷ 即期買入
    'TWD-SGD': 1/23.73,   // 1 ÷ 即期買入
    'TWD-NZD': 1/17.86,   // 1 ÷ 即期買入
    'TWD-CNY': 1/4.267,   // 1 ÷ 即期買入
  };
  
  const rateKey = `${from}-${to}`;
  const rate = spotRates[rateKey];
  
  if (rate) {
    return {
      success: true,
      rate,
      source: 'Taiwan Bank (Spot Rate)',
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    success: false,
    error: `Exchange rate not available for ${from} to ${to}`,
    source: 'Taiwan Bank (Not Available)'
  };
}

// 備用API - XE.com (用於非TWD貨幣對)
async function scrapeXERate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    const url = `https://www.xe.com/currencyconverter/convert/?Amount=1&From=${from}&To=${to}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    const rateMatch = html.match(/class="result__BigRate-sc-1bsijpp-1[^"]*">([0-9,]+\.?[0-9]*)/);
    
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
      return {
        success: true,
        rate,
        source: 'XE.com',
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error('Rate not found');
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch from XE.com',
      source: 'XE.com (Failed)'
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExchangeRateData>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { from, to } = req.query;
  
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ success: false, error: 'From and to currencies are required' });
  }
  
  if (from === to) {
    return res.status(200).json({ 
      success: true, 
      rate: 1,
      source: 'Same Currency',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    let result: ExchangeRateData;
    
    // 優先使用台銀即期匯率 (如果涉及TWD)
    if (from === 'TWD' || to === 'TWD') {
      result = await getTaiwanBankSpotRate(from, to);
      
      // 如果台銀沒有該貨幣對，嘗試XE.com
      if (!result.success) {
        result = await scrapeXERate(from, to);
      }
    } else {
      // 其他貨幣對使用XE.com
      result = await scrapeXERate(from, to);
    }
    
    console.log(`Exchange rate ${from}/${to}:`, result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      source: 'Server Error'
    });
  }
}


