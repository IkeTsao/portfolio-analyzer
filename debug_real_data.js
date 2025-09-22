// 檢查 localStorage 中的實際資料
console.log("=== 檢查 localStorage 資料 ===");

// 檢查持倉資料
const holdings = localStorage.getItem('portfolio_holdings');
if (holdings) {
  const holdingsData = JSON.parse(holdings);
  console.log("持倉數量:", holdingsData.length);
  if (holdingsData.length > 0) {
    console.log("第一個持倉:", holdingsData[0]);
  }
} else {
  console.log("沒有持倉資料");
}

// 檢查匯率資料
const exchangeRates = localStorage.getItem('portfolio_exchange_rates');
if (exchangeRates) {
  const ratesData = JSON.parse(exchangeRates);
  console.log("\n匯率數量:", ratesData.length);
  console.log("匯率資料:", ratesData);
} else {
  console.log("\n沒有匯率資料");
}

// 檢查歷史資料中的匯率
const historicalData = localStorage.getItem('portfolioHistoricalData');
if (historicalData) {
  const histData = JSON.parse(historicalData);
  console.log("\n歷史記錄數量:", histData.length);
  if (histData.length > 0) {
    const latest = histData[histData.length - 1];
    console.log("最新記錄日期:", latest.date);
    console.log("最新記錄匯率:", latest.exchangeRates);
  }
} else {
  console.log("\n沒有歷史資料");
}
