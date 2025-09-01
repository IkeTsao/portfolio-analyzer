import { Holding } from '@/types/portfolio';
import { 
  addHolding, 
  deleteHolding, 
  loadHoldings
} from '@/utils/firebaseStorage';
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
  'ETRADE': 'etrade',
  '富邦銀行': 'fubon',
  '富邦': 'fubon',
  'fubon': 'fubon',
  '玉山銀行': 'esun',
  '玉山': 'esun',
  'esun': 'esun',
  'Interactive Brokers': 'ib',
  'IB': 'ib',
  'ib': 'ib',
  '現金帳戶': 'cash',
  '現金': 'cash',
  'cash': 'cash'
};

// 投資類型映射
const TYPE_MAP: { [key: string]: string } = {
  '股票': 'stock',
  'stock': 'stock',
  '基金': 'fund',
  '共同基金': 'fund',
  'fund': 'fund',
  'ETF': 'fund',
  'etf': 'fund',
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
  '美股': 'US',
  'US': 'US',
  'USA': 'US',
  '台灣': 'TW',
  '台股': 'TW',
  'TW': 'TW',
  'TWN': 'TW',
  '其他': 'OTHER',
  'OTHER': 'OTHER'
};

/**
 * 導出持倉數據為 CSV 格式
 */
export function exportHoldingsToCSV(holdings: Holding[]): string {
  const headers = CSV_HEADERS.join(',');
  const rows = holdings.map(holding => {
    return [
      holding.id,
      holding.accountId,
      holding.symbol,
      `"${holding.name}"`, // 名稱可能包含逗號，用引號包圍
      holding.type,
      holding.market,
      holding.quantity,
      holding.costBasis,
      holding.currency,
      holding.purchaseDate,
      holding.currentPrice || '',
      holding.lastUpdated || ''
    ].join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * 解析 CSV 內容為持倉數據
 */
export function parseHoldingsFromCSV(csvContent: string): Holding[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV 檔案格式不正確，至少需要標題行和一行數據');
  }

  const holdings: Holding[] = [];
  
  // 跳過標題行，從第二行開始處理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
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
        name: values[3]?.replace(/^"|"$/g, '') || '', // 移除引號
        type: normalizeType(values[4]),
        market: normalizeMarket(values[5]),
        quantity: parseFloat(values[6]) || 0,
        costBasis: parseFloat(values[7]) || 0,
        currency: values[8]?.toUpperCase() || 'USD',
        purchaseDate: values[9] || new Date().toISOString().split('T')[0],
        currentPrice: values[10] ? parseFloat(values[10]) : undefined,
        lastUpdated: values[11] || new Date().toISOString()
      };

      // 驗證必要欄位
      if (!holding.symbol || !holding.accountId || holding.quantity <= 0) {
        console.warn(`第 ${i + 1} 行數據無效，跳過:`, holding);
        continue;
      }

      holdings.push(holding);
    } catch (error) {
      console.error(`解析第 ${i + 1} 行時發生錯誤:`, error);
      continue;
    }
  }

  if (holdings.length === 0) {
    throw new Error('CSV 檔案中沒有有效的持倉數據');
  }

  return holdings;
}

/**
 * 解析 CSV 行，處理引號和逗號
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
  const normalized = ACCOUNT_ID_MAP[accountId] || accountId.toLowerCase();
  
  // 如果找不到映射，使用預設帳戶
  if (!['etrade', 'fubon', 'esun', 'ib', 'cash'].includes(normalized)) {
    console.warn(`未知的帳戶 ID: ${accountId}，使用預設帳戶 etrade`);
    return 'etrade';
  }
  
  return normalized;
}

/**
 * 標準化投資類型
 */
function normalizeType(type: string): 'stock' | 'fund' | 'bond' | 'gold' | 'crypto' | 'cash' {
  const normalized = TYPE_MAP[type] || 'stock';
  return normalized as 'stock' | 'fund' | 'bond' | 'gold' | 'crypto' | 'cash';
}

/**
 * 標準化市場
 */
function normalizeMarket(market: string): 'US' | 'TW' | 'OTHER' {
  const normalized = MARKET_MAP[market] || 'US';
  return normalized as 'US' | 'TW' | 'OTHER';
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
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Firebase 版本：導入 CSV 檔案並替換所有持倉
 */
export async function importHoldingsFromFileToFirebase(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const holdings = parseHoldingsFromCSV(csvContent);
        
        if (holdings.length === 0) {
          throw new Error('CSV 檔案中沒有有效的持倉數據');
        }

        console.log(`🔄 開始導入 ${holdings.length} 筆持倉數據到 Firebase...`);

        // 1. 清空現有持倉
        console.log('🗑️ 清空現有持倉數據...');
        const existingHoldings = await loadHoldings();
        for (const holding of existingHoldings) {
          await deleteHolding(holding.id);
        }

        // 2. 保存新的持倉數據
        console.log('💾 保存新的持倉數據到 Firebase...');
        for (const holding of holdings) {
          await addHolding(holding);
        }

        console.log('✅ CSV 數據已成功導入到 Firebase');

        notifications.show({
          title: '導入成功',
          message: `已成功導入 ${holdings.length} 筆持倉數據到 Firebase 雲端數據庫`,
          color: 'green',
        });

        resolve();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        console.error('❌ CSV 導入失敗:', error);
        
        notifications.show({
          title: '導入失敗',
          message: errorMessage,
          color: 'red',
        });
        reject(error);
      }
    };

    reader.onerror = () => {
      const error = new Error('檔案讀取失敗');
      notifications.show({
        title: '檔案讀取失敗',
        message: '無法讀取選擇的檔案',
        color: 'red',
      });
      reject(error);
    };

    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Firebase 版本：導出持倉數據為 CSV
 */
export async function exportHoldingsFromFirebaseToCSV(): Promise<string> {
  try {
    console.log('📊 從 Firebase 載入持倉數據...');
    const holdings = await loadHoldings();
    
    if (holdings.length === 0) {
      throw new Error('沒有持倉數據可以導出');
    }

    console.log(`✅ 成功載入 ${holdings.length} 筆持倉數據`);
    return exportHoldingsToCSV(holdings);
  } catch (error) {
    console.error('❌ 導出 CSV 失敗:', error);
    throw error;
  }
}

