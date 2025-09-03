import { Holding } from '@/types/portfolio';
import { addMultipleHoldings, clearAllHoldings } from '@/utils/portfolioStorage';
import { notifications } from '@mantine/notifications';

// CSV 欄位定義
const CSV_HEADERS = [
  'id',
  'accountId', 
  'symbol',
  'name',
  'type',
  'market',
  'quantity',
  'costBasis',
  'currency',
  'purchaseDate',
  'currentPrice',
  'lastUpdated'
];

// 帳戶 ID 映射
const ACCOUNT_ID_MAP: { [key: string]: string } = {
  'Etrade': 'etrade',
  'etrade': 'etrade',
  '富邦銀行': 'fubon',
  '富邦': 'fubon',
  'fubon': 'fubon',
  '玉山銀行': 'esun',
  '玉山': 'esun',
  'esun': 'esun'
};

// 投資類型映射
const TYPE_MAP: { [key: string]: string } = {
  '股票': 'stock',
  'stock': 'stock',
  '基金': 'fund',
  '共同基金': 'fund',
  'fund': 'fund',
  '債券': 'bond',
  'bond': 'bond',
  '黃金': 'gold',
  'gold': 'gold',
  '加密貨幣': 'crypto',
  '數位貨幣': 'crypto',
  'crypto': 'crypto',
  '現金': 'cash',
  'cash': 'cash'
};

// 市場映射
const MARKET_MAP: { [key: string]: string } = {
  '美國': 'US',
  '美國市場': 'US',
  'US': 'US',
  '台灣': 'TW',
  '台灣市場': 'TW',
  'TW': 'TW',
  '其他': 'OTHER',
  '其他市場': 'OTHER',
  'OTHER': 'OTHER'
};

/**
 * 將持倉數據導出為 CSV 格式（包含匯率資料）
 */
export function exportHoldingsToCSV(holdings: Holding[], exchangeRates?: any): string {
  // CSV 標題行
  const headers = [
    'ID',
    '帳戶',
    '代碼',
    '名稱', 
    '類型',
    '市場',
    '數量',
    '成本價',
    '貨幣',
    '購買日期',
    '現價',
    '更新時間'
  ];

  // 如果有匯率資料，新增匯率欄位
  if (exchangeRates) {
    headers.push('USD匯率', 'EUR匯率', 'GBP匯率', 'CHF匯率', 'JPY匯率', '匯率時間'); // 日圓排最後
  }

  // 數據行
  const rows = holdings.map(holding => {
    const row = [
      holding.id,
      getAccountDisplayName(holding.accountId),
      holding.symbol,
      holding.name,
      getTypeDisplayName(holding.type),
      getMarketDisplayName(holding.market),
      holding.quantity.toString(),
      holding.costBasis.toString(),
      holding.currency,
      holding.purchaseDate,
      holding.currentPrice?.toString() || '',
      holding.lastUpdated || ''
    ];

    // 如果有匯率資料，新增匯率數據（只在第一行添加）
    if (exchangeRates && holdings.indexOf(holding) === 0) {
      row.push(
        exchangeRates.USD?.toString() || '',
        exchangeRates.EUR?.toString() || '',
        exchangeRates.GBP?.toString() || '',
        exchangeRates.CHF?.toString() || '',
        exchangeRates.JPY?.toString() || '', // 日圓排最後
        exchangeRates.timestamp ? new Date(exchangeRates.timestamp).toISOString() : ''
      );
    } else if (exchangeRates) {
      // 其他行填入空值
      row.push('', '', '', '', '', '');
    }

    return row;
  });

  // 組合 CSV 內容
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * 從 CSV 內容解析持倉數據（支援匯率資料）
 */
export function parseHoldingsFromCSV(csvContent: string): { holdings: Holding[], exchangeRates?: any } {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV 檔案格式錯誤：至少需要標題行和一行數據');
  }

  // 解析標題行
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  // 檢查是否包含匯率欄位
  const hasExchangeRates = headers.includes('USD匯率') || headers.includes('CHF匯率'); // 檢查 CHF 匯率
  let exchangeRates: any = null;
  
  // 解析數據行
  const holdings: Holding[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 跳過空行
    
    try {
      const values = parseCSVLine(line);
      
      if (values.length < 9) {
        console.warn(`第 ${i + 1} 行數據不完整，跳過`);
        continue;
      }

      const holding: Holding = {
        id: values[0] || generateId(),
        accountId: normalizeAccountId(values[1]),
        symbol: values[2]?.toUpperCase() || '',
        name: values[3] || '',
        type: normalizeType(values[4]) as any,
        market: normalizeMarket(values[5]) as any,
        quantity: parseFloat(values[6]) || 0,
        costBasis: parseFloat(values[7]) || 0,
        currency: values[8]?.toUpperCase() || 'USD',
        purchaseDate: values[9] || new Date().toISOString().split('T')[0],
        currentPrice: values[10] ? parseFloat(values[10]) : undefined,
        lastUpdated: values[11] || undefined
      };

      // 驗證必要欄位
      if (!holding.symbol || !holding.name || holding.quantity <= 0 || holding.costBasis <= 0) {
        console.warn(`第 ${i + 1} 行數據無效，跳過:`, holding);
        continue;
      }

      holdings.push(holding);

      // 如果是第一行且包含匯率資料，解析匯率
      if (i === 1 && hasExchangeRates && values.length >= 17) {
        const usdRate = parseFloat(values[12]);
        const eurRate = parseFloat(values[13]);
        const gbpRate = parseFloat(values[14]);
        const chfRate = parseFloat(values[15]);
        const jpyRate = parseFloat(values[16]); // 日圓排最後
        const rateTimestamp = values[17];

        if (!isNaN(usdRate) || !isNaN(eurRate) || !isNaN(gbpRate) || !isNaN(chfRate) || !isNaN(jpyRate)) {
          exchangeRates = {
            USD: !isNaN(usdRate) ? usdRate : undefined,
            EUR: !isNaN(eurRate) ? eurRate : undefined,
            GBP: !isNaN(gbpRate) ? gbpRate : undefined,
            CHF: !isNaN(chfRate) ? chfRate : undefined,
            JPY: !isNaN(jpyRate) ? jpyRate : undefined, // 日圓排最後
            timestamp: rateTimestamp ? new Date(rateTimestamp).getTime() : Date.now(),
          };
        }
      }
    } catch (error) {
      console.error(`解析第 ${i + 1} 行時發生錯誤:`, error);
      continue;
    }
  }

  if (holdings.length === 0) {
    throw new Error('CSV 檔案中沒有有效的持倉數據');
  }

  return { holdings, exchangeRates };
}

