// 模擬一個持倉資料
const holding = {
  id: "test",
  symbol: "AVAV",
  name: "Aero Vironment",
  quantity: 20,
  costBasis: 288.74,
  currentPrice: 283,
  currency: "USD",
  type: "stock"
};

// 模擬匯率資料
const exchangeRates = [
  {
    from: "USD",
    to: "TWD",
    rate: 30.31,
    timestamp: "2025-09-22T03:33:38.667Z"
  }
];

// 模擬計算邏輯
const quantity = holding.quantity || 0;
const currentPrice = holding.currentPrice || 0;
const costBasis = holding.costBasis || 0;
const currency = holding.currency || 'TWD';

// 獲取匯率
let exchangeRate = 1;
if (currency === 'USD') {
  const usdRate = exchangeRates.find(r => r.from === 'USD' && r.to === 'TWD');
  exchangeRate = usdRate ? usdRate.rate : 32.0;
}

// 計算市值和成本
const currentValue = quantity * currentPrice * exchangeRate;
const costValue = quantity * costBasis * exchangeRate;
const gainLoss = currentValue - costValue;

console.log("=== 計算結果 ===");
console.log("數量:", quantity);
console.log("現價:", currentPrice);
console.log("成本價:", costBasis);
console.log("匯率:", exchangeRate);
console.log("市值(台幣):", currentValue);
console.log("成本(台幣):", costValue);
console.log("損益(台幣):", gainLoss);

// 檢查是否為 undefined
console.log("\n=== 檢查 undefined ===");
console.log("currentValue !== undefined:", currentValue !== undefined);
console.log("currentValue !== null:", currentValue !== null);
console.log("gainLoss !== undefined:", gainLoss !== undefined);
console.log("gainLoss !== null:", gainLoss !== null);
