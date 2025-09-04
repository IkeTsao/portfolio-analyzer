// 投資組合計算工具 - 收益計算、統計分析等

import { Holding, PortfolioStats, PriceData, ExchangeRate } from '@/types/portfolio';

// 精度設定常數
const QUANTITY_PRECISION = 3;  // 數量：小數點後3位
const VALUE_PRECISION = 2;     // 其他數值：小數點後2位

// 格式化數量（小數點後3位）
export const formatQuantity = (value: number): number => {
  return parseFloat(value.toFixed(QUANTITY_PRECISION));
};

// 格式化價值（小數點後2位）
export const formatValue = (value: number): number => {
  return parseFloat(value.toFixed(VALUE_PRECISION));
};

// 統一市值計算公式：市值(台幣) = 數量 × 現價 × 原幣對台幣的匯率
export const calculateHoldingValue = (
  holding: Holding,
  currentPrice: number,
  exchangeRate: number = 1,
  csvExchangeRate?: number
): {
  currentValue: number;
  costValue: number;
  gainLoss: number;
  gainLossPercent: number;
} => {
  // 統一計算邏輯：所有類別都使用相同公式
  // 市值(台幣) = 數量 × 現價 × 原幣對台幣的匯率
  
  const quantity = formatQuantity(holding.quantity);
  const formattedCurrentPrice = formatValue(currentPrice);
  const formattedCostBasis = formatValue(holding.costBasis);
  
  // 確保匯率方向正確：外幣對台幣
  let effectiveExchangeRate = formatValue(exchangeRate);
  
  // 對於現金類型且有CSV匯率時，優先使用CSV匯率（用於匯差計算）
  if (holding.type === 'cash' && holding.currency !== 'TWD' && csvExchangeRate && csvExchangeRate > 0) {
    effectiveExchangeRate = formatValue(csvExchangeRate);
  }
  
  // 台幣對台幣匯率永遠為1
  if (holding.currency === 'TWD') {
    effectiveExchangeRate = formatValue(1);
  }
  
  // 現值計算（統一公式）
  const currentValueTWD = formatValue(quantity * formattedCurrentPrice * effectiveExchangeRate);
  
  // 成本計算（統一公式）
  const costValueTWD = formatValue(quantity * formattedCostBasis * effectiveExchangeRate);
  
  // 損益計算
  const gainLoss = formatValue(currentValueTWD - costValueTWD);
  const gainLossPercent = costValueTWD > 0 ? formatValue((gainLoss / costValueTWD) * 100) : 0;

  return {
    currentValue: currentValueTWD,
    costValue: costValueTWD,
    gainLoss,
    gainLossPercent,
  };
};

// 獲取匯率（基準貨幣轉換）
export const getExchangeRateForCurrency = (
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: ExchangeRate[]
): number => {
  // 台幣對台幣匯率永遠為1
  if (fromCurrency === toCurrency || fromCurrency === 'TWD') {
    return formatValue(1);
  }
  
  // 目標貨幣必須是台幣，因為我們的系統以台幣為基準
  if (toCurrency !== 'TWD') {
    console.warn(`不支援的目標貨幣: ${toCurrency}，系統僅支援轉換為台幣`);
    return formatValue(1);
  }
  
  // 查找外幣對台幣的直接匯率
  const directRate = exchangeRates.find(
    rate => rate.from === fromCurrency && rate.to === 'TWD'
  );
  
  if (directRate && directRate.rate > 0) {
    return formatValue(directRate.rate);
  }
  
  // 如果找不到直接匯率，嘗試反向查找（台幣對外幣，然後取倒數）
  const reverseRate = exchangeRates.find(
    rate => rate.from === 'TWD' && rate.to === fromCurrency
  );
  
  if (reverseRate && reverseRate.rate > 0) {
    return formatValue(1 / reverseRate.rate);
  }
  
  // 默認返回1（無法轉換時的備用值）
  console.warn(`無法找到 ${fromCurrency} 對 TWD 的匯率，使用預設值 1`);
  return formatValue(1);
};

