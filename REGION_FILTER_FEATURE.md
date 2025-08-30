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
