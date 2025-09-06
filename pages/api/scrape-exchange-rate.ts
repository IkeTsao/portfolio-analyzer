// 即時匯率API - 使用多個可靠數據源
import { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRateData {
  success: boolean;
  rate?: number;
  error?: string;
  source?: string;
  timestamp?: string;
}

// 1. ExchangeRate-API (免費，可靠)
async function getExchangeRateAPI(from: string, to: string): Promise<ExchangeRateData> {
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
    const response = await fetch(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Portfolio-Analyzer/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.rates[to];
    
    if (rate) {
      return {
        success: true,
        rate: parseFloat(rate),
        source: 'ExchangeRate-API',
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error(`Rate not found for ${to}`);
  } catch (error) {
    return {
      success: false,
      error: `ExchangeRate-API failed: ${error}`,
      source: 'ExchangeRate-API (Failed)'
    };
  }
}

// 2. Fixer.io 備用 (需要API key，但有免費額度)
async function getFixerIO(from: string, to: string): Promise<ExchangeRateData> {
  try {
    // 使用免費的 fixer.io API (有限制但可用)
    const url = `https://api.fixer.io/latest?base=${from}&symbols=${to}`;
    const response = await fetch(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Portfolio-Analyzer/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.rates[to];
    
    if (rate) {
      return {
        success: true,
        rate: parseFloat(rate),
        source: 'Fixer.io',
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error(`Rate not found for ${to}`);
  } catch (error) {
    return {
      success: false,
      error: `Fixer.io failed: ${error}`,
      source: 'Fixer.io (Failed)'
    };
  }
}

// 3. 台灣銀行即時匯率爬蟲 (作為TWD的主要來源)
async function getTaiwanBankRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    // 台灣銀行牌告匯率頁面
    const url = 'https://rate.bot.com.tw/xrt?Lang=zh-TW';
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 解析台銀匯率表格
    const currencyMap: { [key: string]: string } = {
      'USD': 'USD',
      'EUR': 'EUR', 
      'GBP': 'GBP',
      'CHF': 'CHF',
      'JPY': 'JPY',
      'HKD': 'HKD',
      'AUD': 'AUD',
      'CAD': 'CAD',
      'SGD': 'SGD'
    };
    
    if (from === 'TWD' || to === 'TWD') {
      const targetCurrency = from === 'TWD' ? to : from;
      const currencyCode = currencyMap[targetCurrency];
      
      if (currencyCode) {
        // 尋找該貨幣的即期賣出匯率
        const rateRegex = new RegExp(`${currencyCode}[\\s\\S]*?<td[^>]*>([\\d,]+\\.\\d+)</td>[\\s\\S]*?<td[^>]*>([\\d,]+\\.\\d+)</td>`, 'i');
        const match = html.match(rateRegex);
        
        if (match) {
          // match[1] 是即期買入, match[2] 是即期賣出
          const sellRate = parseFloat(match[2].replace(/,/g, ''));
          const buyRate = parseFloat(match[1].replace(/,/g, ''));
          
          let rate: number;
          if (from === 'TWD') {
            // TWD 轉外幣，使用買入價的倒數
            rate = 1 / buyRate;
          } else {
            // 外幣轉 TWD，使用賣出價
            rate = sellRate;
          }
          
          return {
            success: true,
            rate,
            source: 'Taiwan Bank (Live)',
            timestamp: new Date().toISOString()
          };
        }
      }
    }
    
    throw new Error('Rate not found in Taiwan Bank data');
  } catch (error) {
    return {
      success: false,
      error: `Taiwan Bank failed: ${error}`,
      source: 'Taiwan Bank (Failed)'
    };
  }
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
    
    // 策略：使用多個數據源，按優先級嘗試
    if (from === 'TWD' || to === 'TWD') {
      // 涉及 TWD 的匯率，優先使用台灣銀行
      console.log(`嘗試台灣銀行即時匯率: ${from}/${to}`);
      result = await getTaiwanBankRate(from, to);
      
      if (!result.success) {
        console.log(`台灣銀行失敗，嘗試 ExchangeRate-API: ${from}/${to}`);
        result = await getExchangeRateAPI(from, to);
      }
      
      if (!result.success) {
        console.log(`ExchangeRate-API 失敗，嘗試 Fixer.io: ${from}/${to}`);
        result = await getFixerIO(from, to);
      }
    } else {
      // 其他貨幣對，優先使用 ExchangeRate-API
      console.log(`嘗試 ExchangeRate-API: ${from}/${to}`);
      result = await getExchangeRateAPI(from, to);
      
      if (!result.success) {
        console.log(`ExchangeRate-API 失敗，嘗試 Fixer.io: ${from}/${to}`);
        result = await getFixerIO(from, to);
      }
    }
    
    if (result.success) {
      console.log(`✅ 匯率獲取成功: ${from}/${to} = ${result.rate} (來源: ${result.source})`);
    } else {
      console.log(`❌ 所有匯率源都失敗: ${from}/${to}`);
    }
    
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


