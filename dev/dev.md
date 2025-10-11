Of course. Here is a complete `dev.md` file designed to be used with an AI code editor like Cursor.

You can copy the entire content below and save it as a file named `dev.md` in your project's root directory.

````markdown
# Objective

Implement a new tool named `convertCurrency` in our MCP server. This tool will take an amount, a source currency, and a target currency, and return the converted amount using real-time exchange rates from a free public API.

# Step 1: Choose a Free Currency API

We need a simple, free API that does not require an API key for basic use. We will use the **ExchangeRate-API**.

- **Endpoint URL**: `https://open.er-api.com/v6/latest/{BASE_CURRENCY}`
- **Example**: To get rates for USD, the URL is `https://open.er-api.com/v6/latest/USD`
- **Response Format**: It returns a JSON object with a `rates` key, which contains the conversion rates for other currencies.

Example JSON response for the USD endpoint:
```json
{
  "result": "success",
  "provider": "[https://www.exchangerate-api.com](https://www.exchangerate-api.com)",
  "documentation": "[https://www.exchangerate-api.com/docs/free](https://www.exchangerate-api.com/docs/free)",
  "terms_of_use": "[https://www.exchangerate-api.com/terms](https://www.exchangerate-api.com/terms)",
  "time_last_update_unix": 1667952001,
  "time_last_update_utc": "Wed, 09 Nov 2022 00:00:01 +0000",
  "time_next_update_unix": 1668038401,
  "time_next_update_utc": "Thu, 10 Nov 2022 00:00:01 +0000",
  "time_eol_unix": 0,
  "base_code": "USD",
  "rates": {
    "USD": 1,
    "AED": 3.6725,
    "AFN": 88.0434,
    "TWD": 31.952,
    "...": "..."
  }
}
````

# Step 2: Implement the Tool in `src/index.ts`

Modify the `src/index.ts` file to add the `convertCurrency` tool within the `init()` method of the `MyMCP` class.

The implementation should:

1.  Define the tool's name, description, and parameters using `zod`.
2.  The parameters will be `amount` (number), `from` (string), and `to` (string).
3.  The `handler` function will be `async`.
4.  Inside the handler, construct the API URL using the `from` currency.
5.  Use the `fetch` API to call the endpoint.
6.  Handle potential network errors (e.g., using a `try...catch` block).
7.  Parse the JSON response.
8.  Check if the API call was successful and if the target currency exists in the response.
9.  Calculate the converted amount.
10. Return a user-friendly string with the result.

Here is the code to be added:

```typescript
// Inside the init() method in src/index.ts

