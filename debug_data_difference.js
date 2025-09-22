// 模擬 holdings 原始資料
const rawHoldings = [
  {
    id: "test1",
    symbol: "AAPL",
    name: "Apple Inc",
    quantity: 100,
    costBasis: 150,
    currentPrice: 175,
    currency: "USD",
    type: "stock"
  }
];

// 模擬 getHoldingDetails() 處理後的資料
const processedHoldings = [
  {
    id: "test1",
    symbol: "AAPL",
    name: "Apple Inc",
    quantity: 100,
    costBasis: 150,
    currentPrice: 175,
    currency: "USD",
    type: "stock",
    // 額外的計算欄位
    exchangeRate: 31.5,
    currentValue: 551250,
    costValue: 472500,
    gainLoss: 78750,
    gainLossPercent: 16.67,
    priceChange: 0,
    priceChangePercent: 0,
    lastUpdated: "2024-09-17T10:00:00.000Z"
  }
];

console.log("=== 原始 holdings 資料 ===");
console.log(JSON.stringify(rawHoldings[0], null, 2));

console.log("\n=== getHoldingDetails() 處理後資料 ===");
console.log(JSON.stringify(processedHoldings[0], null, 2));

console.log("\n=== 差異分析 ===");
const rawKeys = Object.keys(rawHoldings[0]);
const processedKeys = Object.keys(processedHoldings[0]);

console.log("原始資料欄位:", rawKeys);
console.log("處理後資料欄位:", processedKeys);
console.log("額外欄位:", processedKeys.filter(key => !rawKeys.includes(key)));
