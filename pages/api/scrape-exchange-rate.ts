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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Portfolio-Analyzer/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Portfolio-Analyzer/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
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

// 3. 台灣銀行即時匯率爬蟲 (DOM解析器版本)
async function getTaiwanBankRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    console.log(`🏦 台灣銀行DOM解析: ${from}/${to}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://rate.bot.com.tw/xrt?Lang=zh-TW', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Portfolio-Analyzer/2.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 貨幣代碼映射和預期匯率範圍
    const currencyConfig: { [key: string]: { code: string, range: { min: number, max: number } } } = {
      'USD': { code: 'USD', range: { min: 25, max: 35 } },
      'EUR': { code: 'EUR', range: { min: 30, max: 40 } },
      'GBP': { code: 'GBP', range: { min: 35, max: 45 } },
      'JPY': { code: 'JPY', range: { min: 0.15, max: 0.25 } },
      'CHF': { code: 'CHF', range: { min: 35, max: 45 } },
      'AUD': { code: 'AUD', range: { min: 18, max: 25 } },
      'CAD': { code: 'CAD', range: { min: 20, max: 25 } },
      'SGD': { code: 'SGD', range: { min: 22, max: 26 } },
      'HKD': { code: 'HKD', range: { min: 3, max: 5 } },
      'CNY': { code: 'CNY', range: { min: 4, max: 5 } }
    };
    
    const targetCurrency = from === 'TWD' ? to : from;
    const config = currencyConfig[targetCurrency];
    
    if (!config) {
      throw new Error(`不支援的貨幣: ${targetCurrency}`);
    }
    
    console.log(`🔍 開始解析 ${config.code} 匯率數據`);
    
    // DOM解析器：結構化提取表格數據
    const parseExchangeRates = (html: string, currencyCode: string, expectedRange: { min: number, max: number }) => {
      console.log(`📊 解析 ${currencyCode}，預期範圍: ${expectedRange.min}-${expectedRange.max}`);
      
      // 方法1: 尋找包含貨幣代碼的表格行
      const findCurrencyRow = () => {
        const lines = html.split('\n');
        let rowStart = -1;
        let rowEnd = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // 找到包含貨幣代碼的行（可能不在<tr>標籤的同一行）
          if (line.includes(currencyCode) && !line.includes('查詢')) {
            // 向上尋找最近的<tr>標籤
            for (let j = i; j >= 0; j--) {
              if (lines[j].includes('<tr')) {
                rowStart = j;
                console.log(`📍 在第 ${j} 行找到 ${currencyCode} 的表格行開始 (貨幣在第 ${i} 行)`);
                break;
              }
            }
            
            // 向下尋找</tr>標籤
            if (rowStart !== -1) {
              for (let k = i; k < lines.length; k++) {
                if (lines[k].includes('</tr>')) {
                  rowEnd = k;
                  console.log(`📍 在第 ${k} 行找到表格行結束`);
                  break;
                }
              }
            }
            
            break;
          }
        }
        
        if (rowStart !== -1 && rowEnd !== -1) {
          const rowLines = lines.slice(rowStart, rowEnd + 1);
          return rowLines.join('\n');
        }
        
        return null;
      };
      
      const rowHtml = findCurrencyRow();
      
      if (!rowHtml) {
        console.log(`❌ 未找到 ${currencyCode} 的表格行`);
        return null;
      }
      
      console.log(`✅ 找到 ${currencyCode} 表格行，長度: ${rowHtml.length}`);
      
      // 方法2: 提取表格單元格中的數字
      const extractNumbers = (html: string) => {
        // 匹配 <td>數字</td> 格式
        const tdRegex = /<td[^>]*>([\d,]+\.?\d*)<\/td>/g;
        const numbers: number[] = [];
        let match;
        
        while ((match = tdRegex.exec(html)) !== null) {
          const numStr = match[1].replace(/,/g, '');
          const num = parseFloat(numStr);
          
          if (!isNaN(num) && num > 0) {
            numbers.push(num);
          }
        }
        
        return numbers;
      };
      
      const numbers = extractNumbers(rowHtml);
      console.log(`🔢 提取到的數字:`, numbers);
      
      // 方法3: 智能識別匯率數據
      const identifyRates = (numbers: number[], range: { min: number, max: number }) => {
        if (numbers.length < 4) {
          console.log(`❌ 數字不足，只有 ${numbers.length} 個`);
          return null;
        }
        
        // 策略1: 優先檢測重複數據結構（台灣銀行常見模式）
        if (numbers.length >= 6) {
          for (let i = 0; i <= numbers.length - 6; i++) {
            const cashBuy = numbers[i];
            const cashSell = numbers[i + 1];
            const dupCashBuy = numbers[i + 2];
            const dupCashSell = numbers[i + 3];
            const spotBuy = numbers[i + 4];
            const spotSell = numbers[i + 5];
            
            // 檢查是否有重複的現金匯率
            if (cashBuy === dupCashBuy && cashSell === dupCashSell) {
              const sellInRange = spotSell >= range.min && spotSell <= range.max;
              const validPattern = cashBuy < cashSell && spotBuy < spotSell;
              const differentRates = Math.abs(spotSell - cashSell) > 0.001;
              
              if (sellInRange && validPattern && differentRates) {
                console.log(`✅ 找到重複數據結構 [${i}-${i+5}]:`, {
                  現金買入: cashBuy,
                  現金賣出: cashSell,
                  即期買入: spotBuy,
                  即期賣出: spotSell
                });
                
                return { cashBuy, cashSell, spotBuy, spotSell };
              }
            }
          }
        }
        
        // 策略2: 尋找在預期範圍內的賣出匯率（標準模式）
        for (let i = 0; i <= numbers.length - 4; i++) {
          const cashBuy = numbers[i];
          const cashSell = numbers[i + 1];
          const spotBuy = numbers[i + 2];
          const spotSell = numbers[i + 3];
          
          // 檢查賣出匯率是否在預期範圍內
          const sellInRange = (cashSell >= range.min && cashSell <= range.max) || 
                             (spotSell >= range.min && spotSell <= range.max);
          
          // 檢查買入 < 賣出的基本邏輯
          const validPattern = cashBuy < cashSell && spotBuy < spotSell;
          
          // 確保即期匯率與現金匯率不同
          const differentRates = Math.abs(spotBuy - cashBuy) > 0.001 || Math.abs(spotSell - cashSell) > 0.001;
          
          if (sellInRange && validPattern && differentRates) {
            console.log(`✅ 找到標準匯率模式 [${i}-${i+3}]:`, {
              現金買入: cashBuy,
              現金賣出: cashSell,
              即期買入: spotBuy,
              即期賣出: spotSell
            });
            
            return { cashBuy, cashSell, spotBuy, spotSell };
          }
        }
        
        // 策略3: 如果都沒找到，使用範圍內的現金匯率作為備用
        for (let i = 0; i <= numbers.length - 4; i++) {
          const cashBuy = numbers[i];
          const cashSell = numbers[i + 1];
          const spotBuy = numbers[i + 2];
          const spotSell = numbers[i + 3];
          
          const sellInRange = cashSell >= range.min && cashSell <= range.max;
          const validPattern = cashBuy < cashSell && spotBuy < spotSell;
          
          if (sellInRange && validPattern) {
            console.log(`⚠️ 使用現金匯率作為備用 [${i}-${i+3}]:`, {
              現金買入: cashBuy,
              現金賣出: cashSell,
              即期買入: spotBuy,
              即期賣出: spotSell
            });
            
            return { cashBuy, cashSell, spotBuy, spotSell };
          }
        }
        
        console.log(`❌ 無法識別 ${currencyCode} 的匯率模式`);
        return null;
      };
      
      return identifyRates(numbers, expectedRange);
    };
    
    const rateData = parseExchangeRates(html, config.code, config.range);
    
    if (rateData) {
      const { cashBuy, cashSell, spotBuy, spotSell } = rateData;
      
      // 優先使用即期匯率
      const useSpotRate = Math.abs(spotBuy - cashBuy) > 0.001 || Math.abs(spotSell - cashSell) > 0.001;
      
      let rate: number;
      let rateType: string;
      
      if (from === 'TWD') {
        // TWD 轉外幣，使用買入價的倒數
        if (useSpotRate) {
          rate = 1 / spotBuy;
          rateType = '即期買入';
        } else {
          rate = 1 / cashBuy;
          rateType = '現金買入';
        }
        console.log(`💱 TWD→${config.code}: 使用${rateType}價 ${useSpotRate ? spotBuy : cashBuy} 的倒數 = ${rate}`);
      } else {
        // 外幣轉 TWD，使用賣出價
        if (useSpotRate) {
          rate = spotSell;
          rateType = '即期賣出';
        } else {
          rate = cashSell;
          rateType = '現金賣出';
        }
        console.log(`💱 ${config.code}→TWD: 使用${rateType}價 ${rate}`);
      }
      
      return {
        success: true,
        rate: rate,
        source: `Taiwan Bank (${useSpotRate ? 'Spot Rate' : 'Cash Rate'})`,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error(`無法解析 ${config.code} 匯率數據`);
    
  } catch (error) {
    console.log(`❌ 台灣銀行解析失敗: ${error}`);
    return {
      success: false,
      error: `Taiwan Bank DOM parsing failed: ${error}`,
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


