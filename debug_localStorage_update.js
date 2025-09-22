// 檢查 localStorage 更新和顯示問題

console.log("=== 檢查 localStorage 中的計算欄位 ===");

// 模擬檢查 localStorage 中的資料
const mockHolding = {
  id: "test",
  symbol: "AVAV", 
  quantity: 20,
  costBasis: 288.74,
  currentPrice: 278.55,
  currency: "USD",
  // 檢查是否有計算欄位
  currentValue: undefined,
  costValue: undefined,
  gainLoss: undefined,
  gainLossPercent: undefined,
  exchangeRate: undefined
};

console.log("原始 holding 資料:");
console.log(mockHolding);

console.log("\n=== 模擬 getHoldingDetails 更新流程 ===");

// 模擬計算邏輯
const quantity = 20;
const currentPrice = 278.55;
const costBasis = 288.74;
const exchangeRate = 32.0; // 假設匯率

const currentValue = quantity * currentPrice * exchangeRate;
const costValue = quantity * costBasis * exchangeRate;
const gainLoss = currentValue - costValue;
const gainLossPercent = costValue > 0 ? (gainLoss / costValue) * 100 : 0;

console.log("計算結果:");
console.log("currentValue:", currentValue);
console.log("costValue:", costValue);
console.log("gainLoss:", gainLoss);
console.log("gainLossPercent:", gainLossPercent);

// 模擬更新後的 holding
const updatedHolding = {
  ...mockHolding,
  currentValue,
  costValue,
  gainLoss,
  gainLossPercent,
  exchangeRate
};

console.log("\n=== 更新後的 holding 資料 ===");
console.log(updatedHolding);

console.log("\n=== 檢查顯示條件 ===");
console.log("currentValue !== undefined:", updatedHolding.currentValue !== undefined);
console.log("currentValue !== null:", updatedHolding.currentValue !== null);
console.log("gainLoss !== undefined:", updatedHolding.gainLoss !== undefined);
console.log("gainLoss !== null:", updatedHolding.gainLoss !== null);

console.log("\n=== 可能的問題 ===");
console.log("1. getHoldingDetails() 是否被正確呼叫？");
console.log("2. 計算結果是否正確儲存到 localStorage？");
console.log("3. React 狀態是否正確更新？");
console.log("4. HoldingsTable 是否使用正確的資料？");
