# 投資組合分析工具 - Vercel部署指南

## 🎯 動態功能升級完成

您的投資組合分析工具已成功升級為完整動態版本！

### ✅ 新增動態功能
- **實時價格更新**：通過API路由獲取最新股價，完全解決CORS問題
- **實時匯率更新**：自動獲取美金、歐元、英鎊、瑞士法郎對台幣匯率
- **Serverless API**：使用Next.js API Routes，無需額外後端服務器
- **工具提示優化**：損益顯示使用+/-符號，移除「獲利」「虧損」字樣

## 🚀 部署到Vercel（推薦）

### 方法一：GitHub自動部署
1. **創建GitHub倉庫**
   ```bash
   git init
   git add .
   git commit -m "投資組合分析工具 - 動態版本"
   git remote add origin https://github.com/你的用戶名/portfolio-analyzer.git
   git push -u origin main
   ```

2. **連接Vercel**
   - 訪問 [vercel.com](https://vercel.com)
   - 點擊「New Project」
   - 選擇GitHub倉庫
   - 點擊「Deploy」

3. **自動部署**
   - Vercel會自動檢測Next.js項目
   - 自動構建和部署
   - 獲得永久URL

### 方法二：Vercel CLI部署
```bash
# 安裝Vercel CLI
npm i -g vercel

# 登入Vercel
vercel login

# 部署項目
vercel --prod
```

### 方法三：拖拽部署
1. 將整個項目文件夾壓縮為ZIP
2. 訪問 [vercel.com/new](https://vercel.com/new)
3. 拖拽ZIP文件到頁面
4. 等待自動部署

## 📋 部署配置

項目已包含 `vercel.json` 配置文件：
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ]
}
```

## 🔧 API端點

部署後可用的API：
- `https://你的域名.vercel.app/api/stock-price?symbol=AAPL`
- `https://你的域名.vercel.app/api/exchange-rate`

## 🎯 部署後功能

### 完全解決的問題
✅ **CORS問題**：API路由在服務器端執行，無CORS限制
✅ **實時價格**：Yahoo Finance API正常工作
✅ **匯率更新**：自動獲取最新匯率
✅ **工具提示**：+283,912 / -15,000 格式顯示

### 保留的功能
✅ **手動輸入**：共同基金等仍可手動輸入現價
✅ **本地存儲**：數據隱私完全保護
✅ **響應式設計**：桌面和移動設備完美支持

## 💰 成本說明

### Vercel免費額度
- **帶寬**：100GB/月
- **函數執行**：100GB-小時/月
- **構建時間**：6000分鐘/月
- **域名**：免費 .vercel.app 子域名

### 對於個人使用
完全免費！您的投資組合工具使用量遠低於免費額度。

## 🔒 數據安全

- **本地存儲**：所有投資數據存儲在瀏覽器本地
- **無數據上傳**：投資信息不會發送到服務器
- **API代理**：僅代理公開的價格和匯率數據

## 📱 使用指南

1. **添加持倉**：點擊「新增持倉」按鈕
2. **更新價格**：點擊「更新價格」自動獲取最新數據
3. **手動輸入**：共同基金等可手動輸入現價
4. **查看分析**：圓餅圖和長條圖顯示投資分布

## 🎉 部署完成

部署成功後，您將獲得：
- 永久可訪問的URL
- 完整的動態功能
- 實時價格和匯率更新
- 專業級投資組合分析工具

**🚀 立即部署，享受完整的動態投資組合分析體驗！**

