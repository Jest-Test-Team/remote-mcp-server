import app from "./app";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OAuthProvider from "@cloudflare/workers-oauth-provider";

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Demo",
		version: "1.0.0",
	});

	async init() {
		// 原有的數學工具
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// 新增的檔案創建工具
		this.server.tool(
			"createFile",
			{
				fileName: z.string().describe("檔案名稱（包含副檔名）"),
				template: z.enum([
					"react-component",
					"react-component-ts",
					"typescript-interface",
					"typescript-class", 
					"javascript-function",
					"typescript-function",
					"html-template",
					"css-stylesheet",
					"json-config",
					"markdown-doc",
					"gitignore",
					"package-json",
					"custom"
				]).describe("檔案樣板類型"),
				componentName: z.string().optional().describe("元件名稱（用於 React 元件）"),
				customContent: z.string().optional().describe("自定義內容（當 template 為 custom 時使用）"),
				options: z.object({
					includeStyles: z.boolean().optional().describe("是否包含樣式（React 元件）"),
					useTypeScript: z.boolean().optional().describe("是否使用 TypeScript"),
					includeTests: z.boolean().optional().describe("是否包含測試檔案"),
					framework: z.enum(["react", "vue", "angular", "vanilla"]).optional().describe("前端框架")
				}).optional().describe("額外選項")
			},
			async ({ fileName, template, componentName, customContent, options = {} }) => {
				try {
					const fileContent = this.generateFileContent(fileName, template, componentName, customContent, options);
					const fileExtension = fileName.split('.').pop() || '';
					
					return {
						content: [
							{
								type: "text",
								text: `✅ 成功生成檔案：${fileName}\n\n` +
									  `📄 檔案類型：${template}\n` +
									  `📁 建議路徑：${this.getSuggestedPath(template, fileName)}\n\n` +
									  `📋 檔案內容：\n\n` +
									  "```" + fileExtension + "\n" +
									  fileContent + "\n" +
									  "```\n\n" +
									  `💡 提示：請將上述內容儲存為 ${fileName} 檔案到您的專案目錄中。`
							}
						]
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `❌ 檔案生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
							}
						]
					};
				}
			}
		);

		// 天氣查詢工具
		this.server.tool(
			"getWeather",
			{
				city: z.string().describe("城市名稱（中文或英文）"),
				country: z.string().optional().describe("國家代碼（例如：TW, US, JP）"),
				units: z.enum(["metric", "imperial", "kelvin"]).optional().describe("溫度單位（公制/英制/開爾文）")
			},
			async ({ city, country, units = "metric" }) => {
				try {
					// 使用免費的 wttr.in API
					const location = country ? `${city},${country}` : city;
					const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
					
					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `❌ 無法獲取 ${city} 的天氣資訊。請確認城市名稱是否正確。`
							}]
						};
					}

					const data = await response.json();
					const current = data.current_condition[0];
					const today = data.weather[0];
					
					const temp = units === "imperial" ? 
						Math.round((parseFloat(current.temp_C) * 9/5) + 32) + "°F" :
						units === "kelvin" ?
						Math.round(parseFloat(current.temp_C) + 273.15) + "K" :
						current.temp_C + "°C";

					return {
						content: [{
							type: "text",
							text: `🌤️ **${city} 天氣資訊**\n\n` +
								  `🌡️ **目前溫度**：${temp}\n` +
								  `🌦️ **天氣狀況**：${current.weatherDesc[0].value}\n` +
								  `💨 **風速**：${current.windspeedKmph} km/h\n` +
								  `💧 **濕度**：${current.humidity}%\n` +
								  `👁️ **能見度**：${current.visibility} km\n` +
								  `🌅 **日出時間**：${today.astronomy[0].sunrise}\n` +
								  `🌇 **日落時間**：${today.astronomy[0].sunset}\n\n` +
								  `📊 **今日溫度範圍**：${today.mintempC}°C ~ ${today.maxtempC}°C`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 天氣查詢失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 新聞查詢工具
		this.server.tool(
			"getNews",
			{
				topic: z.string().describe("新聞主題或關鍵字"),
				category: z.enum(["general", "business", "technology", "science", "health", "sports", "entertainment"]).optional().describe("新聞分類"),
				limit: z.number().min(1).max(10).optional().describe("返回新聞數量（1-10）")
			},
			async ({ topic, category = "general", limit = 5 }) => {
				try {
					// 使用免費的 NewsAPI (公開端點)
					const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&pageSize=${limit}&language=zh`;
					
					// 由於 NewsAPI 需要 API 金鑰，我們使用替代方案 - 模擬新聞數據
					const mockNews = [
						{
							title: `${topic} 相關新聞：最新發展報導`,
							description: `關於 ${topic} 的最新動態與深度分析...`,
							url: "https://example.com/news1",
							publishedAt: new Date().toISOString(),
							source: { name: "科技新聞網" }
						},
						{
							title: `${topic} 市場趨勢分析`,
							description: `專家解讀 ${topic} 對市場的影響與未來展望...`,
							url: "https://example.com/news2", 
							publishedAt: new Date(Date.now() - 3600000).toISOString(),
							source: { name: "財經日報" }
						}
					];

					let newsText = `📰 **${topic} 相關新聞** (${category} 分類)\n\n`;
					
					mockNews.slice(0, limit).forEach((article, index) => {
						newsText += `**${index + 1}. ${article.title}**\n`;
						newsText += `📝 ${article.description}\n`;
						newsText += `🏢 來源：${article.source.name}\n`;
						newsText += `⏰ 發布時間：${new Date(article.publishedAt).toLocaleString('zh-TW')}\n`;
						newsText += `🔗 連結：${article.url}\n\n`;
					});

					return {
						content: [{
							type: "text",
							text: newsText + `💡 提示：這是模擬新聞數據。實際使用時請配置真實的新聞 API。`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 新聞查詢失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 加密貨幣價格查詢工具
		this.server.tool(
			"getCryptoPrice",
			{
				symbol: z.string().describe("加密貨幣代號（例如：bitcoin, ethereum, dogecoin）"),
				currency: z.string().optional().describe("法定貨幣（例如：usd, twd, eur）")
			},
			async ({ symbol, currency = "usd" }) => {
				try {
					// 使用免費的 CoinGecko API
					const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`;
					const response = await fetch(apiUrl);
					
					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `❌ 無法獲取 ${symbol} 的價格資訊。請確認貨幣代號是否正確。`
							}]
						};
					}

					const data = await response.json();
					const coinData = data[symbol.toLowerCase()];
					
					if (!coinData) {
						return {
							content: [{
								type: "text",
								text: `❌ 找不到 ${symbol} 的資訊。請使用正確的貨幣 ID（例如：bitcoin, ethereum）。`
							}]
						};
					}

					const price = coinData[currency];
					const change24h = coinData[`${currency}_24h_change`];
					const marketCap = coinData[`${currency}_market_cap`];
					
					const changeEmoji = change24h > 0 ? "📈" : change24h < 0 ? "📉" : "➡️";
					const changeColor = change24h > 0 ? "🟢" : change24h < 0 ? "🔴" : "⚪";

					return {
						content: [{
							type: "text",
							text: `💰 **${symbol.toUpperCase()} 價格資訊**\n\n` +
								  `💵 **目前價格**：${price.toLocaleString()} ${currency.toUpperCase()}\n` +
								  `${changeEmoji} **24小時變化**：${changeColor} ${change24h?.toFixed(2) || 0}%\n` +
								  `📊 **市值**：${marketCap ? marketCap.toLocaleString() : 'N/A'} ${currency.toUpperCase()}\n` +
								  `⏰ **更新時間**：${new Date().toLocaleString('zh-TW')}\n\n` +
								  `🔍 數據來源：CoinGecko API`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 加密貨幣價格查詢失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 單位轉換工具
		this.server.tool(
			"convertUnits",
			{
				value: z.number().describe("要轉換的數值"),
				fromUnit: z.string().describe("原始單位"),
				toUnit: z.string().describe("目標單位"),
				category: z.enum(["length", "weight", "temperature", "volume", "area", "speed"]).optional().describe("單位類別")
			},
			async ({ value, fromUnit, toUnit, category }) => {
				try {
					const result = this.performUnitConversion(value, fromUnit, toUnit);
					
					return {
						content: [{
							type: "text",
							text: `🔄 **單位轉換結果**\n\n` +
								  `📏 **原始值**：${value} ${fromUnit}\n` +
								  `📐 **轉換結果**：${result.value.toFixed(4)} ${toUnit}\n` +
								  `📊 **轉換係數**：1 ${fromUnit} = ${result.factor} ${toUnit}\n` +
								  `🏷️ **類別**：${result.category}\n\n` +
								  `💡 支援的轉換類別：長度、重量、溫度、體積、面積、速度`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 單位轉換失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n` +
								  `💡 請確認單位名稱是否正確。支援的單位包括：\n` +
								  `📏 長度：m, cm, mm, km, inch, ft, yard, mile\n` +
								  `⚖️ 重量：kg, g, lb, oz, ton\n` +
								  `🌡️ 溫度：celsius, fahrenheit, kelvin\n` +
								  `🥤 體積：liter, ml, gallon, cup\n` +
								  `📐 面積：sqm, sqft, acre\n` +
								  `🚗 速度：kmh, mph, ms`
						}]
					};
				}
			}
		);

		// 待辦事項工具
		this.server.tool(
			"addTodo",
			{
				title: z.string().describe("待辦事項標題"),
				description: z.string().optional().describe("詳細描述"),
				priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("優先級"),
				dueDate: z.string().optional().describe("截止日期（YYYY-MM-DD）"),
				category: z.string().optional().describe("分類標籤")
			},
			async ({ title, description, priority = "medium", dueDate, category }) => {
				try {
					const todoId = Math.random().toString(36).substr(2, 9);
					const createdAt = new Date().toLocaleString('zh-TW');
					
					const priorityEmoji = {
						low: "🟢",
						medium: "🟡", 
						high: "🟠",
						urgent: "🔴"
					}[priority];

					return {
						content: [{
							type: "text",
							text: `✅ **待辦事項已建立**\n\n` +
								  `📋 **標題**：${title}\n` +
								  `📝 **描述**：${description || '無'}\n` +
								  `${priorityEmoji} **優先級**：${priority.toUpperCase()}\n` +
								  `📅 **截止日期**：${dueDate || '未設定'}\n` +
								  `🏷️ **分類**：${category || '一般'}\n` +
								  `🆔 **任務ID**：${todoId}\n` +
								  `⏰ **建立時間**：${createdAt}\n\n` +
								  `💡 提示：這是模擬的待辦事項功能。實際使用時可整合 Todist、Notion 等服務。`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 建立待辦事項失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 日曆事件工具  
		this.server.tool(
			"createEvent",
			{
				title: z.string().describe("事件標題"),
				startTime: z.string().describe("開始時間（YYYY-MM-DD HH:MM）"),
				endTime: z.string().describe("結束時間（YYYY-MM-DD HH:MM）"),
				description: z.string().optional().describe("事件描述"),
				location: z.string().optional().describe("地點"),
				attendees: z.array(z.string()).optional().describe("參與者email列表")
			},
			async ({ title, startTime, endTime, description, location, attendees }) => {
				try {
					const eventId = Math.random().toString(36).substr(2, 9);
					const createdAt = new Date().toLocaleString('zh-TW');
					
					return {
						content: [{
							type: "text",
							text: `📅 **日曆事件已建立**\n\n` +
								  `📋 **標題**：${title}\n` +
								  `⏰ **開始時間**：${startTime}\n` +
								  `⏱️ **結束時間**：${endTime}\n` +
								  `📝 **描述**：${description || '無'}\n` +
								  `📍 **地點**：${location || '未指定'}\n` +
								  `👥 **參與者**：${attendees?.join(', ') || '無'}\n` +
								  `🆔 **事件ID**：${eventId}\n` +
								  `⏰ **建立時間**：${createdAt}\n\n` +
								  `💡 提示：這是模擬的日曆功能。實際使用時可整合 Google Calendar、Outlook 等服務。`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 建立日曆事件失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 技術文件搜尋工具
		this.server.tool(
			"searchDocs",
			{
				query: z.string().describe("搜尋關鍵字"),
				source: z.enum(["mdn", "npm", "github", "stackoverflow"]).describe("文件來源"),
				language: z.string().optional().describe("程式語言（用於過濾結果）")
			},  
			async ({ query, source, language }) => {
				try {
					let searchUrl = "";
					let results = "";

					switch (source) {
						case "mdn":
							searchUrl = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`;
							results = `🔍 **MDN 搜尋結果**\n\n` +
									 `📖 **搜尋關鍵字**：${query}\n` +
									 `🌐 **搜尋連結**：${searchUrl}\n\n` +
									 `📋 **常見結果類型**：\n` +
									 `• JavaScript API 文件\n` +
									 `• CSS 屬性說明\n` +
									 `• HTML 元素參考\n` +
									 `• Web API 指南\n\n`;
							break;

						case "npm":
							searchUrl = `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`;
							results = `📦 **NPM 搜尋結果**\n\n` +
									 `📖 **搜尋套件**：${query}\n` +
									 `🌐 **搜尋連結**：${searchUrl}\n\n` +
									 `📋 **搜尋提示**：\n` +
									 `• 查看套件的週下載量\n` +
									 `• 檢查最後更新時間\n` +
									 `• 查看 GitHub 星星數\n` +
									 `• 閱讀用戶評價和問題\n\n`;
							break;

						case "github":
							searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}${language ? `+language:${language}` : ''}`;
							results = `💻 **GitHub 搜尋結果**\n\n` +
									 `📖 **搜尋內容**：${query}\n` +
									 `🔤 **程式語言**：${language || '不限'}\n` +
									 `🌐 **搜尋連結**：${searchUrl}\n\n` +
									 `📋 **搜尋範圍**：\n` +
									 `• 程式碼庫 (Repositories)\n` +
									 `• 程式碼片段 (Code)\n` +
									 `• 問題討論 (Issues)\n` +
									 `• 使用者和組織\n\n`;
							break;

						case "stackoverflow":
							searchUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(query)}${language ? `+[${language}]` : ''}`;
							results = `❓ **Stack Overflow 搜尋結果**\n\n` +
									 `📖 **搜尋問題**：${query}\n` +
									 `🏷️ **相關標籤**：${language || '不限'}\n` +
									 `🌐 **搜尋連結**：${searchUrl}\n\n` +
									 `📋 **搜尋技巧**：\n` +
									 `• 查看問題的投票數\n` +
									 `• 優先查看已接受的答案\n` +
									 `• 注意答案的時效性\n` +
									 `• 查看相關問題\n\n`;
							break;
					}

					return {
						content: [{
							type: "text",
							text: results + `💡 點擊連結可直接前往搜尋頁面查看詳細結果。`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 文件搜尋失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);
	}

	private generateFileContent(
		fileName: string,
		template: string,
		componentName?: string,
		customContent?: string,
		options: any = {}
	): string {
		const name = componentName || fileName.split('.')[0];
		const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

		switch (template) {
			case "react-component":
				return this.generateReactComponent(capitalizedName, false, options);
			
			case "react-component-ts":
				return this.generateReactComponent(capitalizedName, true, options);
			
			case "typescript-interface":
				return this.generateTypeScriptInterface(capitalizedName);
			
			case "typescript-class":
				return this.generateTypeScriptClass(capitalizedName);
			
			case "javascript-function":
				return this.generateJavaScriptFunction(name);
			
			case "typescript-function":
				return this.generateTypeScriptFunction(name);
			
			case "html-template":
				return this.generateHTMLTemplate(name);
			
			case "css-stylesheet":
				return this.generateCSSStylesheet(name);
			
			case "json-config":
				return this.generateJSONConfig(fileName);
			
			case "markdown-doc":
				return this.generateMarkdownDoc(capitalizedName);
			
			case "gitignore":
				return this.generateGitignore();
			
			case "package-json":
				return this.generatePackageJson(name);
			
			case "custom":
				return customContent || "// 請提供自定義內容";
			
			default:
				throw new Error(`不支援的樣板類型：${template}`);
		}
	}

	private generateReactComponent(name: string, useTypeScript: boolean, options: any): string {
		const ext = useTypeScript ? 'tsx' : 'jsx';
		const propsType = useTypeScript ? `interface ${name}Props {\n  // 定義 props 類型\n}\n\n` : '';
		const propsParam = useTypeScript ? `props: ${name}Props` : 'props';
		
		return `${propsType}const ${name} = (${propsParam}) => {
  return (
    <div className="${name.toLowerCase()}">
      <h1>Hello from ${name}!</h1>
      {/* 在此添加您的元件內容 */}
    </div>
  );
};

export default ${name};
${options.includeStyles ? `\n// 對應的 CSS 檔案：${name}.module.css` : ''}`;
	}

	private generateTypeScriptInterface(name: string): string {
		return `export interface ${name} {
  id: string;
  name: string;
  createdAt: Date;
  // 在此添加更多屬性
}

// 使用範例：
// const example: ${name} = {
//   id: '1',
//   name: 'Example',
//   createdAt: new Date()
// };`;
	}

	private generateTypeScriptClass(name: string): string {
		return `export class ${name} {
  private _id: string;
  private _name: string;

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  // 在此添加更多方法
  public toString(): string {
    return \`${name} { id: \${this._id}, name: \${this._name} }\`;
  }
}`;
	}

	private generateJavaScriptFunction(name: string): string {
		return `/**
 * ${name} 函式描述
 * @param {any} param - 參數描述
 * @returns {any} 回傳值描述
 */
function ${name}(param) {
  // 在此實作函式邏輯
  return param;
}

// 導出函式
module.exports = ${name};

// 或使用 ES6 語法：
// export default ${name};`;
	}

	private generateTypeScriptFunction(name: string): string {
		return `/**
 * ${name} 函式描述
 * @param param - 參數描述
 * @returns 回傳值描述
 */
export function ${name}(param: any): any {
  // 在此實作函式邏輯
  return param;
}

// 或使用箭頭函式：
// export const ${name} = (param: any): any => {
//   return param;
// };`;
	}

	private generateHTMLTemplate(name: string): string {
		return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>${name}</h1>
    </header>
    
    <main>
        <section>
            <h2>主要內容</h2>
            <p>在此添加您的內容</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 ${name}. All rights reserved.</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>`;
	}

	private generateCSSStylesheet(name: string): string {
		return `/* ${name} 樣式表 */

/* 重置樣式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 基本樣式 */
body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
}

/* 標題樣式 */
h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  font-weight: 600;
}

/* 容器樣式 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* ${name.toLowerCase()} 專用樣式 */
.${name.toLowerCase()} {
  /* 在此添加您的自定義樣式 */
}`;
	}

	private generateJSONConfig(fileName: string): string {
		const configName = fileName.replace('.json', '');
		return `{
  "name": "${configName}",
  "version": "1.0.0",
  "description": "${configName} configuration file",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {}
}`;
	}

	private generateMarkdownDoc(name: string): string {
		return `# ${name}

## 概述

${name} 的簡要說明...

## 安裝

\`\`\`bash
# 安裝指令
npm install ${name.toLowerCase()}
\`\`\`

## 使用方法

\`\`\`javascript
// 使用範例
import ${name} from './${name.toLowerCase()}';

const instance = new ${name}();
\`\`\`

## API 文件

### 方法

#### \`methodName()\`

方法描述...

**參數：**
- \`param1\` (string): 參數描述

**回傳值：**
- (string): 回傳值描述

## 範例

\`\`\`javascript
// 完整範例
const example = new ${name}();
console.log(example.methodName('hello'));
\`\`\`

## 授權

MIT License`;
	}

	private generateGitignore(): string {
		return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Cache
.npm
.eslintcache

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity`;
	}

	private generatePackageJson(name: string): string {
		return `{
  "name": "${name.toLowerCase()}",
  "version": "0.1.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint . --ext .ts,.js",
    "lint:fix": "eslint . --ext .ts,.js --fix"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^4.9.0",
    "nodemon": "^2.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}`;
	}

	private getSuggestedPath(template: string, fileName: string): string {
		switch (template) {
			case "react-component":
			case "react-component-ts":
				return `src/components/${fileName}`;
			case "typescript-interface":
				return `src/types/${fileName}`;
			case "typescript-class":
				return `src/models/${fileName}`;
			case "javascript-function":
			case "typescript-function":
				return `src/utils/${fileName}`;
			case "html-template":
				return `public/${fileName}`;
			case "css-stylesheet":
				return `src/styles/${fileName}`;
			case "json-config":
				return fileName.includes('package') ? fileName : `config/${fileName}`;
			case "markdown-doc":
				return `docs/${fileName}`;
			case "gitignore":
				return ".gitignore";
			case "package-json":
				return "package.json";
			default:
				return `src/${fileName}`;
		}
	}

	private performUnitConversion(value: number, fromUnit: string, toUnit: string): { value: number; factor: number; category: string } {
		const conversions: Record<string, { [key: string]: number }> = {
			// 長度轉換 (基準單位: 公尺)
			length: {
				m: 1,
				meter: 1,
				cm: 0.01,
				centimeter: 0.01,
				mm: 0.001,
				millimeter: 0.001,
				km: 1000,
				kilometer: 1000,
				inch: 0.0254,
				in: 0.0254,
				ft: 0.3048,
				foot: 0.3048,
				feet: 0.3048,
				yard: 0.9144,
				yd: 0.9144,
				mile: 1609.344,
				mi: 1609.344
			},
			// 重量轉換 (基準單位: 公斤)
			weight: {
				kg: 1,
				kilogram: 1,
				g: 0.001,
				gram: 0.001,
				lb: 0.453592,
				pound: 0.453592,
				oz: 0.0283495,
				ounce: 0.0283495,
				ton: 1000,
				tonne: 1000
			},
			// 體積轉換 (基準單位: 公升)
			volume: {
				liter: 1,
				litre: 1,
				l: 1,
				ml: 0.001,
				milliliter: 0.001,
				gallon: 3.78541,
				gal: 3.78541,
				cup: 0.236588,
				pint: 0.473176,
				pt: 0.473176,
				quart: 0.946353,
				qt: 0.946353
			},
			// 面積轉換 (基準單位: 平方公尺)
			area: {
				sqm: 1,
				m2: 1,
				sqft: 0.092903,
				ft2: 0.092903,
				sqin: 0.00064516,
				in2: 0.00064516,
				acre: 4046.86,
				hectare: 10000,
				ha: 10000
			},
			// 速度轉換 (基準單位: 公尺每秒)
			speed: {
				ms: 1,
				mps: 1,
				kmh: 0.277778,
				kph: 0.277778,
				mph: 0.44704,
				fps: 0.3048,
				knot: 0.514444,
				kn: 0.514444
			}
		};

		// 溫度轉換需要特殊處理
		if (this.isTemperatureUnit(fromUnit) || this.isTemperatureUnit(toUnit)) {
			return this.convertTemperature(value, fromUnit, toUnit);
		}

		// 找到對應的轉換類別
		let category = '';
		let fromFactor = 0;
		let toFactor = 0;

		for (const [cat, units] of Object.entries(conversions)) {
			if (units[fromUnit.toLowerCase()] !== undefined && units[toUnit.toLowerCase()] !== undefined) {
				category = cat;
				fromFactor = units[fromUnit.toLowerCase()];
				toFactor = units[toUnit.toLowerCase()];
				break;
			}
		}

		if (category === '') {
			throw new Error(`不支援從 ${fromUnit} 轉換至 ${toUnit}`);
		}

		// 執行轉換: 先轉換到基準單位，再轉換到目標單位
		const baseValue = value * fromFactor;
		const convertedValue = baseValue / toFactor;
		const factor = fromFactor / toFactor;

		return {
			value: convertedValue,
			factor: factor,
			category: this.getCategoryName(category)
		};
	}

	private isTemperatureUnit(unit: string): boolean {
		const tempUnits = ['celsius', 'fahrenheit', 'kelvin', 'c', 'f', 'k'];
		return tempUnits.includes(unit.toLowerCase());
	}

	private convertTemperature(value: number, fromUnit: string, toUnit: string): { value: number; factor: number; category: string } {
		const from = fromUnit.toLowerCase();
		const to = toUnit.toLowerCase();
		let result = value;

		// 先轉換到攝氏度
		if (from === 'fahrenheit' || from === 'f') {
			result = (value - 32) * 5/9;
		} else if (from === 'kelvin' || from === 'k') {
			result = value - 273.15;
		}

		// 再從攝氏度轉換到目標單位
		if (to === 'fahrenheit' || to === 'f') {
			result = result * 9/5 + 32;
		} else if (to === 'kelvin' || to === 'k') {
			result = result + 273.15;
		}

		return {
			value: result,
			factor: 1, // 溫度轉換沒有簡單的係數
			category: '溫度'
		};
	}

	private getCategoryName(category: string): string {
		const names: Record<string, string> = {
			length: '長度',
			weight: '重量',
			volume: '體積',
			area: '面積',
			speed: '速度'
		};
		return names[category] || category;
	}
}

// Export the OAuth handler as the default
export default new OAuthProvider({
	apiRoute: "/sse",
	// TODO: fix these types
	apiHandler: MyMCP.mount("/sse"),
	// @ts-expect-error
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
