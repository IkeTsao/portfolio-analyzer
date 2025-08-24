// 股票價格爬蟲API
import { NextApiRequest, NextApiResponse } from 'next';

interface StockData {
  success: boolean;
  price?: number;
  change?: number;
  changePercent?: number;
  error?: string;
}

// 爬蟲Yahoo Finance獲取美股價格
async function scrapeUSStock(symbol: string): Promise<StockData> {
  try {
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 使用正則表達式提取價格資訊
    const priceMatch = html.match(/"regularMarketPrice":\{"raw":([\d.]+)/);
    const changeMatch = html.match(/"regularMarketChange":\{"raw":([-\d.]+)/);
    const changePercentMatch = html.match(/"regularMarketChangePercent":\{"raw":([-\d.]+)/);
    
    if (priceMatch) {
      return {
        success: true,
        price: parseFloat(priceMatch[1]),
        change: changeMatch ? parseFloat(changeMatch[1]) : 0,
        changePercent: changePercentMatch ? parseFloat(changePercentMatch[1]) / 100 : 0,
      };
    }
    
    throw new Error('Price data not found');
  } catch (error) {
    console.error('Error scraping US stock:', error);
    return {
      success: false,
      error: 'Failed to fetch US stock price'
    };
  }
}

// 爬蟲台股價格
async function scrapeTWStock(symbol: string): Promise<StockData> {
  try {
    // 台股代碼格式處理
    const twSymbol = symbol.includes('.TW') ? symbol : `${symbol}.TW`;
    
    // 先嘗試Yahoo Finance台股
    const url = `https://tw.finance.yahoo.com/quote/${twSymbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 提取台股價格資訊
    const priceMatch = html.match(/成交<\/span><span[^>]*>([\d,]+\.?\d*)<\/span>/);
    const changeMatch = html.match(/漲跌<\/span><span[^>]*class="[^"]*"[^>]*>([-+]?[\d,]+\.?\d*)<\/span>/);
    
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      const change = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
      const changePercent = price > 0 ? (change / (price - change)) : 0;
      
      return {
        success: true,
        price,
        change,
        changePercent,
      };
    }
    
    throw new Error('TW stock price data not found');
  } catch (error) {
    console.error('Error scraping TW stock:', error);
    return {
      success: false,
      error: 'Failed to fetch TW stock price'
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<StockData>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { symbol, market } = req.query;
  
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ success: false, error: 'Symbol is required' });
  }
  
  try {
    let result: StockData;
    
    if (market === 'TW') {
      result = await scrapeTWStock(symbol);
    } else {
      result = await scrapeUSStock(symbol);
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