// 計算投資組合統計
export const calculatePortfolioStats = (
  holdings: Holding[],
  priceData: PriceData[],
  exchangeRates: ExchangeRate[],
  baseCurrency: string = 'TWD'
): PortfolioStats => {
  // 首先檢查是否有今日的歷史匯率記錄（來自CSV導入）
  let effectiveExchangeRates = exchangeRates;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('portfolioHistoricalData');
    
    if (saved) {
      const records = JSON.parse(saved);
      const todayRecord = records.find((r: any) => r.date === today);
      
      if (todayRecord && todayRecord.exchangeRates) {
        // 將CSV匯率轉換為ExchangeRate格式
        const csvRates = todayRecord.exchangeRates;
        const csvExchangeRates: ExchangeRate[] = [];
        
        Object.entries(csvRates).forEach(([currency, rate]) => {
          if (currency !== 'timestamp' && typeof rate === 'number') {
            csvExchangeRates.push({
              from: currency,
              to: 'TWD',
              rate: rate as number,
              timestamp: new Date().toISOString(),
            });
          }
        });
        
        if (csvExchangeRates.length > 0) {
          effectiveExchangeRates = csvExchangeRates;
          console.log('使用CSV導入的匯率進行投資組合計算:', csvRates);
        }
      }
    }
  } catch (error) {
    console.warn('獲取CSV匯率資料失敗，使用預設匯率:', error);
  }

  let totalValue = 0;
  let totalCost = 0;

  // 市場分布
  const marketDistribution = {
    US: { value: 0, percentage: 0 },
    TW: { value: 0, percentage: 0 },
    OTHER: { value: 0, percentage: 0 },
  };

  // 產品類型分布
  const typeDistribution = {
    stock: { value: 0, percentage: 0 },
    fund: { value: 0, percentage: 0 },
    bond: { value: 0, percentage: 0 },
    gold: { value: 0, percentage: 0 },
    crypto: { value: 0, percentage: 0 },
    commodity: { value: 0, percentage: 0 },
    cash: { value: 0, percentage: 0 },
  };

  // 帳戶分布
  const accountDistribution: { [accountId: string]: { value: number; percentage: number } } = {};

  // 計算每個持倉的價值
  holdings.forEach(holding => {
    // 獲取當前價格 - 優先使用手動輸入的現價
    const price = priceData.find(p => p.symbol === holding.symbol);
    let currentPrice: number;
    if (holding.currentPrice && holding.currentPrice > 0) {
      // 使用手動輸入的現價
      currentPrice = holding.currentPrice;
    } else if (price?.price) {
      // 使用API獲取的價格
      currentPrice = price.price;
    } else {
      // 使用成本價作為預設
      currentPrice = holding.costBasis;
    }

    // 獲取匯率
    const exchangeRate = getExchangeRateForCurrency(
      holding.currency,
      baseCurrency,
      effectiveExchangeRates
    );

    // 獲取CSV匯率（用於現金匯差計算）
    let csvExchangeRate: number | undefined;
    let isUsingCsvRates = false;
    
    if (holding.type === 'cash' && holding.currency !== 'TWD') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem('portfolioHistoricalData');
        
        if (saved) {
          const records = JSON.parse(saved);
          const todayRecord = records.find((r: any) => r.date === today);
          
          if (todayRecord && todayRecord.exchangeRates && todayRecord.exchangeRates[holding.currency]) {
            csvExchangeRate = parseFloat(todayRecord.exchangeRates[holding.currency].toFixed(2));
            // 檢查是否正在使用CSV匯率作為effectiveExchangeRates
            isUsingCsvRates = effectiveExchangeRates.some(rate => 
              rate.from === holding.currency && Math.abs(rate.rate - csvExchangeRate!) < 0.01
            );
          }
        }
      } catch (error) {
        console.warn('獲取CSV匯率失敗:', error);
      }
    }

    // 計算價值 - 如果正在使用CSV匯率，則不傳入csvExchangeRate避免重複計算
    const finalCsvExchangeRate = isUsingCsvRates ? undefined : csvExchangeRate;
    
    const { currentValue, costValue, gainLoss } = calculateHoldingValue(
      holding,
      currentPrice,
      exchangeRate,
      finalCsvExchangeRate
    );

    totalValue += currentValue;
    totalCost += costValue;

    // 市場分布
    marketDistribution[holding.market].value += currentValue;

    // 產品類型分布
    typeDistribution[holding.type].value += currentValue;

    // 帳戶分布
    if (!accountDistribution[holding.accountId]) {
      accountDistribution[holding.accountId] = { value: 0, percentage: 0 };
    }
    accountDistribution[holding.accountId].value += currentValue;
  });

  // 計算百分比
  if (totalValue > 0) {
    Object.keys(marketDistribution).forEach(market => {
      marketDistribution[market as keyof typeof marketDistribution].percentage =
        (marketDistribution[market as keyof typeof marketDistribution].value / totalValue) * 100;
    });

    Object.keys(typeDistribution).forEach(type => {
      typeDistribution[type as keyof typeof typeDistribution].percentage =
        (typeDistribution[type as keyof typeof typeDistribution].value / totalValue) * 100;
    });

    Object.keys(accountDistribution).forEach(accountId => {
      accountDistribution[accountId].percentage =
        (accountDistribution[accountId].value / totalValue) * 100;
    });
  }

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) : 0;

  // 創建新的分布格式（包含損益）
  const distributionByType: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};
  const distributionByMarket: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};
  const distributionByAccount: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};

  // 填充類型分布
  Object.keys(typeDistribution).forEach(type => {
    const typeCost = holdings
      .filter(h => h.type === type)
      .reduce((sum, h) => {
        const exchangeRate = getExchangeRateForCurrency(h.currency, baseCurrency, exchangeRates);
        return sum + (h.quantity * h.costBasis * exchangeRate);
      }, 0);
    
    distributionByType[type] = {
      totalValue: typeDistribution[type].value,
      totalCost: typeCost,
      totalGainLoss: typeDistribution[type].value - typeCost,
      percentage: typeDistribution[type].percentage,
    };
  });

  // 填充市場分布
  Object.keys(marketDistribution).forEach(market => {
    const marketCost = holdings
      .filter(h => h.market === market)
      .reduce((sum, h) => {
        const exchangeRate = getExchangeRateForCurrency(h.currency, baseCurrency, exchangeRates);
        return sum + (h.quantity * h.costBasis * exchangeRate);
      }, 0);
    
    distributionByMarket[market] = {
      totalValue: marketDistribution[market].value,
      totalCost: marketCost,
      totalGainLoss: marketDistribution[market].value - marketCost,
      percentage: marketDistribution[market].percentage,
    };
  });

  // 填充帳戶分布
  Object.keys(accountDistribution).forEach(accountId => {
    const accountCost = holdings
      .filter(h => h.accountId === accountId)
      .reduce((sum, h) => {
        const exchangeRate = getExchangeRateForCurrency(h.currency, baseCurrency, exchangeRates);
        return sum + (h.quantity * h.costBasis * exchangeRate);
      }, 0);
    
    distributionByAccount[accountId] = {
      totalValue: accountDistribution[accountId].value,
      totalCost: accountCost,
      totalGainLoss: accountDistribution[accountId].value - accountCost,
      percentage: accountDistribution[accountId].percentage,
    };
  });

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    marketDistribution,
    typeDistribution,
    accountDistribution,
    distributionByType,
    distributionByMarket,
    distributionByAccount,
  };
};

