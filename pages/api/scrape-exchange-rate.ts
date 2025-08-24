// 匯率爬蟲API
import { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRateData {
  success: boolean;
  rate?: number;
  error?: string;
}

// 爬蟲XE.com獲取匯率
async function scrapeXERate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    const url = `https://www.xe.com/currencyconverter/convert/?Amount=1&From=${from}&To=${to}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 提取匯率資訊
    const rateMatch = html.match(/class="result__BigRate-sc-1bsijpp-1[^"]*">([0-9,]+\.?[0-9]*)/);
    
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
      return {
        success: true,
        rate,
      };
    }
    
    throw new Error('Exchange rate not found');
  } catch (error) {
    console.error('Error scraping XE rate:', error);
    return {
      success: false,
      error: 'Failed to fetch exchange rate from XE'
    };
  }
}

// 爬蟲台灣銀行匯率
async function scrapeBankOfTaiwanRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    // 台灣銀行只提供對台幣的匯率
    if (to !== 'TWD' && from !== 'TWD') {
      throw new Error('Bank of Taiwan only provides TWD rates');
    }
    
    const url = 'https://rate.bot.com.tw/xrt?Lang=zh-TW';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 貨幣代碼映射
    const currencyMap: { [key: string]: string } = {
      'USD': '美金',
      'EUR': '歐元',
      'GBP': '英鎊',
      'CHF': '瑞士法郎',
      'JPY': '日圓',
    };
    
    const targetCurrency = from === 'TWD' ? to : from;
    const currencyName = currencyMap[targetCurrency];
    
    if (!currencyName) {
      throw new Error('Currency not supported by Bank of Taiwan');
    }
    
    // 提取匯率（現金賣出價）
    const rateRegex = new RegExp(`${currencyName}[\\s\\S]*?<td[^>]*>([\\d.]+)</td>[\\s\\S]*?<td[^>]*>([\\d.]+)</td>`);
    const rateMatch = html.match(rateRegex);
    
    if (rateMatch) {
      // 使用現金賣出價（第二個匹配）
      let rate = parseFloat(rateMatch[2]);
      
      // 如果是從TWD轉換到其他貨幣，需要取倒數
      if (from === 'TWD') {
        rate = 1 / rate;
      }
      
      return {
        success: true,
        rate,
      };
    }
    
    throw new Error('Rate not found in Bank of Taiwan data');
  } catch (error) {
    console.error('Error scraping Bank of Taiwan rate:', error);
    return {
      success: false,
      error: 'Failed to fetch rate from Bank of Taiwan'
    };
  }
}

// 使用免費API作為備用
async function getFallbackRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    
    if (data.rates && data.rates[to]) {
      return {
        success: true,
        rate: data.rates[to],
      };
    }
    
    throw new Error('Rate not found in fallback API');
  } catch (error) {
    console.error('Error with fallback API:', error);
    
    // 最後的備用方案：使用固定匯率
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
    const rate = mockRates[rateKey];
    
    if (rate) {
      return {
        success: true,
        rate,
      };
    }
    
    return {
      success: false,
      error: 'No fallback rate available'
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
    return res.status(200).json({ success: true, rate: 1 });
  }
  
  try {
    let result: ExchangeRateData;
    
    // 優先使用台灣銀行匯率（如果涉及TWD）
    if (from === 'TWD' || to === 'TWD') {
      result = await scrapeBankOfTaiwanRate(from, to);
      
      // 如果台灣銀行失敗，嘗試XE.com
      if (!result.success) {
        result = await scrapeXERate(from, to);
      }
    } else {
      // 其他貨幣對使用XE.com
      result = await scrapeXERate(from, to);
    }
    
    // 如果都失敗，使用備用API
    if (!result.success) {
      result = await getFallbackRate(from, to);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

