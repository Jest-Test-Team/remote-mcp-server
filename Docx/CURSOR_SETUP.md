# 在 Cursor 中使用 Remote MCP Server 指南

## 📋 前置需求

- Cursor 編輯器 (最新版本)
- 已部署的 MCP Server URL: `https://remote-mcp-server.pcleegood.workers.dev/sse`

## 🔧 配置步驟

### 1. 找到 Cursor 配置檔案

根據您的作業系統，配置檔案位置如下：

- **Windows**: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### 2. 編輯配置檔案

建立或編輯配置檔案，加入以下內容：

```json
{
  "mcpServers": {
    "remote-tools": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server.pcleegood.workers.dev/sse"
      ]
    }
  }
}
```

### 3. 重新啟動 Cursor

儲存配置檔案後，完全關閉並重新啟動 Cursor。

### 4. 驗證連接

重啟後，首次使用時會彈出瀏覽器視窗進行 OAuth 登入：

1. 輸入任意 email 和密碼（開發環境使用模擬認證）
2. 授權成功後，Cursor 將自動連接到您的 MCP Server
3. 在 Cursor 中，您應該能看到可用的工具圖示

## 🛠️ 可用工具列表

您的 MCP Server 提供以下 19 個工具：

### 📁 開發工具
- **createFile** - 快速創建各種程式碼檔案（React、TypeScript、HTML 等）
- **generateUUID** - 生成 UUID 識別碼
- **formatJSON** - JSON 格式化、壓縮、驗證
- **generateHash** - 計算雜湊值（MD5、SHA-256、SHA-512）
- **encodeDecodeBase64** - Base64 編解碼

### 🌐 API & 網路工具
- **getWeather** - 查詢即時天氣資訊
- **getCryptoPrice** - 查詢加密貨幣價格（使用 CoinGecko API）
- **checkWebsite** - 網站狀態檢查
- **generateQRCode** - 生成 QR 碼
- **getNews** - 新聞查詢（模擬數據）

### 🔧 實用工具
- **convertUnits** - 單位轉換（長度、重量、溫度等）
- **convertColor** - 顏色代碼轉換（HEX、RGB、HSL 等）
- **getTimezone** - 時區轉換
- **translateText** - 文字翻譯（模擬功能）
- **generatePassword** - 安全密碼生成

### 📝 生產力工具
- **addTodo** - 建立待辦事項
- **createEvent** - 建立日曆事件
- **searchDocs** - 搜尋技術文件（MDN、NPM、GitHub、Stack Overflow）

### 🧮 基礎工具
- **add** - 數字加法運算

## 💡 使用範例

### 在 Cursor 中對話範例：

**您：** "幫我創建一個 React TypeScript 元件叫做 UserProfile"

**Cursor（會自動調用 createFile 工具）：**
```typescript
// 創建 UserProfile.tsx...
interface UserProfileProps {
  // 定義 props 類型
}

const UserProfile = (props: UserProfileProps) => {
  // 元件邏輯
};

export default UserProfile;
```

---

**您：** "查詢台北的天氣"

**Cursor（會自動調用 getWeather 工具）：**
```
🌤️ 台北天氣資訊
🌡️ 目前溫度：26°C
🌦️ 天氣狀況：晴朗
💨 風速：15 km/h
...
```

---

**您：** "生成一個強密碼"

**Cursor（會自動調用 generatePassword 工具）：**
```
🔐 安全密碼生成
🔑 `xK9p#mN2vL8qW5t`
🟢 強度評分：5/5 (極強)
```

## 🐛 疑難排解

### 問題 1：無法連接到 MCP Server

**解決方案：**
```bash
# 1. 檢查 mcp-remote 是否已安裝
npx mcp-remote --version

# 2. 測試直接連接
npx mcp-remote https://remote-mcp-server.pcleegood.workers.dev/sse

# 3. 清除認證快取
rm -rf ~/.mcp-auth
```

### 問題 2：工具不顯示

**解決方案：**
1. 確認 Cursor 已完全重啟
2. 檢查 MCP Server 是否正常運行：訪問 `https://remote-mcp-server.pcleegood.workers.dev/`
3. 查看 Cursor 的開發者控制台（Help > Toggle Developer Tools）檢查錯誤訊息

### 問題 3：OAuth 認證失敗

**解決方案：**
1. 清除瀏覽器快取和 Cookie
2. 使用無痕模式重新登入
3. 檢查網路防火牆設定

## 🔍 進階使用

### 使用 MCP Inspector 測試工具

```bash
# 安裝並啟動 MCP Inspector
npx @modelcontextprotocol/inspector@latest

# 在瀏覽器中配置：
# Transport Type: SSE
# URL: https://remote-mcp-server.pcleegood.workers.dev/sse
```

### 本地開發與測試

```bash
# 克隆專案後
cd remote-mcp-server
npm install

# 本地開發
npm run dev

# 本地 URL: http://localhost:8787/sse
```

## 📚 相關資源

- [MCP 官方文件](https://modelcontextprotocol.io/)
- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [專案 GitHub](https://github.com/cloudflare/ai)

---

💡 **提示**：建議將此配置加入版本控制，團隊成員可以使用相同的 MCP Server。

