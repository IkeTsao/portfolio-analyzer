// 投資組合數據存儲和管理工具

import { Account, Holding, ExchangeRate, PriceData } from '@/types/portfolio';

const STORAGE_KEYS = {
  ACCOUNTS: 'portfolio_accounts',
  HOLDINGS: 'portfolio_holdings',
  EXCHANGE_RATES: 'portfolio_exchange_rates',
  PRICE_DATA: 'portfolio_price_data',
  LAST_UPDATE: 'portfolio_last_update',
};

// 帳戶管理
export const saveAccounts = (accounts: Account[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }
};

export const loadAccounts = (): Account[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  
  // 返回默認的三個帳戶
  return [
    {
      id: 'etrade',
      name: 'Etrade',
      type: 'brokerage',
      currency: 'USD',
      holdings: [],
    },
    {
      id: 'fubon',
      name: '富邦銀行',
      type: 'bank',
      currency: 'TWD',
      holdings: [],
    },
    {
      id: 'esun',
      name: '玉山銀行',
      type: 'bank',
      currency: 'TWD',
      holdings: [],
    },
  ];
};

// 持倉管理
export const saveHoldings = (holdings: Holding[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
  }
};

export const loadHoldings = (): Holding[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.HOLDINGS);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return [];
};

export const addHolding = (holding: Holding): void => {
  const holdings = loadHoldings();
  holdings.push(holding);
  saveHoldings(holdings);
};

export const updateHolding = (holdingId: string, updates: Partial<Holding>): void => {
  const holdings = loadHoldings();
  const index = holdings.findIndex(h => h.id === holdingId);
  if (index !== -1) {
    holdings[index] = { ...holdings[index], ...updates };
    saveHoldings(holdings);
  }
};

export const deleteHolding = (holdingId: string): void => {
  const holdings = loadHoldings();
  const filtered = holdings.filter(h => h.id !== holdingId);
  saveHoldings(filtered);
};

// 清空所有持倉數據 (新增函數)
export const clearAllHoldings = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.HOLDINGS);
  }
};

// 批量添加持倉 (新增函數)
export const addMultipleHoldings = (holdings: Holding[]): void => {
  const existingHoldings = loadHoldings();
  const allHoldings = [...existingHoldings, ...holdings];
  saveHoldings(allHoldings);
};

// 替換所有持倉數據 (新增函數)
export const replaceAllHoldings = (holdings: Holding[]): void => {
  saveHoldings(holdings);
};

// 匯率數據管理
export const saveExchangeRates = (rates: ExchangeRate[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(rates));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
  }
};

export const loadExchangeRates = (): ExchangeRate[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return [];
};

// 價格數據管理
export const savePriceData = (priceData: PriceData[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PRICE_DATA, JSON.stringify(priceData));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
  }
};

export const loadPriceData = (): PriceData[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.PRICE_DATA);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return [];
};

export const getLastUpdateTime = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  }
  return null;
};

// 數據清理
export const clearAllData = (): void => {
  if (typeof window !== 'undefined') {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 獲取帳戶的所有持倉
export const getHoldingsByAccount = (accountId: string): Holding[] => {
  const holdings = loadHoldings();
  return holdings.filter(h => h.accountId === accountId);
};

// 按類型獲取持倉
export const getHoldingsByType = (type: string): Holding[] => {
  const holdings = loadHoldings();
  return holdings.filter(h => h.type === type);
};

// 按市場獲取持倉
export const getHoldingsByMarket = (market: string): Holding[] => {
  const holdings = loadHoldings();
  return holdings.filter(h => h.market === market);
};

// 獲取持倉統計
export const getHoldingsStats = () => {
  const holdings = loadHoldings();
  return {
    total: holdings.length,
    byAccount: {
      etrade: holdings.filter(h => h.accountId === 'etrade').length,
      fubon: holdings.filter(h => h.accountId === 'fubon').length,
      esun: holdings.filter(h => h.accountId === 'esun').length,
    },
    byType: {
      stock: holdings.filter(h => h.type === 'stock').length,
      fund: holdings.filter(h => h.type === 'fund').length,
      bond: holdings.filter(h => h.type === 'bond').length,
      gold: holdings.filter(h => h.type === 'gold').length,
      crypto: holdings.filter(h => h.type === 'crypto').length,
      cash: holdings.filter(h => h.type === 'cash').length,
    },
    byMarket: {
      US: holdings.filter(h => h.market === 'US').length,
      TW: holdings.filter(h => h.market === 'TW').length,
      OTHER: holdings.filter(h => h.market === 'OTHER').length,
    }
  };
};

