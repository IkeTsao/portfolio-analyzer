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

// 3. 台灣銀行即時匯率爬蟲 (作為TWD的主要來源)
async function getTaiwanBankRate(from: string, to: string): Promise<ExchangeRateData> {
  try {
    // 台灣銀行牌告匯率頁面
    const url = 'https://rate.bot.com.tw/xrt?Lang=zh-TW';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
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
        // 修正匯率匹配邏輯：確保獲取即期匯率而非現金匯率
        // 策略：使用更精確的HTML解析方法
        
        // 首先找到包含該貨幣的行，使用更精確的匹配
        // 確保匹配到完整的<tr>...</tr>標籤，並且包含該貨幣代碼
        const currencyRowRegex = new RegExp(`<tr[^>]*>[\\s\\S]*?${currencyCode}[\\s\\S]*?</tr>`, 'i');
        const rowMatch = html.match(currencyRowRegex);
        
        if (rowMatch) {
          const rowHtml = rowMatch[0];
          console.log(`找到 ${currencyCode} 的行HTML片段 (長度: ${rowHtml.length})`);
          
          // 檢查是否真的只匹配到一行，如果包含其他貨幣代碼則說明匹配過多
          const otherCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SGD', 'HKD', 'CNY'];
          const otherCurrencyCount = otherCurrencies.filter(code => 
            code !== currencyCode && rowHtml.includes(code)
          ).length;
          
          if (otherCurrencyCount > 0) {
            console.log(`⚠️ ${currencyCode} 行匹配包含其他 ${otherCurrencyCount} 個貨幣，使用更精確的策略`);
            
            // 使用更精確的策略：找到包含該貨幣的tr標籤，確保不跨行
            const lines = html.split('\n');
            let targetRowHtml = '';
            let inTargetRow = false;
            
            console.log(`開始逐行搜索 ${currencyCode}，總共 ${lines.length} 行`);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('<tr') && line.includes(currencyCode)) {
                console.log(`在第 ${i} 行找到包含 ${currencyCode} 的tr標籤`);
                inTargetRow = true;
                targetRowHtml = line;
              } else if (inTargetRow && line.includes('</tr>')) {
                targetRowHtml += line;
                console.log(`在第 ${i} 行找到結束標籤，完成行匹配`);
                break;
              } else if (inTargetRow) {
                targetRowHtml += line;
              }
            }
            
            console.log(`精確匹配結果: targetRowHtml長度=${targetRowHtml.length}`);
            
            if (targetRowHtml) {
              console.log(`使用精確行匹配找到 ${currencyCode} (長度: ${targetRowHtml.length})`);
              
              // 提取該行中的數字
              const numberRegex = /<td[^>]*>([\d,]+\.[\d]+)<\/td>/g;
              const numbers = [];
              let match;
              
              while ((match = numberRegex.exec(targetRowHtml)) !== null) {
                numbers.push(parseFloat(match[1].replace(/,/g, '')));
              }
              
              console.log(`${currencyCode} 精確行提取到的數字:`, numbers);
              
              if (numbers.length >= 4) {
                let cashBuy, cashSell, spotBuy, spotSell;
                
                if (numbers.length >= 6 && numbers[0] === numbers[2] && numbers[1] === numbers[3]) {
                  // 檢測到重複數據結構
                  cashBuy = numbers[0];      
                  cashSell = numbers[1];     
                  spotBuy = numbers[4];      
                  spotSell = numbers[5];     
                  console.log(`${currencyCode} 精確匹配檢測到重複數據結構，使用位置[4,5]作為即期匯率`);
                } else {
                  // 標準結構
                  cashBuy = numbers[0];      
                  cashSell = numbers[1];     
                  spotBuy = numbers[2];      
                  spotSell = numbers[3];     
                  console.log(`${currencyCode} 精確匹配使用標準數據結構`);
                }
                
                console.log(`${currencyCode} 精確匯率解析:`, {
                  現金買入: cashBuy,
                  現金賣出: cashSell,
                  即期買入: spotBuy,
                  即期賣出: spotSell
                });
                
                // 驗證數據合理性
                if (spotBuy !== cashBuy || spotSell !== cashSell) {
                  console.log(`✓ ${currencyCode} 精確匹配成功區分現金匯率和即期匯率`);
                  
                  let rate: number;
                  if (from === 'TWD') {
                    rate = 1 / spotBuy;
                    console.log(`TWD→${currencyCode}: 使用即期買入價 ${spotBuy} 的倒數 = ${rate}`);
                  } else {
                    rate = spotSell;
                    console.log(`${currencyCode}→TWD: 使用即期賣出價 ${spotSell}`);
                  }
                  
                  return {
                    success: true,
                    rate: rate,
                    source: 'Taiwan Bank (Live)',
                    timestamp: new Date().toISOString()
                  };
                } else {
                  console.log(`⚠ ${currencyCode} 精確匹配：即期匯率與現金匯率相同，使用現金匯率`);
                  let rate: number;
                  if (from === 'TWD') {
                    rate = 1 / cashBuy;
                  } else {
                    rate = cashSell;
                  }
                  
                  return {
                    success: true,
                    rate: rate,
                    source: 'Taiwan Bank (Live)',
                    timestamp: new Date().toISOString()
                  };
                }
              } else {
                console.log(`${currencyCode} 精確匹配提取到的數字不足，只有 ${numbers.length} 個`);
              }
            } else {
              console.log(`${currencyCode} 精確匹配失敗，未找到目標行`);
            }
          } else {
            // 原始邏輯：如果行匹配正確，繼續使用原來的方法
            console.log(`✓ ${currencyCode} 行匹配正確，只包含該貨幣數據`);
          }
          
          // 提取該行中所有的數字欄位，確保只從該行提取
          const numberRegex = /<td[^>]*>([\d,]+\.[\d]+)<\/td>/g;
          const numbers = [];
          let match;
          
          while ((match = numberRegex.exec(rowHtml)) !== null) {
            numbers.push(parseFloat(match[1].replace(/,/g, '')));
          }
          
          console.log(`${currencyCode} 該行提取到的數字:`, numbers);
          
          // 根據台灣銀行表格結構，該行的數字順序應該是：
          // [0] 現金買入, [1] 現金賣出, [2] 即期買入, [3] 即期賣出, [4] 可能的遠期匯率...
          // 但實際觀察發現可能有重複：[0]現金買入, [1]現金賣出, [2]重複現金買入, [3]重複現金賣出, [4]即期買入, [5]即期賣出
          if (numbers.length >= 4) {
            let cashBuy, cashSell, spotBuy, spotSell;
            
            if (numbers.length >= 6 && numbers[0] === numbers[2] && numbers[1] === numbers[3]) {
              // 檢測到重複數據結構，使用後面的數字作為即期匯率
              cashBuy = numbers[0];      // 現金買入
              cashSell = numbers[1];     // 現金賣出  
              spotBuy = numbers[4];      // 即期買入 (跳過重複)
              spotSell = numbers[5];     // 即期賣出
              console.log(`${currencyCode} 檢測到重複數據結構，使用位置[4,5]作為即期匯率`);
            } else {
              // 標準結構
              cashBuy = numbers[0];      // 現金買入
              cashSell = numbers[1];     // 現金賣出  
              spotBuy = numbers[2];      // 即期買入
              spotSell = numbers[3];     // 即期賣出
              console.log(`${currencyCode} 使用標準數據結構`);
            }
            
            console.log(`${currencyCode} 匯率解析:`, {
              現金買入: cashBuy,
              現金賣出: cashSell,
              即期買入: spotBuy,
              即期賣出: spotSell
            });
            
            // 驗證數據合理性：即期匯率應該與現金匯率不同
            if (spotBuy !== cashBuy || spotSell !== cashSell) {
              console.log(`✓ ${currencyCode} 成功區分現金匯率和即期匯率`);
              
              let rate: number;
              if (from === 'TWD') {
                // TWD 轉外幣，使用即期買入價的倒數
                rate = 1 / spotBuy;
                console.log(`TWD→${currencyCode}: 使用即期買入價 ${spotBuy} 的倒數 = ${rate}`);
              } else {
                // 外幣轉 TWD，使用即期賣出價
                rate = spotSell;
                console.log(`${currencyCode}→TWD: 使用即期賣出價 ${spotSell}`);
              }
              
              return {
                success: true,
                rate: rate,
                source: 'Taiwan Bank (Live)',
                timestamp: new Date().toISOString()
              };
            } else {
              console.log(`⚠ ${currencyCode} 即期匯率與現金匯率相同，可能該貨幣只有現金匯率`);
              // 對於只有現金匯率的貨幣，使用現金匯率
              let rate: number;
              if (from === 'TWD') {
                rate = 1 / cashBuy;
                console.log(`TWD→${currencyCode}: 使用現金買入價 ${cashBuy} 的倒數 = ${rate}`);
              } else {
                rate = cashSell;
                console.log(`${currencyCode}→TWD: 使用現金賣出價 ${cashSell}`);
              }
              
              return {
                success: true,
                rate: rate,
                source: 'Taiwan Bank (Live)',
                timestamp: new Date().toISOString()
              };
            }
          } else {
            console.log(`${currencyCode} 提取到的數字不足，只有 ${numbers.length} 個`);
          }
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


