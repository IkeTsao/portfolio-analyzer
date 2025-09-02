// 金融數據服務 - 統一管理各種金融指標的獲取

export interface FinancialIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  category: 'index' | 'bond' | 'commodity' | 'crypto';
  timestamp: string;
  isFallback?: boolean;
}

export interface ExchangeRate {
  currency: string;
  rate: number;
  change: number;
  label: string;
  symbol: string;
  isFallback: boolean;
}

// 金融指標類別配置
export const INDICATOR_CATEGORIES = {
  index: {
    label: '市場指數',
    icon: 'IconTrendingUp',
    color: 'blue',
  },
  bond: {
    label: '債券利率',
    icon: 'IconChartLine',
    color: 'green',
  },
  commodity: {
    label: '商品',
    icon: 'IconCurrencyDollar',
    color: 'orange',
  },
  crypto: {
    label: '加密貨幣',
    icon: 'IconCurrencyBitcoin',
    color: 'yellow',
  },
};

// 預定義的金融指標
export const FINANCIAL_INDICATORS = [
  // 美國指數
  { symbol: 'DX-Y.NYB', name: '美元指數', category: 'index' as const },
  { symbol: '^DJI', name: '道瓊指數', category: 'index' as const },
  { symbol: '^GSPC', name: 'S&P 500', category: 'index' as const },
  
  // 台股指數
  { symbol: '^TWII', name: '台股指數', category: 'index' as const },
  
  // 債券利率
  { symbol: '^TNX', name: '美國10年公債', category: 'bond' as const },
  { symbol: '^TYX', name: '美國30年公債', category: 'bond' as const },
  
  // 商品
  { symbol: 'GC=F', name: '黃金', category: 'commodity' as const },
  
  // 加密貨幣
  { symbol: 'BTC-USD', name: '比特幣', category: 'crypto' as const },
];

// 匯率配置
export const EXCHANGE_RATES = [
  { currency: 'USD', label: '美金', symbol: '$' },
  { currency: 'EUR', label: '歐元', symbol: '€' },
  { currency: 'GBP', label: '英鎊', symbol: '£' },
  { currency: 'CHF', label: '瑞士法郎', symbol: 'CHF' },
  { currency: 'JPY', label: '日圓', symbol: '¥' },
];

/**
 * 獲取金融指標數據
 */
export async function fetchFinancialIndicators(
  symbols?: string[]
): Promise<FinancialIndicator[]> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const symbolsParam = symbols ? `?symbols=${symbols.join(',')}` : '';
    
    const response = await fetch(`${baseUrl}/api/financial-indicators${symbolsParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data.map((indicator: any) => ({
        ...indicator,
        isFallback: false,
      }));
    } else {
      throw new Error(data.error || 'Failed to fetch financial indicators');
    }
  } catch (error) {
    console.error('Error fetching financial indicators:', error);
    
    // 返回備用數據
    return getFallbackIndicators(symbols);
  }
}

/**
 * 獲取匯率數據
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const ratePromises = EXCHANGE_RATES.map(async (config) => {
      try {
        const response = await fetch(
          `${baseUrl}/api/scrape-exchange-rate?from=${config.currency}&to=TWD`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.rate && data.rate > 0) {
          return {
            currency: config.currency,
            rate: data.rate,
            change: data.change || 0,
            label: config.label,
            symbol: config.symbol,
            isFallback: false,
          };
        } else {
          throw new Error('Invalid rate data');
        }
      } catch (error) {
        console.error(`Failed to fetch ${config.currency} rate:`, error);
        
        // 返回備用匯率
        const fallbackRates: { [key: string]: number } = {
          'USD': 31.5,
          'EUR': 34.2,
          'GBP': 39.8,
          'CHF': 35.1,
          'JPY': 0.21,
        };
        
        return {
          currency: config.currency,
          rate: fallbackRates[config.currency] || 0,
          change: 0,
          label: config.label,
          symbol: config.symbol,
          isFallback: true,
        };
      }
    });

    return await Promise.all(ratePromises);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return getFallbackExchangeRates();
  }
}

/**
 * 獲取備用金融指標數據
 */
function getFallbackIndicators(symbols?: string[]): FinancialIndicator[] {
  const fallbackData: { [key: string]: { value: number; unit: string } } = {
    'DX-Y.NYB': { value: 104.5, unit: '' },
    '^DJI': { value: 34500, unit: '' },
    '^GSPC': { value: 4400, unit: '' },
    '^TWII': { value: 17000, unit: '' },
    '^TNX': { value: 4.5, unit: '%' },
    '^TYX': { value: 4.8, unit: '%' },
    'GC=F': { value: 2000, unit: '$' },
    'BTC-USD': { value: 45000, unit: '$' },
  };

  const targetIndicators = symbols 
    ? FINANCIAL_INDICATORS.filter(ind => symbols.includes(ind.symbol))
    : FINANCIAL_INDICATORS;

  return targetIndicators.map(config => {
    const fallback = fallbackData[config.symbol];
    return {
      symbol: config.symbol,
      name: config.name,
      value: fallback?.value || 0,
      change: 0,
      changePercent: 0,
      unit: fallback?.unit || '',
      category: config.category,
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
  });
}

/**
 * 獲取備用匯率數據
 */
function getFallbackExchangeRates(): ExchangeRate[] {
  const fallbackRates: { [key: string]: number } = {
    'USD': 31.5,
    'EUR': 34.2,
    'GBP': 39.8,
    'CHF': 35.1,
    'JPY': 0.21,
  };

  return EXCHANGE_RATES.map(config => ({
    currency: config.currency,
    rate: fallbackRates[config.currency] || 0,
    change: 0,
    label: config.label,
    symbol: config.symbol,
    isFallback: true,
  }));
}

/**
 * 格式化金融指標數值
 */
export function formatIndicatorValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }
  if (unit === '$') {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  }
  
  // 一般數值格式化
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toLocaleString();
}

/**
 * 格式化變化百分比
 */
export function formatChangePercent(changePercent: number): string {
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(2)}%`;
}

/**
 * 獲取變化顏色
 */
export function getChangeColor(change: number): string {
  if (change > 0) return 'green';
  if (change < 0) return 'red';
  return 'gray';
}

/**
 * 批量獲取所有金融數據
 */
export async function fetchAllFinancialData(): Promise<{
  indicators: FinancialIndicator[];
  exchangeRates: ExchangeRate[];
}> {
  try {
    const [indicators, exchangeRates] = await Promise.all([
      fetchFinancialIndicators(),
      fetchExchangeRates(),
    ]);

    return {
      indicators,
      exchangeRates,
    };
  } catch (error) {
    console.error('Error fetching all financial data:', error);
    
    return {
      indicators: getFallbackIndicators(),
      exchangeRates: getFallbackExchangeRates(),
    };
  }
}

