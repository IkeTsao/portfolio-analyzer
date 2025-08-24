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
  const costValue = holding.quantity * holding.costBasis;
  const currentValue = holding.quantity * currentPrice * exchangeRate;
  const gainLoss = currentValue - costValue;
  const gainLossPercent = costValue > 0 ? (gainLoss / costValue) : 0;

  return {
    currentValue,
    costValue,
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

  // 直接匹配
  const directRate = exchangeRates.find(
    rate => rate.from === fromCurrency && rate.to === toCurrency
  );
  if (directRate) {
    return directRate.rate;
  }

  // 反向匹配
  const reverseRate = exchangeRates.find(
    rate => rate.from === toCurrency && rate.to === fromCurrency
  );
  if (reverseRate) {
    return 1 / reverseRate.rate;
  }

  // 通過USD轉換
  const fromUsdRate = exchangeRates.find(
    rate => rate.from === 'USD' && rate.to === fromCurrency
  );
  const toUsdRate = exchangeRates.find(
    rate => rate.from === 'USD' && rate.to === toCurrency
  );

  if (fromUsdRate && toUsdRate) {
    return toUsdRate.rate / fromUsdRate.rate;
  }

  // 默認返回1（無法轉換）
  console.warn(`Cannot find exchange rate from ${fromCurrency} to ${toCurrency}`);
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
    // 獲取當前價格
    const price = priceData.find(p => p.symbol === holding.symbol);
    const currentPrice = price?.price || holding.costBasis; // 如果沒有價格數據，使用成本價

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

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    marketDistribution,
    typeDistribution,
    accountDistribution,
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
    const currentPrice = price?.price || holding.costBasis;
    
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
      priceChange: price?.change || 0,
      priceChangePercent: price?.changePercent || 0,
      lastUpdated: price?.timestamp,
    };
  });
};

// 格式化貨幣顯示
export const formatCurrency = (
  amount: number,
  currency: string = 'TWD',
  decimals: number = 2
): string => {
  const currencySymbols: { [key: string]: string } = {
    TWD: 'NT$',
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

