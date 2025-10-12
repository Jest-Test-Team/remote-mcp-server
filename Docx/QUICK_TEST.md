# 🚀 快速測試指南

## 方法 1：使用 MCP Inspector（推薦）

這是最簡單的測試方式：

```bash
# 安裝並啟動 MCP Inspector
npx @modelcontextprotocol/inspector@latest
```

然後在瀏覽器中（http://localhost:5173）：
1. Transport Type 選擇 `SSE`
2. URL 輸入：`https://remote-mcp-server.pcleegood.workers.dev/sse`
3. 點擊 "Connect"
4. 完成模擬登入（任意 email/password）
5. 測試調用工具

## 方法 2：使用命令行測試

```bash
# 直接連接到您的 MCP Server
npx mcp-remote https://remote-mcp-server.pcleegood.workers.dev/sse

# 連接後，您可以測試工具調用
```

## 方法 3：在 Cursor 中測試

配置完成後，在 Cursor 的聊天視窗中嘗試：

### 測試指令範例

```
1. "幫我查詢比特幣的價格"
   （測試 getCryptoPrice 工具）

2. "生成一個 UUID"
   （測試 generateUUID 工具）

3. "創建一個 React 元件叫 Button"
   （測試 createFile 工具）

4. "將 100 公斤轉換成磅"
   （測試 convertUnits 工具）

5. "查詢台北的天氣"
   （測試 getWeather 工具）

6. "生成一個 QR 碼，內容是 https://example.com"
   （測試 generateQRCode 工具）

7. "將 #FF5733 轉換成 RGB 格式"
   （測試 convertColor 工具）

8. "檢查 google.com 的網站狀態"
   （測試 checkWebsite 工具）
```

## ✅ 驗證清單

- [ ] MCP Inspector 能成功連接
- [ ] 可以看到所有 19 個可用工具
- [ ] 至少成功調用 3 個不同的工具
- [ ] Cursor 中能看到工具圖示
- [ ] Cursor 對話時能自動選擇合適的工具

## 🔧 如果遇到問題

### 檢查 Server 狀態

訪問：https://remote-mcp-server.pcleegood.workers.dev/

應該能看到歡迎頁面。

### 檢查 SSE 端點

```bash
curl -H "Accept: text/event-stream" https://remote-mcp-server.pcleegood.workers.dev/sse
```

### 清除快取

```bash
# Windows PowerShell
Remove-Item -Recurse -Force "$env:USERPROFILE\.mcp-auth"

# macOS/Linux
rm -rf ~/.mcp-auth
```

### 查看 Cloudflare Logs

```bash
# 在專案目錄中
wrangler tail remote-mcp-server
```

即時查看 Worker 的日誌輸出。

