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

  // 計算每個持倉的價值 - 優先使用已計算的欄位
  holdings.forEach(holding => {
    let currentValue: number;
    let costValue: number;
    
    // 優先使用持倉中已計算的欄位，確保數據一致性
    if (holding.currentValue !== undefined && holding.currentValue !== null && 
        holding.costValue !== undefined && holding.costValue !== null) {
      // 使用已計算的值
      currentValue = holding.currentValue;
      costValue = holding.costValue;
    } else {
      // 如果沒有已計算的值，則重新計算
      const price = priceData.find(p => p.symbol === holding.symbol);
      let currentPrice: number;
      if (holding.currentPrice && holding.currentPrice > 0) {
        currentPrice = holding.currentPrice;
      } else if (price?.price) {
        currentPrice = price.price;
      } else {
        currentPrice = holding.costBasis;
      }

      const exchangeRate = getExchangeRateForCurrency(
        holding.currency,
        baseCurrency,
        effectiveExchangeRates
      );

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
              isUsingCsvRates = effectiveExchangeRates.some(rate => 
                rate.from === holding.currency && Math.abs(rate.rate - csvExchangeRate!) < 0.01
              );
            }
          }
        } catch (error) {
          console.warn('獲取CSV匯率失敗:', error);
        }
      }

      const finalCsvExchangeRate = isUsingCsvRates ? undefined : csvExchangeRate;
      const calculations = calculateHoldingValue(
        holding,
        currentPrice,
        exchangeRate,
        finalCsvExchangeRate
      );
      
      currentValue = calculations.currentValue;
      costValue = calculations.costValue;
    }

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
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // 創建新的分布格式（包含損益）
  const distributionByType: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};
  const distributionByMarket: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};
  const distributionByAccount: { [key: string]: { totalValue: number; totalCost: number; totalGainLoss: number; percentage: number } } = {};

  // 填充類型分布 - 優先使用已計算的欄位
  Object.keys(typeDistribution).forEach(type => {
    let typeCost = 0;
    let typeGainLoss = 0;
    
    holdings.filter(h => h.type === type).forEach(holding => {
      // 優先使用已計算的欄位
      if (holding.costValue !== undefined && holding.costValue !== null &&
          holding.gainLoss !== undefined && holding.gainLoss !== null) {
        typeCost += holding.costValue;
        typeGainLoss += holding.gainLoss;
      } else {
        // 如果沒有已計算的值，則重新計算
        const price = priceData.find(p => p.symbol === holding.symbol);
        let currentPrice: number;
        if (holding.currentPrice && holding.currentPrice > 0) {
          currentPrice = holding.currentPrice;
        } else if (price?.price) {
          currentPrice = price.price;
        } else {
          currentPrice = holding.costBasis;
        }

        const exchangeRate = getExchangeRateForCurrency(
          holding.currency,
          baseCurrency,
          effectiveExchangeRates
        );

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
                isUsingCsvRates = effectiveExchangeRates.some(rate => 
                  rate.from === holding.currency && Math.abs(rate.rate - csvExchangeRate!) < 0.01
                );
              }
            }
          } catch (error) {
            console.warn('獲取CSV匯率失敗:', error);
          }
        }

        const finalCsvExchangeRate = isUsingCsvRates ? undefined : csvExchangeRate;
        const { costValue, gainLoss } = calculateHoldingValue(
          holding,
          currentPrice,
          exchangeRate,
          finalCsvExchangeRate
        );
        
        typeCost += costValue;
        typeGainLoss += gainLoss;
      }
    });
    
    distributionByType[type] = {
      totalValue: typeDistribution[type].value,
      totalCost: typeCost,
      totalGainLoss: typeGainLoss,
      percentage: typeDistribution[type].percentage,
    };
  });

  // 填充市場分布 - 使用實際持倉計算結果
  Object.keys(marketDistribution).forEach(market => {
    let marketCost = 0;
    let marketGainLoss = 0;
    
    holdings.filter(h => h.market === market).forEach(holding => {
      // 獲取當前價格
      const price = priceData.find(p => p.symbol === holding.symbol);
      let currentPrice: number;
      if (holding.currentPrice && holding.currentPrice > 0) {
        currentPrice = holding.currentPrice;
      } else if (price?.price) {
        currentPrice = price.price;
      } else {
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
              isUsingCsvRates = effectiveExchangeRates.some(rate => 
                rate.from === holding.currency && Math.abs(rate.rate - csvExchangeRate!) < 0.01
              );
            }
          }
        } catch (error) {
          console.warn('獲取CSV匯率失敗:', error);
        }
      }

      const finalCsvExchangeRate = isUsingCsvRates ? undefined : csvExchangeRate;
      const { costValue, gainLoss } = calculateHoldingValue(
        holding,
        currentPrice,
        exchangeRate,
        finalCsvExchangeRate
      );
      
      marketCost += costValue;
      marketGainLoss += gainLoss;
    });
    
    distributionByMarket[market] = {
      totalValue: marketDistribution[market].value,
      totalCost: marketCost,
      totalGainLoss: marketGainLoss,
      percentage: marketDistribution[market].percentage,
    };
  });

  // 填充帳戶分布 - 使用實際持倉計算結果
  Object.keys(accountDistribution).forEach(accountId => {
    let accountCost = 0;
    let accountGainLoss = 0;
    
    holdings.filter(h => h.accountId === accountId).forEach(holding => {
      // 獲取當前價格
      const price = priceData.find(p => p.symbol === holding.symbol);
      let currentPrice: number;
      if (holding.currentPrice && holding.currentPrice > 0) {
        currentPrice = holding.currentPrice;
      } else if (price?.price) {
        currentPrice = price.price;
      } else {
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
              isUsingCsvRates = effectiveExchangeRates.some(rate => 
                rate.from === holding.currency && Math.abs(rate.rate - csvExchangeRate!) < 0.01
              );
            }
          }
        } catch (error) {
          console.warn('獲取CSV匯率失敗:', error);
        }
      }

      const finalCsvExchangeRate = isUsingCsvRates ? undefined : csvExchangeRate;
      const { costValue, gainLoss } = calculateHoldingValue(
        holding,
        currentPrice,
        exchangeRate,
        finalCsvExchangeRate
      );
      
      accountCost += costValue;
      accountGainLoss += gainLoss;
    });
    
    distributionByAccount[accountId] = {
      totalValue: accountDistribution[accountId].value,
      totalCost: accountCost,
      totalGainLoss: accountGainLoss,
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
    
    // 獲取匯率
    const exchangeRate = getExchangeRateForCurrency(
      holding.currency,
      baseCurrency,
      exchangeRates
    );

    // 計算市值和損益
    const calculations = calculateHoldingValue(holding, currentPrice, exchangeRate);

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

// 格式化台幣顯示為 NTD $ XXXX 格式（用於投資組合總覽）
export const formatCurrencyNTD = (amount: number): string => {
  const formattedAmount = formatValue(amount);
  return `NTD $ ${formattedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// 前5大持股介面定義
export interface TopHolding {
  id: string;
  name: string;
  symbol: string;
  currentValue: number; // 台幣市值
  gainLoss: number;     // 台幣損益
  gainLossPercent: number; // 損益百分比
  assetRatio: number; // 佔總資產比例
}

// 計算持股排序與現金
export const calculateTopHoldings = (holdings: Holding[], totalAssets: number): TopHolding[] => {
  if (!holdings || holdings.length === 0) {
    return [];
  }

  // 1. 合併相同代碼的持股
  const mergedHoldings = new Map<string, TopHolding>();

  holdings.forEach(holding => {
    if (holding.type === 'cash') return; // 暫時排除現金，稍後單獨處理

    const symbol = holding.symbol;
    const existing = mergedHoldings.get(symbol);

    if (existing) {
      existing.currentValue += holding.currentValue || 0;
      existing.gainLoss += holding.gainLoss || 0;
    } else {
      mergedHoldings.set(symbol, {
        id: symbol, // 使用 symbol 作為合併後的 id
        name: holding.name,
        symbol: holding.symbol,
        currentValue: holding.currentValue || 0,
        gainLoss: holding.gainLoss || 0,
        gainLossPercent: 0, // 稍後重新計算
        assetRatio: 0, // 稍後重新計算
      });
    }
  });

  // 重新計算合併後的損益百分比
  mergedHoldings.forEach(holding => {
    const costValue = holding.currentValue - holding.gainLoss;
    if (costValue > 0) {
      holding.gainLossPercent = (holding.gainLoss / costValue) * 100;
    }
  });

  // 2. 排序所有非現金持股
  const sortedNonCash = Array.from(mergedHoldings.values())
    .sort((a, b) => b.currentValue - a.currentValue);

  // 3. 合併計算台幣和美金現金
  const twdCashHoldings = holdings.filter(h => h.type === 'cash' && h.currency === 'TWD');
  const usdCashHoldings = holdings.filter(h => h.type === 'cash' && h.currency === 'USD');

  const twdTotal = twdCashHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const usdTotal = usdCashHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

  const cashHoldings: TopHolding[] = [];
  if (twdTotal > 0) {
    cashHoldings.push({
      id: 'TWD_CASH',
      name: '台幣現金',
      symbol: 'TWD',
      currentValue: twdTotal,
      gainLoss: 0, // 現金無損益
      gainLossPercent: 0,
      assetRatio: 0, // 稍後重新計算
    });
  }
  if (usdTotal > 0) {
    cashHoldings.push({
      id: 'USD_CASH',
      name: '美金現金',
      symbol: 'USD',
      currentValue: usdTotal,
      gainLoss: 0, // 現金無損益
      gainLossPercent: 0,
      assetRatio: 0, // 稍後重新計算
    });
  }

  // 4. 組合最終列表並計算資產比例
  const finalTopHoldings = [...sortedNonCash, ...cashHoldings].map(holding => ({
    ...holding,
    assetRatio: totalAssets > 0 ? (holding.currentValue / totalAssets) * 100 : 0,
  }));

  // 格式化數值
  return finalTopHoldings.map(holding => ({
    ...holding,
    currentValue: formatValue(holding.currentValue),
    gainLoss: formatValue(holding.gainLoss),
    gainLossPercent: formatValue(holding.gainLossPercent),
    assetRatio: formatValue(holding.assetRatio),
  }));
};
