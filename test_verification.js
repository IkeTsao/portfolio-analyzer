#!/usr/bin/env node

/**
 * Portfolio Analyzer 修復驗證測試腳本
 * 自動化驗證最近的修復是否正常工作
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Portfolio Analyzer 修復驗證測試');
console.log('=====================================\n');

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// 測試工具函數
function runTest(testName, testFunction) {
  try {
    console.log(`🔍 測試: ${testName}`);
    const result = testFunction();
    if (result.success) {
      console.log(`✅ 通過: ${result.message}\n`);
      testResults.passed++;
      testResults.tests.push({ name: testName, status: 'PASSED', message: result.message });
    } else {
      console.log(`❌ 失敗: ${result.message}\n`);
      testResults.failed++;
      testResults.tests.push({ name: testName, status: 'FAILED', message: result.message });
    }
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}\n`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'ERROR', message: error.message });
  }
}

// 測試 1: TypeScript 類型定義檢查
function testTypeScriptTypes() {
  const typesFile = path.join(__dirname, 'types', 'portfolio.ts');
  
  if (!fs.existsSync(typesFile)) {
    return { success: false, message: 'types/portfolio.ts 文件不存在' };
  }
  
  const content = fs.readFileSync(typesFile, 'utf8');
  
  // 檢查是否包含 commodity 類型
  if (!content.includes("'commodity'")) {
    return { success: false, message: 'TypeScript 類型定義中缺少 commodity 類型' };
  }
  
  // 檢查 typeDistribution 是否包含 commodity
  if (!content.includes('commodity: { value: number; percentage: number };')) {
    return { success: false, message: 'typeDistribution 中缺少 commodity 屬性定義' };
  }
  
  // 檢查投資類型常數
  if (!content.includes("{ value: 'commodity', label: '大宗物資' }")) {
    return { success: false, message: 'INVESTMENT_TYPES 中缺少大宗物資定義' };
  }
  
  return { success: true, message: 'TypeScript 類型定義正確包含 commodity 類型' };
}

// 測試 2: 投資類別名稱更新檢查
function testInvestmentTypeLabels() {
  const typesFile = path.join(__dirname, 'types', 'portfolio.ts');
  const content = fs.readFileSync(typesFile, 'utf8');
  
  // 檢查更新後的標籤
  const expectedLabels = [
    "{ value: 'stock', label: '股票與ETF' }",
    "{ value: 'fund', label: '股票共同基金' }",
    "{ value: 'commodity', label: '大宗物資' }"
  ];
  
  for (const label of expectedLabels) {
    if (!content.includes(label)) {
      return { success: false, message: `缺少預期的標籤定義: ${label}` };
    }
  }
  
  return { success: true, message: '投資類別名稱已正確更新' };
}

// 測試 3: 匯率組件檢查
function testExchangeRateComponent() {
  const componentFile = path.join(__dirname, 'components', 'ExchangeRateDisplay', 'ExchangeRateDisplay.tsx');
  
  if (!fs.existsSync(componentFile)) {
    return { success: false, message: 'ExchangeRateDisplay 組件文件不存在' };
  }
  
  const content = fs.readFileSync(componentFile, 'utf8');
  
  // 檢查是否包含日圓相關代碼
  if (!content.includes('JPY') && !content.includes('日圓')) {
    return { success: false, message: 'ExchangeRateDisplay 組件中缺少日圓支援' };
  }
  
  return { success: true, message: 'ExchangeRateDisplay 組件包含日圓支援' };
}

// 測試 4: 價格服務邏輯檢查
function testPriceServiceLogic() {
  const serviceFile = path.join(__dirname, 'utils', 'priceService.ts');
  
  if (!fs.existsSync(serviceFile)) {
    return { success: false, message: 'priceService.ts 文件不存在' };
  }
  
  const content = fs.readFileSync(serviceFile, 'utf8');
  
  // 檢查更新後的邏輯
  if (!content.includes("holding.type !== 'cash'")) {
    return { success: false, message: '價格更新邏輯未正確修改為排除現金類型' };
  }
  
  return { success: true, message: '價格更新邏輯已正確修改' };
}

// 測試 5: 持倉表格組件檢查
function testHoldingsTableComponent() {
  const componentFile = path.join(__dirname, 'components', 'HoldingsTable', 'HoldingsTable.tsx');
  
  if (!fs.existsSync(componentFile)) {
    return { success: false, message: 'HoldingsTable 組件文件不存在' };
  }
  
  const content = fs.readFileSync(componentFile, 'utf8');
  
  // 檢查是否包含更新價格按鈕
  if (!content.includes('更新價格') && !content.includes('onUpdatePrices')) {
    return { success: false, message: 'HoldingsTable 組件中缺少更新價格按鈕' };
  }
  
  return { success: true, message: 'HoldingsTable 組件包含更新價格功能' };
}

// 測試 6: 投資組合計算檢查
function testPortfolioCalculations() {
  const calcFile = path.join(__dirname, 'utils', 'portfolioCalculations.ts');
  
  if (!fs.existsSync(calcFile)) {
    return { success: false, message: 'portfolioCalculations.ts 文件不存在' };
  }
  
  const content = fs.readFileSync(calcFile, 'utf8');
  
  // 檢查 typeDistribution 是否包含 commodity
  if (!content.includes('commodity: { value: 0, percentage: 0 }')) {
    return { success: false, message: 'portfolioCalculations 中 typeDistribution 缺少 commodity 初始化' };
  }
  
  return { success: true, message: 'portfolioCalculations 正確支援 commodity 類型' };
}

// 測試 7: 構建配置檢查
function testBuildConfiguration() {
  const nextConfigFile = path.join(__dirname, 'next.config.js');
  const packageJsonFile = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(nextConfigFile)) {
    return { success: false, message: 'next.config.js 文件不存在' };
  }
  
  if (!fs.existsSync(packageJsonFile)) {
    return { success: false, message: 'package.json 文件不存在' };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
  
  // 檢查必要的依賴
  const requiredDeps = ['next', 'react', 'typescript', '@mantine/core'];
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
      return { success: false, message: `缺少必要依賴: ${dep}` };
    }
  }
  
  return { success: true, message: '構建配置和依賴正確' };
}

// 執行所有測試
console.log('開始執行測試...\n');

runTest('TypeScript 類型定義檢查', testTypeScriptTypes);
runTest('投資類別名稱更新檢查', testInvestmentTypeLabels);
runTest('匯率組件檢查', testExchangeRateComponent);
runTest('價格服務邏輯檢查', testPriceServiceLogic);
runTest('持倉表格組件檢查', testHoldingsTableComponent);
runTest('投資組合計算檢查', testPortfolioCalculations);
runTest('構建配置檢查', testBuildConfiguration);

// 輸出測試結果
console.log('📊 測試結果摘要');
console.log('================');
console.log(`✅ 通過: ${testResults.passed}`);
console.log(`❌ 失敗: ${testResults.failed}`);
console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%\n`);

// 詳細結果
console.log('📋 詳細測試結果');
console.log('================');
testResults.tests.forEach((test, index) => {
  const status = test.status === 'PASSED' ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${test.name}`);
  console.log(`   ${test.message}\n`);
});

// 生成測試報告
const reportData = {
  timestamp: new Date().toISOString(),
  summary: {
    total: testResults.passed + testResults.failed,
    passed: testResults.passed,
    failed: testResults.failed,
    successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)
  },
  tests: testResults.tests
};

fs.writeFileSync(
  path.join(__dirname, 'test_report.json'),
  JSON.stringify(reportData, null, 2)
);

console.log('📄 測試報告已生成: test_report.json');

// 退出碼
process.exit(testResults.failed > 0 ? 1 : 0);

