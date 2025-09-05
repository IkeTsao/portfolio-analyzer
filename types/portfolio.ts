// 投資組合相關的TypeScript類型定義

export interface Account {
  id: string;
  name: string; // "Etrade", "富邦銀行", "玉山銀行"
  type: 'brokerage' | 'bank';
  currency: string; // 主要貨幣
  holdings: Holding[];
}

export interface Holding {
  id: string;
  accountId: string;
  symbol: string; // 股票代碼、貨幣代碼等
  name: string; // 產品名稱
  type: 'stock' | 'fund' | 'bond' | 'gold' | 'crypto' | 'cash' | 'commodity';
  market: 'US' | 'TW' | 'OTHER'; // 市場分類
  quantity: number; // 持有數量
  costBasis: number; // 成本價
  currency: string; // 計價貨幣
  purchaseDate: string;
  currentPrice?: number; // 當前價格（從API獲取）
  lastUpdated?: string; // 價格更新時間
}

export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  change: number;
  changePercent: number;
  source: 'yahoo' | 'exchangerate' | 'coingecko' | 'twse';
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export interface PortfolioStats {
  totalValue: number; // 總價值（以基準貨幣計算）
  totalCost: number; // 總成本
  totalGainLoss: number; // 總損益
  totalGainLossPercent: number; // 總收益率
  
  // 按市場分布
  marketDistribution: {
    US: { value: number; percentage: number };
    TW: { value: number; percentage: number };
    OTHER: { value: number; percentage: number };
  };
  
  // 按產品類型分布
  typeDistribution: {
    stock: { value: number; percentage: number };
    fund: { value: number; percentage: number };
    bond: { value: number; percentage: number };
    gold: { value: number; percentage: number };
    crypto: { value: number; percentage: number };
    cash: { value: number; percentage: number };
    commodity: { value: number; percentage: number };
  };
  
  // 按帳戶分布
  accountDistribution: {
    [accountId: string]: { value: number; percentage: number };
  };

  // 新增：按類型分布（包含損益）
  distributionByType: {
    [key: string]: {
      totalValue: number;
      totalCost: number;
      totalGainLoss: number;
      percentage: number;
    };
  };

  // 新增：按市場分布（包含損益）
  distributionByMarket: {
    [key: string]: {
      totalValue: number;
      totalCost: number;
      totalGainLoss: number;
      percentage: number;
    };
  };

  // 新增：按帳戶分布（包含損益）
  distributionByAccount: {
    [key: string]: {
      totalValue: number;
      totalCost: number;
      totalGainLoss: number;
      percentage: number;
    };
  };
}

export interface RiskMetrics {
  volatility: number; // 波動率
  sharpeRatio: number; // 夏普比率
  maxDrawdown: number; // 最大回撤
  beta: number; // 貝塔值
  correlation: { [symbol: string]: number }; // 相關性矩陣
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'TWD', name: '新台幣', symbol: 'NT$' },
  { code: 'USD', name: '美元', symbol: '$' },
  { code: 'EUR', name: '歐元', symbol: '€' },
  { code: 'GBP', name: '英鎊', symbol: '£' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF' },
  { code: 'JPY', name: '日圓', symbol: '¥' },
];

export const ACCOUNT_TYPES = [
  { value: 'etrade', label: 'Etrade' },
  { value: 'fubon', label: '富邦銀行' },
  { value: 'esun', label: '玉山銀行' },
  { value: 'account4', label: '帳號4' },
  { value: 'account5', label: '帳號5' },
];

export const INVESTMENT_TYPES = [
  { value: 'stock', label: '股票與基金' },
  { value: 'bond', label: '債券' },
  { value: 'gold', label: '黃金' },
  { value: 'crypto', label: '加密貨幣' },
  { value: 'commodity', label: '大宗物資' },
  { value: 'cash', label: '現金' },
];

export const MARKET_TYPES = [
  { value: 'US', label: '美國市場' },
  { value: 'TW', label: '台灣市場' },
  { value: 'OTHER', label: '其他市場' },
];

