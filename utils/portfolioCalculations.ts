// 投資組合計算工具 - 收益計算、統計分析等

import { Holding, PortfolioStats, PriceData, ExchangeRate } from '@/types/portfolio';

// 計算單個持倉的當前價值
export const calculateHoldingValue = (
  holding: Holding,
  currentPrice: number,
  exchangeRate: number = 1
): {
  currentValue: number;
  costValue: number;
  gainLoss: number;
  gainLossPercent: number;
} => {
  // 統一轉換為台幣計算
  const costValueTWD = holding.quantity * holding.costBasis * exchangeRate;
  const currentValueTWD = holding.quantity * currentPrice * exchangeRate;
  const gainLoss = currentValueTWD - costValueTWD;
  const gainLossPercent = costValueTWD > 0 ? (gainLoss / costValueTWD) : 0;

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
  if (fromCurrency === toCurrency) {
    return 1;
  }

  console.log(`🔄 匯率轉換: ${fromCurrency} → ${toCurrency}`);

  // 如果目標是台幣，使用台銀即期賣出價
  if (toCurrency === 'TWD') {
    const rateMap: { [key: string]: number } = {
      'USD': 30.665,  // 台銀即期賣出價
      'EUR': 36.055,  // 台銀即期賣出價
      'GBP': 41.655,  // 台銀即期賣出價
      'CHF': 38.41,   // 台銀即期賣出價
      'JPY': 0.2089,  // 台銀即期賣出價 (1日圓)
      'CNY': 4.234,   // 台銀即期賣出價
      'HKD': 3.932,   // 台銀即期賣出價
      'SGD': 23.12,   // 台銀即期賣出價
      'AUD': 20.45,   // 台銀即期賣出價
      'CAD': 22.78,   // 台銀即期賣出價
    };
    
    const rate = rateMap[fromCurrency];
    if (rate) {
      console.log(`✅ 使用台銀即期賣出價: 1 ${fromCurrency} = ${rate} TWD`);
      return rate;
    }
  }

  // 如果來源是台幣，反向計算
  if (fromCurrency === 'TWD') {
    const rateMap: { [key: string]: number } = {
      'USD': 30.665,
      'EUR': 36.055,
      'GBP': 41.655,
      'CHF': 38.41,
      'JPY': 0.2089,
      'CNY': 4.234,
      'HKD': 3.932,
      'SGD': 23.12,
      'AUD': 20.45,
      'CAD': 22.78,
    };
    
    const rate = rateMap[toCurrency];
    if (rate) {
      const reverseRate = 1 / rate;
      console.log(`✅ 反向計算: 1 TWD = ${reverseRate} ${toCurrency}`);
      return reverseRate;
    }
  }

  // 嘗試使用傳入的匯率數據
  const directRate = exchangeRates.find(
    rate => rate.from === fromCurrency && rate.to === toCurrency
  );
  if (directRate) {
    console.log(`✅ 使用直接匯率: ${directRate.rate}`);
    return directRate.rate;
  }

  // 反向匹配
  const reverseRate = exchangeRates.find(
    rate => rate.from === toCurrency && rate.to === fromCurrency
  );
  if (reverseRate) {
    const rate = 1 / reverseRate.rate;
    console.log(`✅ 使用反向匯率: ${rate}`);
    return rate;
  }

  // 默認返回1（無法轉換）
  console.warn(`⚠️ 無法找到匯率: ${fromCurrency} → ${toCurrency}，使用預設值 1`);
  return 1;
};

// 計算投資組合統計
export const calculatePortfolioStats = (
  holdings: Holding[],
  priceData: PriceData[],
  exchangeRates: ExchangeRate[],
  baseCurrency: string = 'TWD'
): PortfolioStats => {
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
      exchangeRates
    );

    // 計算價值
    const { currentValue, costValue } = calculateHoldingValue(
      holding,
      currentPrice,
      exchangeRate
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

// 計算持倉詳細資訊（包含當前價格和收益）
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
    
    const exchangeRate = getExchangeRateForCurrency(
      holding.currency,
      baseCurrency,
      exchangeRates
    );

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

// 格式化貨幣顯示
export const formatCurrency = (
  amount: number,
  currency: string = 'TWD',
  decimals: number = 0
): string => {
  // 對於台幣顯示，去除NT前綴，不顯示小數點
  if (currency === 'TWD') {
    return amount.toLocaleString('en-US', {
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
  
  // 日圓通常不顯示小數點
  const displayDecimals = currency === 'JPY' ? 0 : decimals;
  
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: displayDecimals,
    maximumFractionDigits: displayDecimals,
  })}`;
};

// 格式化百分比顯示
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
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