/**
 * 解析 CSV 行（處理引號內的逗號）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 標準化帳戶 ID
 */
function normalizeAccountId(accountId: string): string {
  const normalized = ACCOUNT_ID_MAP[accountId.trim()];
  return normalized || 'etrade'; // 預設為 etrade
}

/**
 * 標準化投資類型
 */
function normalizeType(type: string): string {
  const normalized = TYPE_MAP[type.trim()];
  return normalized || 'stock'; // 預設為股票
}

/**
 * 標準化市場
 */
function normalizeMarket(market: string): string {
  const normalized = MARKET_MAP[market.trim()];
  return normalized || 'US'; // 預設為美國市場
}

/**
 * 獲取帳戶顯示名稱
 */
function getAccountDisplayName(accountId: string): string {
  const displayNames: { [key: string]: string } = {
    'etrade': 'Etrade',
    'fubon': '富邦銀行',
    'esun': '玉山銀行'
  };
  return displayNames[accountId] || accountId;
}

/**
 * 獲取類型顯示名稱
 */
function getTypeDisplayName(type: string): string {
  const displayNames: { [key: string]: string } = {
    'stock': '股票',
    'fund': '基金',
    'bond': '債券',
    'gold': '黃金',
    'crypto': '加密貨幣',
    'cash': '現金'
  };
  return displayNames[type] || type;
}

/**
 * 獲取市場顯示名稱
 */
function getMarketDisplayName(market: string): string {
  const displayNames: { [key: string]: string } = {
    'US': '美國',
    'TW': '台灣',
    'OTHER': '其他'
  };
  return displayNames[market] || market;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 下載 CSV 檔案
 */
export function downloadCSV(csvContent: string, filename: string = 'holdings.csv'): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * 導入 CSV 檔案並替換所有持倉
 */
export async function importHoldingsFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const result = parseHoldingsFromCSV(csvContent);
        const holdings = result.holdings;
        const exchangeRates = result.exchangeRates;
        
        if (holdings.length === 0) {
          throw new Error('CSV 檔案中沒有有效的持倉數據');
        }

        // 清空現有持倉
        clearAllHoldings();
        
        // 保存新的持倉數據
        addMultipleHoldings(holdings);

        // 如果有匯率資料，可以在這裡處理（例如保存到歷史匯率）
        if (exchangeRates) {
          console.log('導入的匯率資料:', exchangeRates);
        }

        notifications.show({
          title: '導入成功',
          message: `已成功導入 ${holdings.length} 筆持倉數據${exchangeRates ? '（包含匯率資料）' : ''}`,
          color: 'green',
        });

        resolve();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        notifications.show({
          title: '導入失敗',
          message: errorMessage,
          color: 'red',
        });
        reject(error);
      }
    };

    reader.onerror = () => {
      notifications.show({
        title: '讀取失敗',
        message: '無法讀取檔案內容',
        color: 'red',
      });
      reject(new Error('檔案讀取失敗'));
    };

    reader.readAsText(file, 'utf-8');
  });
}

