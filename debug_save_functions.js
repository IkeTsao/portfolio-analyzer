// 模擬測試資料
const testHolding = {
  id: "test1",
  symbol: "AAPL",
  name: "Apple Inc",
  quantity: 100,
  costBasis: 150,
  currentPrice: 175,
  currency: "USD",
  type: "stock"
};

const testExchangeRates = {
  USD: 31.5,
  EUR: 35.0,
  GBP: 40.0,
  CHF: 35.5,
  JPY: 0.22,
  timestamp: Date.now()
};

// HoldingsTable 的計算邏輯
function calculateHoldingsTable(holdings, exchangeRates) {
  let totalValue = 0;
  let totalCost = 0;
  
  holdings.forEach((holding) => {
    const quantity = holding.quantity || 0;
    const currentPrice = holding.currentPrice || 0;
    const costBasis = holding.costBasis || 0;
    const currency = holding.currency || 'TWD';
    
    // 獲取匯率（外幣對台幣）
    let exchangeRate = 1; // TWD 預設為 1
    if (currency === 'USD') {
      exchangeRate = exchangeRates.USD || 32.0;
    } else if (currency === 'EUR') {
      exchangeRate = exchangeRates.EUR || 35.0;
    } else if (currency === 'GBP') {
      exchangeRate = exchangeRates.GBP || 40.0;
    } else if (currency === 'CHF') {
      exchangeRate = exchangeRates.CHF || 35.5;
    } else if (currency === 'JPY') {
      exchangeRate = exchangeRates.JPY || 0.22;
    }
    
    // 轉換為台幣後加總
    const twdValue = quantity * currentPrice * exchangeRate;
    const twdCost = quantity * costBasis * exchangeRate;
    
    totalValue += twdValue;
    totalCost += twdCost;
    
    console.log(`HoldingsTable - ${holding.symbol}: ${quantity} * ${currentPrice} * ${exchangeRate} = ${twdValue}`);
  });
  
  return { totalValue, totalCost, totalGainLoss: totalValue - totalCost };
}

// HistoricalDataManager 的計算邏輯
function calculateHistoricalDataManager(data, exchangeRates) {
  let totalValue = 0;
  let totalCost = 0;
  
  data.forEach((holding) => {
    const quantity = holding.quantity || 0;
    const currentPrice = holding.currentPrice || 0;
    const costBasis = holding.costBasis || 0;
    const currency = holding.currency || 'TWD';

    // 獲取匯率（外幣對台幣）- 與 HoldingsTable 邏輯完全一致
    let exchangeRate = 1; // TWD 預設為 1
    if (currency === 'USD') {
      exchangeRate = exchangeRates?.USD || 32.0;
    } else if (currency === 'EUR') {
      exchangeRate = exchangeRates?.EUR || 35.0;
    } else if (currency === 'GBP') {
      exchangeRate = exchangeRates?.GBP || 40.0;
    } else if (currency === 'CHF') {
      exchangeRate = exchangeRates?.CHF || 35.5;
    } else if (currency === 'JPY') {
      exchangeRate = exchangeRates?.JPY || 0.22;
    }

    // 轉換為台幣後加總（與 HoldingsTable 邏輯完全一致）
    const twdValue = quantity * currentPrice * exchangeRate;
    const twdCost = quantity * costBasis * exchangeRate;

    totalValue += twdValue;
    totalCost += twdCost;
    
    console.log(`HistoricalDataManager - ${holding.symbol}: ${quantity} * ${currentPrice} * ${exchangeRate} = ${twdValue}`);
  });

  return { totalValue, totalCost, totalGainLoss: totalValue - totalCost };
}

// 測試
console.log("=== 測試計算邏輯 ===");
const result1 = calculateHoldingsTable([testHolding], testExchangeRates);
const result2 = calculateHistoricalDataManager([testHolding], testExchangeRates);

console.log("HoldingsTable 結果:", result1);
console.log("HistoricalDataManager 結果:", result2);
console.log("結果相同:", JSON.stringify(result1) === JSON.stringify(result2));