// 計算持倉詳細資訊
export const calculateHoldingDetails = (
  holdings: Holding[],
  priceData: PriceData[],
  exchangeRates: ExchangeRate[],
  baseCurrency: string = 'TWD'
) => {
  // 首先檢查是否有今日的歷史匯率記錄（來自CSV導入）
  let effectiveExchangeRates = exchangeRates;  
  try {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('portfolioHistoricalData');
    
    if (saved) {
      const records = JSON.parse(saved);
      const todayRecord = records.find((r: any) => r.date === today);
      
      if (todayRecord && todayRecord.exchangeRates) {
        // 將CSV匯率轉換為ExchangeRate格式
        const csvRates = todayRecord.exchangeRates;
        const csvExchangeRates: ExchangeRate[] = [];
        
        Object.entries(csvRates).forEach(([currency, rate]) => {
          if (currency !== 'timestamp' && typeof rate === 'number') {
            csvExchangeRates.push({
              from: currency,
              to: 'TWD',
              rate: rate as number,
              timestamp: new Date().toISOString(),
            });
          }
        });
        
        if (csvExchangeRates.length > 0) {
          effectiveExchangeRates = csvExchangeRates;
        }
      }
    }
  } catch (error) {
    console.warn('獲取CSV匯率資料失敗，使用預設匯率:', error);
  }

  return holdings.map(holding => {
    const price = priceData.find(p => p.symbol === holding.symbol);
    
    // 優先使用手動輸入的現價，如果沒有則使用API獲取的價格，最後才使用成本價
    let currentPrice: number;
    if (holding.currentPrice && holding.currentPrice > 0) {
      // 使用手動輸入的現價
      currentPrice = holding.currentPrice;
    } else if (price?.price) {
      // 使用API獲取的價格
      currentPrice = price.price;
    } else {
      // 使用成本價作為預設
      currentPrice = holding.costBasis;
    }
    
    const exchangeRate = getExchangeRateForCurrency(
      holding.currency,
      baseCurrency,
      effectiveExchangeRates
    );

    // 獲取CSV匯率（用於現金匯差計算）
    let csvExchangeRate: number | undefined;
    if (holding.type === 'cash' && holding.currency !== 'TWD') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem('portfolioHistoricalData');
        
        if (saved) {
          const records = JSON.parse(saved);
          const todayRecord = records.find((r: any) => r.date === today);
          
          if (todayRecord && todayRecord.exchangeRates && todayRecord.exchangeRates[holding.currency]) {
            csvExchangeRate = parseFloat(todayRecord.exchangeRates[holding.currency].toFixed(2));
          }
        }
      } catch (error) {
        console.warn('獲取CSV匯率失敗:', error);
      }
    }

    const calculations = calculateHoldingValue(holding, currentPrice, exchangeRate, csvExchangeRate);

    return {
      ...holding,
      currentPrice,
      exchangeRate,
      ...calculations,
      priceChange: (holding.currentPrice && holding.currentPrice > 0) ? 0 : (price?.change || 0),
      priceChangePercent: (holding.currentPrice && holding.currentPrice > 0) ? 0 : (price?.changePercent || 0),
      lastUpdated: holding.currentPrice ? holding.lastUpdated : price?.timestamp,
    };
  });
};