this.server.tool({
  name: "convertCurrency",
  description: "Converts an amount from one currency to another using real-time exchange rates.",
  parameters: z.object({
    amount: z.number().describe("The amount of money to convert."),
    from: z.string().describe("The 3-letter currency code to convert from (e.g., USD).").toUpperCase(),
    to: z.string().describe("The 3-letter currency code to convert to (e.g., TWD).").toUpperCase(),
  }),
  handler: async ({ amount, from, to }) => {
    try {
      const apiUrl = `https://open.er-api.com/v6/latest/${from}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        return `Error: Unable to fetch exchange rates. API returned status ${response.status}.`;
      }

      const data = await response.json();

      if (data.result !== 'success') {
        return `Error: The currency API reported an error: ${data['error-type']}`;
      }

      const rate = data.rates[to];
      if (!rate) {
        return `Error: The target currency code '${to}' was not found for the base currency '${from}'.`;
      }

      const convertedAmount = amount * rate;
      return `${amount} ${from} is approximately ${convertedAmount.toFixed(2)} ${to}.`;

    } catch (error) {
      console.error('Currency conversion failed:', error);
      return 'An unexpected error occurred while trying to convert the currency.';
    }
  },
});
```

# Step 3: Test the New Tool Locally

After adding the code, test the server locally to ensure the new tool is working correctly.

1.  Open your terminal in the project root.
2.  Run the local development server:
    ```bash
    npm start
    ```
3.  Open a **second terminal window**.
4.  Use the MCP Inspector to connect to your local server and test the tool:
    ```bash
    npx @modelcontextprotocol/inspector@latest http://localhost:8787/sse
    ```
5.  In the inspector, try calling the tool with a query like: `convert 150 USD to TWD`

# Step 4: Deploy the Server

Once local testing is successful, deploy the updated worker to Cloudflare.

1.  In your terminal, run the deploy command:
    ```bash
    npx wrangler deploy
    ```

After deployment, the `convertCurrency` tool will be live and accessible via your Cloudflare AI Playground or any other MCP client.

```
```

好的，這是一份為您整理的 `.md` 檔案，內容涵蓋了「AI 工具藍圖」和「免費運算服務探索」，可以作為您專案的整體規劃文件。

您可以將下方的所有內容複製並儲存為一個檔案，例如 `roadmap.md`。

-----

```markdown
# 專案藍圖：AI 工具與免費運算服務

這份文件規劃了我們想要打造的客製化 AI 工具，並探索了可用來部署這些工具的免費運算服務。

---

## Part 1: AI 工具藍圖 (AI Tool Blueprint)

此部分定義了我們希望 AI 具備的四種核心能力。

### 1. 連接真實世界 🌐
- **目標**：讓 AI 能從外部 API 獲取即時、動態的資料，成為我們觀察世界的窗口。
- **範例專案**：
    - `getWeather`：查詢指定城市目前的天氣 (例如：台北市現在天氣如何？)。
    - `getNews`：獲取特定主題的最新新聞頭條。
    - `getCryptoPrice`：查詢加密貨幣的即時價格 (例如：比特幣現在多少錢？)。
- **下一步想法**：
    - 尋找並收藏一些實用的免費 API (天氣、新聞、財經、地圖等)。
    - 設計更複雜的查詢，例如「幫我找尋台北市評價最高的牛肉麵店」。

### 2. 執行客製化計算 🧮
- **目標**：賦予 AI 特定的、超越基本數學的計算或資料處理能力。
- **範例專案**：
    - `convertCurrency`：(我們正在進行的專案) 轉換不同貨幣的金額。
    - `convertUnits`：在不同單位間轉換 (例如：公里轉英里、公斤轉磅)。
- **下一步想法**：
    - 建立一個能計算複雜時區轉換的工具。
    - 製作一個能根據輸入的身高體重計算 BMI 值的工具。

### 3. 與其他服務互動 📝
- **目標**：將 AI 打造成一個中樞，用來操作我們日常使用的其他應用程式。
- **範例專案**：
    - `addTodo`：在指定的待辦清單應用程式 (如 Todoist, Google Tasks) 中新增任務。
    - `createEvent`：在 Google Calendar 或其他日曆上建立一個新的行程。
- **下一步想法**：
    - 這個方向通常需要處理 OAuth 認證，是很好的進階練習。
    - 構思如何讓 AI 與您的筆記軟體 (如 Notion, Obsidian) 互動。

### 4. 開發者工具 💻
- **目標**：讓 AI 成為開發時的得力助手，自動化繁瑣的流程。
- **範例專案**：
    - `searchDocs`：當詢問函式用法時，自動去 MDN 或 NPM 網站查詢並回傳摘要。
    - `createFile`：在目前的專案目錄中建立指定的檔案或元件樣板。
    - `gitHelper`：輔助執行常用的 Git 指令，例如建立分支或查看日誌。
- **下一步想法**：
    - 思考在您自己的開發流程中，有哪些最耗時、最重複性的動作可以讓 AI 代勞。

---

## Part 2: 免費運算服務探索 (Exploring Free Compute Services)

此部分探索了幾個主流的免費平台，可用來部署我們的 AI 工具或其他應用程式。

### 1. Cloudflare Workers (我們目前使用的平台) 🖥️
- **簡介**：一個「邊緣運算」的 Serverless (無伺服器) 平台。您的程式碼會部署在全球數百個節點，因此反應速度極快。
- **強項**：API 後端、Webhook 處理、輕量級的全端應用。
- **免費方案**：每日 100,000 次免費請求，每次請求 CPU 運算時間限制較短 (10ms)。
- **最適合**：我們正在打造的 MCP 伺服器、API 服務、需要全球低延遲的應用。

### 2. Vercel / Netlify 🚀
- **簡介**：以部署前端框架 (如 Next.js, React) 聞名的平台，同時也提供強大的 Serverless Functions 功能。
- **強項**：整合式的開發與部署體驗 (CI/CD)、靜態網站託管、全端應用。
- **免費方案**：提供慷慨的網站託管流量、每月一定的 Serverless Functions 執行額度與時數。
- **最適合**：個人部落格、作品集網站、需要搭配前端介面的全端應用程式。

### 3. Railway / Fly.io 🚂
- **簡介**：新一代的 PaaS (平台即服務)，讓您可以直接部署容器 (Docker)。自由度比 Serverless Functions 更高。
- **強項**：可以運行幾乎任何語言或框架的後端應用、資料庫、長時間運行的服務 (如 Discord Bot)。
- **免費方案**：通常提供每月固定的免費運算額度 (例如 $5)，超出後才收費。資源用完前服務會暫停。
- **最適合**：需要運行 Docker 容器的專案、小型後端服務、聊天機器人。

### 4. Oracle Cloud (Always Free) ☁️
- **簡介**：傳統的雲端服務商，但提供了非常知名的「永久免費」方案，包含一台完整的虛擬主機 (VPS)。
- **強項**：擁有一台完整的 Linux 伺服器 root 權限，可以安裝任何您需要的軟體。
- **免費方案**：提供數台基於 ARM 架構的 VPS (CPU 和 RAM 規格不錯)、儲存空間和網路流量。
- **最適合**：需要長時間背景運行的程式、架設遊戲伺服器、需要完全掌控作業系統環境的專案。

---

## 結論與建議

對於我們目前「打造 AI 工具並部署 MCP 伺服器」的目標，**Cloudflare Workers 是最完美、最直接的選擇**。它的免費方案非常慷慨，部署流程簡單，並且效能極佳。

**建議：** 我們應該繼續專注於在 Cloudflare Workers 上開發和部署我們的 AI 工具。當未來我們的專案變得更複雜，例如需要一個搭配使用的網站介面時，就可以考慮 Vercel；如果需要運行一個容器化的後端服務時，就可以研究 Railway 或 Fly.io。
```