# 持倉明細區域篩選功能

## 功能概述
為持倉明細表格新增了「區域」篩選選項，讓用戶可以按地理區域來篩選和查看投資持倉。

## 實現內容

### 1. 新增狀態管理
```typescript
const [regionFilter, setRegionFilter] = useState<string | null>(null);
const filteredHoldings = holdings
  .filter(holding => {
    const matchesSearch = !searchQuery || 
      holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holding.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !typeFilter || holding.type === typeFilter;
    const matchesAccount = !accountFilter || holding.accountId === accountFilter;
    const matchesRegion = !regionFilter || holding.market === regionFilter; // 新增
    
    return matchesSearch && matchesType && matchesAccount && matchesRegion;
  })
<Select
  placeholder="區域"
  value={regionFilter}
  onChange={setRegionFilter}
  data={[
    { value: '', label: '全部區域' },
    { value: 'US', label: '美國市場' },
    { value: 'TW', label: '台灣市場' },
    { value: 'OTHER', label: '其他市場' },
  ]}
  clearable
/>
export interface Holding {
  // ... 其他字段
  market: 'US' | 'TW' | 'OTHER'; // 市場分類
  // ... 其他字段
}

### 2. **`EXCHANGE_RATE_COMPONENT_UPDATED.md`**
```markdown
# 匯率元件更新說明

## 更新概述
改善了 ExchangeRateDisplay 元件的錯誤處理機制和備用匯率功能，確保即使在網路不穩定的情況下也能正常顯示匯率資訊。

## 主要改善內容

### 🔧 **API 調用改善**
- 使用完整 URL (`window.location.origin`) 而非相對路徑
- 添加 HTTP 狀態檢查和錯誤處理
- 檢查 API 回應的 `success` 狀態

### 🛡️ **強化錯誤處理**
- **個別貨幣錯誤處理**: 單一貨幣 API 失敗時使用備用匯率
- **全域錯誤處理**: 所有 API 都失敗時顯示完整備用數據
- **詳細錯誤日誌**: 記錄具體錯誤訊息便於除錯

### 💾 **備用匯率機制**
```typescript
const fallbackRates: { [key: string]: number } = {
  'USD': 31.5,  // 美金
  'EUR': 34.2,  // 歐元
  'GBP': 39.8,  // 英鎊
  'CHF': 35.1,  // 瑞士法郎
};
const response = await fetch(`${window.location.origin}/api/scrape-exchange-rate?from=${currency}&to=TWD`);

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
if (!data.success) {
  throw new Error(data.error || 'API returned unsuccessful response');
}
try {
  // API 調用
} catch (error) {
  console.error(`Error fetching ${currency} rate:`, error);
  // 使用備用匯率
  setRates(prev => ({
    ...prev,
    [currency]: fallbackRates[currency] || 30.0
  }));
}

### 3. **`UI_COMPONENTS_OVERVIEW.md`**
```markdown
# Portfolio Analyzer UI 元件總覽

## 核心元件概覽

### 1. 持倉表格 (HoldingsTable)
**檔案位置**: `components/HoldingsTable/HoldingsTable.tsx`

**主要功能**:
- 顯示所有投資持倉的詳細資訊
- 支援搜尋、篩選、排序功能
- 即時損益計算和顏色指示
- **新增**: 區域篩選器（美國市場、台灣市場、其他市場）

**篩選功能**:
- 搜尋框：按代碼或名稱搜尋
- 類型篩選：股票、基金、債券、黃金、數位貨幣、現金
- 帳戶篩選：Etrade、富邦銀行、玉山銀行
- 區域篩選：美國市場、台灣市場、其他市場 ⭐ **新增**

### 2. 投資組合統計網格 (PortfolioStatsGrid)
**檔案位置**: `components/PortfolioStatsGrid/PortfolioStatsGrid.tsx`

**主要功能**:
- 顯示總投資價值、成本、損益等關鍵指標
- 響應式卡片佈局
- 動態更新和載入狀態

### 3. 投資組合分布圖表 (PortfolioDistributionChart)
**檔案位置**: `components/PortfolioDistributionChart/PortfolioDistributionChart.tsx`

**主要功能**:
- 支援圓餅圖（金額分布）和直條圖（損益分布）
- 可按類型、帳戶、市場切換視圖
- 使用 Recharts 圖表庫

### 4. 主要佈局 (MainLayout)
**檔案位置**: `layouts/Main/MainLayout.tsx`

**主要功能**:
- 響應式佈局系統
- 動態側邊欄和主題自定義
- 支援桌面和行動裝置

### 5. 持倉表單 (HoldingForm)
**檔案位置**: `components/HoldingForm/HoldingForm.tsx`

**主要功能**:
- 新增和編輯投資持倉
- 完整的表單驗證
- 支援多種投資類型

### 6. 匯率顯示 (ExchangeRateDisplay)
**檔案位置**: `components/ExchangeRateDisplay/ExchangeRateDisplay.tsx`

**主要功能**:
- 即時顯示主要貨幣匯率
- 自動更新機制
- **改善**: 強化錯誤處理和備用匯率機制

## 技術特色

### 框架和庫
- **框架**: Next.js 14 + React 18 + TypeScript
- **UI 庫**: Mantine 7 (現代化元件庫)
- **圖表**: Recharts (響應式圖表)
- **表格**: mantine-datatable (功能豐富的數據表格)

### 設計特色
- **響應式設計**: 支援桌面和行動裝置
- **主題系統**: 支援深色/淺色主題
- **一致性**: 統一的設計語言和元件風格
- **可訪問性**: 遵循 WCAG 無障礙標準

### 狀態管理
- **本地狀態**: React useState 和 useEffect
- **數據持久化**: localStorage 本地存儲
- **即時更新**: 自動重新計算和更新

## 最新更新

### 區域篩選功能 ⭐ **新增**
- 在 HoldingsTable 中新增區域篩選器
- 支援按美國市場、台灣市場、其他市場篩選
- 與現有篩選器完美整合

### 刪除功能修復 🔧 **修復**
- 修復刪除持倉後無法立即生效的問題
- 改善 onRefresh 回調機制
- 確保所有相關 UI 元件同步更新

### 匯率元件改善 🛡️ **改善**
- 強化錯誤處理機制
- 添加備用匯率數據
- 改善網路連接問題的處理

## 開發最佳實踐

### 元件設計原則
- **單一職責**: 每個元件專注於特定功能
- **可重用性**: 元件設計考慮重用性
- **類型安全**: 完整的 TypeScript 類型定義
- **錯誤處理**: 優雅的錯誤處理和用戶反饋

### 性能優化
- **懶加載**: 按需載入元件和數據
- **記憶化**: 使用 React.memo 和 useMemo 優化渲染
- **虛擬化**: 大數據集的虛擬化渲染

### 測試策略
- **單元測試**: 元件邏輯測試
- **整合測試**: 元件間交互測試
- **端到端測試**: 完整用戶流程測試

所有元件都遵循現代 React 開發最佳實踐，具有完整的 TypeScript 類型支援和錯誤處理機制。