// 格式化貨幣顯示（應用統一精度）
export const formatCurrency = (
  amount: number,
  currency: string = 'TWD',
  decimals?: number
): string => {
  // 應用統一精度：小數點後2位
  const formattedAmount = formatValue(amount);
  
  // 對於台幣顯示，去除NT前綴，不顯示小數點
  if (currency === 'TWD') {
    return formattedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CHF: 'CHF',
    JPY: '¥',
  };

  const symbol = currencySymbols[currency] || currency;
  
  // 使用統一精度：小數點後2位（除非特別指定）
  const displayDecimals = decimals !== undefined ? decimals : VALUE_PRECISION;
  
  return `${symbol}${formattedAmount.toLocaleString('en-US', {
    minimumFractionDigits: displayDecimals,
    maximumFractionDigits: displayDecimals,
  })}`;
};

// 格式化百分比顯示（應用統一精度）
export const formatPercentage = (value: number, decimals?: number): string => {
  const displayDecimals = decimals !== undefined ? decimals : VALUE_PRECISION;
  const formattedValue = formatValue(value);
  return `${formattedValue.toFixed(displayDecimals)}%`;
};

// 計算投資組合風險指標（簡化版）
export const calculateRiskMetrics = (
  holdingDetails: any[],
  historicalData?: any[]
) => {
  // 這裡實現簡化的風險計算
  // 實際應用中需要更多歷史數據來計算準確的風險指標
  
  const totalValue = holdingDetails.reduce((sum, holding) => sum + holding.currentValue, 0);
  
  // 計算加權平均波動率（基於價格變化）
  const weightedVolatility = holdingDetails.reduce((sum, holding) => {
    const weight = holding.currentValue / totalValue;
    const volatility = Math.abs(holding.priceChangePercent || 0);
    return sum + (weight * volatility);
  }, 0);

  return {
    volatility: weightedVolatility,
    sharpeRatio: 0, // 需要無風險利率和歷史數據計算
    maxDrawdown: 0, // 需要歷史數據計算
    beta: 1, // 需要市場指數數據計算
    correlation: {}, // 需要多個資產的歷史數據計算
  };
};

