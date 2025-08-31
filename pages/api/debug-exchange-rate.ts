// 調試版台銀即期匯率API
import { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRateData {
  success: boolean;
  rate?: number;
  error?: string;
  source?: string;
  timestamp?: string;
  debug?: any; // 添加調試信息
}

// 調試版台銀即期匯率爬蟲
async function debugScrapeBankOfTaiwanSpotRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    const url = 'https://rate.bot.com.tw/xrt?Lang=zh-TW';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    const html = await response.text();
    
    // 貨幣代碼映射
    const currencyMap: { [key: string]: string } = {
      'USD': '美金',
      'EUR': '歐元', 
      'GBP': '英鎊',
      'CHF': '瑞士法郎'
    };
    
    const targetCurrency = from === 'TWD' ? to : from;
    const currencyName = currencyMap[targetCurrency];
    
    if (!currencyName) {
      throw new Error(`Currency ${targetCurrency} not supported`);
    }
    
    // 調試：找到包含貨幣的行
    const lines = html.split('\n');
    let currencyLineIndex = -1;
    let currencyLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(currencyName)) {
        currencyLineIndex = i;
        currencyLine = lines[i];
        break;
      }
    }
    
    if (currencyLineIndex === -1) {
      return {
        success: false,
        error: `Currency ${currencyName} not found in HTML`,
        debug: {
          searchedFor: currencyName,
          htmlLength: html.length
        }
      };
    }
    
    // 調試：提取該行及後續行的所有數字
    const relevantLines = lines.slice(currencyLineIndex, currencyLineIndex + 5);
    const allNumbers: number[] = [];
    const numberSources: string[] = [];
    
    relevantLines.forEach((line, index) => {
      const numberMatches = line.match(/(\d+\.?\d*)/g);
      if (numberMatches) {
        numberMatches.forEach(numStr => {
          const num = parseFloat(numStr);
          if (num > 0 && num < 1000) { // 合理的匯率範圍
            allNumbers.push(num);
            numberSources.push(`Line ${currencyLineIndex + index}: ${line.trim()}`);
          }
        });
      }
    });
    
    // 調試：分析表格結構
    // 根據台銀網站，表格順序應該是：
    // 幣別 | 現金買入 | 現金賣出 | 即期買入 | 即期賣出 | ...
    
    let debugInfo = {
      currencyName,
      currencyLineIndex,
      currencyLine: currencyLine.trim(),
      allNumbers,
      numberSources,
      relevantLines: relevantLines.map(line => line.trim())
    };
    
    if (allNumbers.length >= 4) {
      // 假設前4個數字分別是：現金買入、現金賣出、即期買入、即期賣出
      const cashBuy = allNumbers[0];
      const cashSell = allNumbers[1];
      const spotBuy = allNumbers[2];
      const spotSell = allNumbers[3];
      
      debugInfo = {
        ...debugInfo,
        interpretation: {
          cashBuy,
          cashSell,
          spotBuy,
          spotSell
        }
      };
      
      // 使用即期賣出價
      let rate = spotSell;
      
      if (from === 'TWD') {
        rate = 1 / spotBuy;
      }
      
      return {
        success: true,
        rate,
        source: 'Bank of Taiwan (Spot Rate - Debug)',
        timestamp: new Date().toISOString(),
        debug: debugInfo
      };
    }
    
    return {
      success: false,
      error: 'Not enough numbers found',
      debug: debugInfo
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Debug API error: ${error.message}`,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
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
      source: 'Same Currency'
    });
  }
  
  const result = await debugScrapeBankOfTaiwanSpotRate(from, to);
  res.status(200).json(result);
}

