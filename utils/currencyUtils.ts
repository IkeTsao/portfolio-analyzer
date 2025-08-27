'use client';

import { SUPPORTED_CURRENCIES } from '@/types/portfolio';

/**
 * 根據貨幣代碼獲取貨幣符號
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * 格式化金額，使用原始貨幣符號
 */
export function formatCurrencyWithSymbol(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  // 對於日圓，不顯示小數點
  if (currencyCode === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  // 其他貨幣顯示兩位小數
  return `${symbol}${amount.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 獲取貨幣資訊
 */
export function getCurrencyInfo(currencyCode: string) {
  return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
}

