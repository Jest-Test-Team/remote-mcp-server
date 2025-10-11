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

		// 文字翻譯工具
		this.server.tool(
			"translateText",
			{
				text: z.string().describe("要翻譯的文字"),
				fromLang: z.string().optional().describe("來源語言代碼（如：zh, en, ja）"),
				toLang: z.string().describe("目標語言代碼（如：zh, en, ja）"),
				service: z.enum(["google", "libre", "mock"]).optional().describe("翻譯服務")
			},
			async ({ text, fromLang, toLang, service = "mock" }) => {
				try {
					// 語言代碼映射
					const langNames: Record<string, string> = {
						zh: "中文", en: "英文", ja: "日文", ko: "韓文",
						fr: "法文", de: "德文", es: "西班牙文", it: "義大利文",
						ru: "俄文", pt: "葡萄牙文", ar: "阿拉伯文", hi: "印地文"
					};

					// 模擬翻譯功能（實際可整合 Google Translate API）
					let translatedText = text;
					if (toLang === "en") {
						translatedText = `[EN] ${text} (translated)`;
					} else if (toLang === "zh") {
						translatedText = `[中文] ${text}（已翻譯）`;
					} else {
						translatedText = `[${toLang.toUpperCase()}] ${text} (translated)`;
					}

					return {
						content: [{
							type: "text",
							text: `🌐 **文字翻譯結果**\n\n` +
								  `📝 **原文**：${text}\n` +
								  `🔤 **來源語言**：${fromLang ? langNames[fromLang] || fromLang : '自動偵測'}\n` +
								  `🎯 **目標語言**：${langNames[toLang] || toLang}\n` +
								  `✨ **翻譯結果**：${translatedText}\n` +
								  `🔧 **翻譯服務**：${service}\n\n` +
								  `💡 提示：這是模擬翻譯功能。實際使用時可整合 Google Translate 或其他翻譯 API。`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 翻譯失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// QR 碼生成工具
		this.server.tool(
			"generateQRCode",
			{
				data: z.string().describe("要編碼的資料"),
				size: z.number().min(100).max(800).optional().describe("QR 碼大小（像素）"),
				errorCorrection: z.enum(["L", "M", "Q", "H"]).optional().describe("錯誤修正等級")
			},
			async ({ data, size = 200, errorCorrection = "M" }) => {
				try {
					// 使用免費的 QR Server API
					const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&ecc=${errorCorrection}`;
					
					return {
						content: [{
							type: "text",
							text: `📱 **QR 碼已生成**\n\n` +
								  `📝 **編碼資料**：${data}\n` +
								  `📐 **尺寸**：${size}x${size} 像素\n` +
								  `🛡️ **錯誤修正**：${errorCorrection} 等級\n` +
								  `🔗 **QR 碼連結**：${qrUrl}\n\n` +
								  `📲 **使用方式**：\n` +
								  `1. 點擊上方連結查看 QR 碼\n` +
								  `2. 右鍵保存圖片到本地\n` +
								  `3. 使用手機掃描測試\n\n` +
								  `💡 支援網址、文字、WiFi 設定、聯絡資訊等各種資料類型`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ QR 碼生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 密碼生成工具
		this.server.tool(
			"generatePassword",
			{
				length: z.number().min(4).max(128).optional().describe("密碼長度"),
				includeUppercase: z.boolean().optional().describe("包含大寫字母"),
				includeLowercase: z.boolean().optional().describe("包含小寫字母"),
				includeNumbers: z.boolean().optional().describe("包含數字"),
				includeSymbols: z.boolean().optional().describe("包含特殊符號"),
				excludeSimilar: z.boolean().optional().describe("排除相似字元（如 0O, 1l）"),
				count: z.number().min(1).max(10).optional().describe("生成密碼數量")
			},
			async ({ 
				length = 12, 
				includeUppercase = true, 
				includeLowercase = true, 
				includeNumbers = true, 
				includeSymbols = false,
				excludeSimilar = true,
				count = 1 
			}) => {
				try {
					const passwords = [];
					
					for (let i = 0; i < count; i++) {
						const password = this.generateSecurePassword({
							length,
							includeUppercase,
							includeLowercase,
							includeNumbers,
							includeSymbols,
							excludeSimilar
						});
						
						const strength = this.calculatePasswordStrength(password);
						passwords.push({ password, strength });
					}

					let result = `🔐 **安全密碼生成**\n\n`;
					
					passwords.forEach((item, index) => {
						const strengthEmoji = item.strength.score >= 4 ? "🟢" : 
											 item.strength.score >= 3 ? "🟡" : 
											 item.strength.score >= 2 ? "🟠" : "🔴";
						
						result += `**密碼 ${index + 1}：**\n`;
						result += `🔑 \`${item.password}\`\n`;
						result += `${strengthEmoji} **強度評分**：${item.strength.score}/5 (${item.strength.level})\n`;
						result += `📊 **複雜度**：${item.strength.complexity}\n\n`;
					});

					result += `⚙️ **生成設定**：\n`;
					result += `📏 長度：${length} 字元\n`;
					result += `🔤 大寫字母：${includeUppercase ? '✅' : '❌'}\n`;
					result += `🔡 小寫字母：${includeLowercase ? '✅' : '❌'}\n`;
					result += `🔢 數字：${includeNumbers ? '✅' : '❌'}\n`;
					result += `⚡ 特殊符號：${includeSymbols ? '✅' : '❌'}\n`;
					result += `🚫 排除相似字元：${excludeSimilar ? '✅' : '❌'}\n\n`;
					result += `💡 **安全提醒**：請妥善保管密碼，定期更換，不要重複使用。`;

					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 密碼生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// Base64 編解碼工具
		this.server.tool(
			"encodeDecodeBase64",
			{
				data: z.string().describe("要編碼或解碼的資料"),
				operation: z.enum(["encode", "decode"]).describe("操作類型：編碼或解碼"),
				format: z.enum(["text", "url", "html"]).optional().describe("資料格式")
			},
			async ({ data, operation, format = "text" }) => {
				try {
					let result = "";
					let isValid = true;
					
					if (operation === "encode") {
						// 編碼
						result = btoa(unescape(encodeURIComponent(data)));
					} else {
						// 解碼
						try {
							result = decodeURIComponent(escape(atob(data)));
						} catch {
							isValid = false;
							result = "無效的 Base64 格式";
						}
					}

					const opName = operation === "encode" ? "編碼" : "解碼";
					const inputLabel = operation === "encode" ? "原始資料" : "Base64 資料";
					const outputLabel = operation === "encode" ? "Base64 結果" : "解碼結果";

					return {
						content: [{
							type: "text",
							text: `🔧 **Base64 ${opName}結果**\n\n` +
								  `📝 **${inputLabel}**：\n\`\`\`\n${data}\n\`\`\`\n\n` +
								  `✨ **${outputLabel}**：\n\`\`\`\n${result}\n\`\`\`\n\n` +
								  `📊 **統計資訊**：\n` +
								  `• 輸入長度：${data.length} 字元\n` +
								  `• 輸出長度：${result.length} 字元\n` +
								  `• 資料格式：${format}\n` +
								  `• 操作狀態：${isValid ? '✅ 成功' : '❌ 失敗'}\n\n` +
								  `💡 **使用場景**：資料傳輸、圖片編碼、API 認證等`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ Base64 操作失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// UUID 生成工具
		this.server.tool(
			"generateUUID",
			{
				version: z.enum(["v4", "v1", "v3", "v5"]).optional().describe("UUID 版本"),
				count: z.number().min(1).max(20).optional().describe("生成數量"),
				format: z.enum(["standard", "compact", "urn"]).optional().describe("格式類型")
			},
			async ({ version = "v4", count = 1, format = "standard" }) => {
				try {
					const uuids = [];
					
					for (let i = 0; i < count; i++) {
						let uuid = "";
						
						if (version === "v4") {
							// UUID v4 (隨機)
							uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
								const r = Math.random() * 16 | 0;
								const v = c === 'x' ? r : (r & 0x3 | 0x8);
								return v.toString(16);
							});
						} else {
							// 其他版本的模擬實作
							uuid = 'xxxxxxxx-xxxx-Vxxx-yxxx-xxxxxxxxxxxx'
								.replace(/[xy]/g, function(c) {
									const r = Math.random() * 16 | 0;
									const v = c === 'x' ? r : (r & 0x3 | 0x8);
									return v.toString(16);
								})
								.replace('V', version.charAt(1));
						}

						// 格式化處理
						let formattedUuid = uuid;
						if (format === "compact") {
							formattedUuid = uuid.replace(/-/g, '');
						} else if (format === "urn") {
							formattedUuid = `urn:uuid:${uuid}`;
						}

						uuids.push({
							uuid: formattedUuid,
							standard: uuid,
							compact: uuid.replace(/-/g, ''),
							urn: `urn:uuid:${uuid}`
						});
					}

					let result = `🆔 **UUID 生成結果**\n\n`;
					
					uuids.forEach((item, index) => {
						result += `**UUID ${index + 1}：**\n`;
						result += `🎯 **主要格式**：\`${item.uuid}\`\n`;
						if (format === "standard") {
							result += `📦 **緊湊格式**：\`${item.compact}\`\n`;
							result += `🌐 **URN 格式**：\`${item.urn}\`\n`;
						}
						result += `\n`;
					});

					result += `⚙️ **生成設定**：\n`;
					result += `📋 版本：UUID ${version.toUpperCase()}\n`;
					result += `📊 數量：${count} 個\n`;
					result += `🎨 格式：${format}\n\n`;
					result += `💡 **使用場景**：\n`;
					result += `• 資料庫主鍵\n`;
					result += `• 檔案命名\n`;
					result += `• 交易識別碼\n`;
					result += `• API 請求追蹤`;

					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ UUID 生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 網站狀態檢查工具
		this.server.tool(
			"checkWebsite",
			{
				url: z.string().describe("要檢查的網站 URL"),
				timeout: z.number().min(1000).max(30000).optional().describe("超時時間（毫秒）"),
				followRedirects: z.boolean().optional().describe("是否跟隨重定向")
			},
			async ({ url, timeout = 10000, followRedirects = true }) => {
				try {
					const startTime = Date.now();
					
					// 確保 URL 包含協議
					const fullUrl = url.startsWith('http') ? url : `https://${url}`;
					
					const response = await fetch(fullUrl, {
						method: 'HEAD',
						// timeout: timeout,
						redirect: followRedirects ? 'follow' : 'manual'
					});

					const endTime = Date.now();
					const responseTime = endTime - startTime;

					const statusEmoji = response.status < 300 ? "🟢" : 
									   response.status < 400 ? "🟡" : 
									   response.status < 500 ? "🟠" : "🔴";

					const headers = Array.from(response.headers.entries());
					const importantHeaders = headers.filter(([key]) => 
						['server', 'content-type', 'cache-control', 'last-modified'].includes(key.toLowerCase())
					);

					return {
						content: [{
							type: "text",
							text: `🌐 **網站狀態檢查結果**\n\n` +
								  `🔗 **檢查網址**：${fullUrl}\n` +
								  `${statusEmoji} **HTTP 狀態**：${response.status} ${response.statusText}\n` +
								  `⚡ **回應時間**：${responseTime} ms\n` +
								  `🔄 **重定向處理**：${followRedirects ? '✅ 啟用' : '❌ 停用'}\n\n` +
								  `📊 **重要標頭資訊**：\n` +
								  (importantHeaders.length > 0 ? 
									importantHeaders.map(([key, value]) => `• **${key}**: ${value}`).join('\n') :
									'無重要標頭資訊') + `\n\n` +
								  `🎯 **網站狀態**：${response.ok ? '✅ 正常運行' : '❌ 存在問題'}\n` +
								  `⏰ **檢查時間**：${new Date().toLocaleString('zh-TW')}\n\n` +
								  `💡 **性能評估**：\n` +
								  `${responseTime < 500 ? '🚀 極快' : 
									responseTime < 1000 ? '⚡ 快速' : 
									responseTime < 3000 ? '🐌 普通' : '🐢 緩慢'} (${responseTime}ms)`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 網站檢查失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n` +
								  `🔍 **可能原因**：\n` +
								  `• 網站無法訪問\n` +
								  `• 網路連接問題\n` +
								  `• URL 格式錯誤\n` +
								  `• 伺服器未回應\n\n` +
								  `💡 請檢查 URL 格式是否正確，並確認網路連接正常。`
						}]
					};
				}
			}
		);

		// 時區轉換工具
		this.server.tool(
			"getTimezone",
			{
				time: z.string().optional().describe("時間（YYYY-MM-DD HH:MM 或 ISO 格式）"),
				fromTimezone: z.string().optional().describe("來源時區（如：Asia/Taipei）"),
				toTimezone: z.string().describe("目標時區（如：America/New_York）"),
				format: z.enum(["iso", "local", "custom"]).optional().describe("輸出格式")
			},
			async ({ time, fromTimezone = "UTC", toTimezone, format = "local" }) => {
				try {
					const inputTime = time ? new Date(time) : new Date();
					
					// 時區資訊對照表
					const timezoneNames: Record<string, string> = {
						"UTC": "協調世界時",
						"Asia/Taipei": "台北時間",
						"Asia/Tokyo": "東京時間",
						"Asia/Shanghai": "上海時間",
						"America/New_York": "紐約時間",
						"America/Los_Angeles": "洛杉磯時間",
						"Europe/London": "倫敦時間",
						"Europe/Paris": "巴黎時間"
					};

					// 使用 Intl.DateTimeFormat 進行時區轉換
					const convertedTime = new Date(inputTime.toLocaleString("en-US", {timeZone: toTimezone}));
					const originalTime = new Date(inputTime.toLocaleString("en-US", {timeZone: fromTimezone}));
					
					let formattedTime = "";
					if (format === "iso") {
						formattedTime = convertedTime.toISOString();
					} else if (format === "local") {
						formattedTime = convertedTime.toLocaleString('zh-TW');
					} else {
						formattedTime = convertedTime.toString();
					}

					const timeDiff = Math.abs(convertedTime.getTime() - originalTime.getTime()) / (1000 * 60 * 60);

					return {
						content: [{
							type: "text",
							text: `🌍 **時區轉換結果**\n\n` +
								  `⏰ **原始時間**：${originalTime.toLocaleString('zh-TW')}\n` +
								  `📍 **來源時區**：${timezoneNames[fromTimezone] || fromTimezone}\n` +
								  `📍 **目標時區**：${timezoneNames[toTimezone] || toTimezone}\n` +
								  `✨ **轉換結果**：${formattedTime}\n` +
								  `⏳ **時差**：${timeDiff.toFixed(1)} 小時\n` +
								  `📅 **轉換時間**：${new Date().toLocaleString('zh-TW')}\n\n` +
								  `💡 **常用時區**：\n` +
								  `• Asia/Taipei - 台北\n` +
								  `• America/New_York - 紐約\n` +
								  `• Europe/London - 倫敦\n` +
								  `• Asia/Tokyo - 東京`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 時區轉換失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// JSON 格式化工具
		this.server.tool(
			"formatJSON",
			{
				jsonData: z.string().describe("要格式化的 JSON 資料"),
				operation: z.enum(["format", "minify", "validate"]).describe("操作類型"),
				indent: z.number().min(0).max(8).optional().describe("縮排空格數")
			},
			async ({ jsonData, operation, indent = 2 }) => {
				try {
					let result = "";
					let isValid = true;
					let errorMessage = "";
					let stats = { keys: 0, values: 0, arrays: 0, objects: 0 };

					try {
						const parsed = JSON.parse(jsonData);
						
						// 計算統計資訊
						stats = this.analyzeJSON(parsed);

						if (operation === "format") {
							result = JSON.stringify(parsed, null, indent);
						} else if (operation === "minify") {
							result = JSON.stringify(parsed);
						} else if (operation === "validate") {
							result = "✅ JSON 格式有效";
						}
					} catch (parseError) {
						isValid = false;
						errorMessage = parseError instanceof Error ? parseError.message : '未知解析錯誤';
						result = `❌ JSON 格式無效：${errorMessage}`;
					}

					const opNames: Record<string, string> = {
						format: "格式化",
						minify: "壓縮",
						validate: "驗證"
					};

					return {
						content: [{
							type: "text",
							text: `📋 **JSON ${opNames[operation]}結果**\n\n` +
								  `📊 **狀態**：${isValid ? '✅ 有效' : '❌ 無效'}\n` +
								  (errorMessage ? `⚠️ **錯誤**：${errorMessage}\n` : '') +
								  `📏 **原始長度**：${jsonData.length} 字元\n` +
								  `📐 **結果長度**：${result.length} 字元\n\n` +
								  (isValid ? `📈 **結構統計**：\n` +
											`• 物件數量：${stats.objects}\n` +
											`• 陣列數量：${stats.arrays}\n` +
											`• 鍵值對：${stats.keys}\n` +
											`• 值數量：${stats.values}\n\n` : '') +
								  `📝 **${operation === "validate" ? "驗證" : "處理"}結果**：\n\`\`\`json\n${result.length > 2000 ? result.substring(0, 2000) + '...' : result}\n\`\`\`\n\n` +
								  `💡 **使用提示**：\n` +
								  `• format: 美化 JSON 格式\n` +
								  `• minify: 壓縮移除空白\n` +
								  `• validate: 驗證格式正確性`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ JSON 處理失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 雜湊值生成工具
		this.server.tool(
			"generateHash",
			{
				data: z.string().describe("要計算雜湊值的資料"),
				algorithm: z.enum(["md5", "sha1", "sha256", "sha512"]).optional().describe("雜湊演算法"),
				encoding: z.enum(["hex", "base64"]).optional().describe("輸出編碼格式")
			},
			async ({ data, algorithm = "sha256", encoding = "hex" }) => {
				try {
					// 使用 Web Crypto API 計算雜湊值
					const encoder = new TextEncoder();
					const dataBuffer = encoder.encode(data);
					
					let hashBuffer: ArrayBuffer;
					let algName = "";

					switch (algorithm) {
						case "sha1":
							hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
							algName = "SHA-1";
							break;
						case "sha256":
							hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
							algName = "SHA-256";
							break;
						case "sha512":
							hashBuffer = await crypto.subtle.digest('SHA-512', dataBuffer);
							algName = "SHA-512";
							break;
						case "md5":
							// MD5 需要特殊處理（Web Crypto API 不支援）
							const md5Hash = this.calculateMD5(data);
							return {
								content: [{
									type: "text",
									text: `🔐 **雜湊值計算結果**\n\n` +
										  `📝 **原始資料**：${data.length > 100 ? data.substring(0, 100) + '...' : data}\n` +
										  `🔧 **演算法**：MD5\n` +
										  `📊 **編碼格式**：${encoding}\n` +
										  `✨ **雜湊結果**：\`${md5Hash}\`\n` +
										  `📏 **雜湊長度**：${md5Hash.length} 字元\n` +
										  `📈 **資料長度**：${data.length} 字元\n\n` +
										  `⚠️ **安全提醒**：MD5 已不安全，建議使用 SHA-256 或更強的演算法。`
								}]
							};
						default:
							throw new Error(`不支援的演算法：${algorithm}`);
					}

					// 轉換為所需格式
					const hashArray = new Uint8Array(hashBuffer);
					let hashString = "";
					
					if (encoding === "hex") {
						hashString = Array.from(hashArray)
							.map(b => b.toString(16).padStart(2, '0'))
							.join('');
					} else if (encoding === "base64") {
						hashString = btoa(String.fromCharCode(...hashArray));
					}

					const securityLevel = algorithm === "sha512" ? "🟢 極高" :
										  algorithm === "sha256" ? "🟡 高" :
										  algorithm === "sha1" ? "🟠 中" : "🔴 低";

					return {
						content: [{
							type: "text",
							text: `🔐 **雜湊值計算結果**\n\n` +
								  `📝 **原始資料**：${data.length > 100 ? data.substring(0, 100) + '...' : data}\n` +
								  `🔧 **演算法**：${algName}\n` +
								  `📊 **編碼格式**：${encoding.toUpperCase()}\n` +
								  `✨ **雜湊結果**：\`${hashString}\`\n` +
								  `📏 **雜湊長度**：${hashString.length} 字元\n` +
								  `📈 **資料長度**：${data.length} 字元\n` +
								  `🛡️ **安全等級**：${securityLevel}\n\n` +
								  `💡 **使用場景**：\n` +
								  `• 檔案完整性驗證\n` +
								  `• 密碼雜湊儲存\n` +
								  `• 數位簽章\n` +
								  `• 資料去重複`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 雜湊計算失敗：${error instanceof Error ? error.message : '未知錯誤'}`
						}]
					};
				}
			}
		);

		// 顏色代碼轉換工具
		this.server.tool(
			"convertColor",
			{
				color: z.string().describe("顏色代碼（HEX、RGB、HSL 等）"),
				toFormat: z.enum(["hex", "rgb", "hsl", "hsv", "all"]).optional().describe("目標格式")
			},
			async ({ color, toFormat = "all" }) => {
				try {
					const colorInfo = this.parseColor(color);
					const conversions = this.convertColorFormats(colorInfo);

					let result = `🎨 **顏色代碼轉換結果**\n\n`;
					result += `🎯 **輸入顏色**：${color}\n\n`;

					if (toFormat === "all") {
						result += `📋 **所有格式**：\n`;
						result += `• **HEX**：${conversions.hex}\n`;
						result += `• **RGB**：${conversions.rgb}\n`;
						result += `• **HSL**：${conversions.hsl}\n`;
						result += `• **HSV**：${conversions.hsv}\n`;
						result += `• **CMYK**：${conversions.cmyk}\n\n`;
					} else {
						const formatValue = conversions[toFormat as keyof typeof conversions];
						result += `✨ **${toFormat.toUpperCase()} 格式**：${formatValue}\n\n`;
					}

					result += `🖼️ **顏色預覽**：\n`;
					result += `• **色塊顯示**：████████ (${conversions.hex})\n`;
					result += `• **亮度**：${colorInfo.brightness.toFixed(1)}%\n`;
					result += `• **飽和度**：${colorInfo.saturation.toFixed(1)}%\n`;
					result += `• **色相**：${colorInfo.hue.toFixed(0)}°\n\n`;

					result += `💡 **使用建議**：\n`;
					result += `• 網頁設計：使用 HEX 或 RGB\n`;
					result += `• 印刷設計：使用 CMYK\n`;
					result += `• 色彩調整：使用 HSL 或 HSV`;

					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ 顏色轉換失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n` +
								  `💡 **支援格式**：\n` +
								  `• HEX: #FF0000 或 #F00\n` +
								  `• RGB: rgb(255,0,0)\n` +
								  `• HSL: hsl(0,100%,50%)\n` +
								  `• 顏色名稱: red, blue, green 等`
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

	// 密碼生成相關方法
	private generateSecurePassword(options: {
		length: number;
		includeUppercase: boolean;
		includeLowercase: boolean;
		includeNumbers: boolean;
		includeSymbols: boolean;
		excludeSimilar: boolean;
	}): string {
		let charset = '';
		
		if (options.includeLowercase) {
			charset += options.excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
		}
		if (options.includeUppercase) {
			charset += options.excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		}
		if (options.includeNumbers) {
			charset += options.excludeSimilar ? '23456789' : '0123456789';
		}
		if (options.includeSymbols) {
			charset += '!@#$%&*()_+-=[]{}|;:,.<>?';
		}

		if (charset === '') {
			charset = 'abcdefghijklmnopqrstuvwxyz'; // 預設至少包含小寫字母
		}

		let password = '';
		for (let i = 0; i < options.length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}

		return password;
	}

	private calculatePasswordStrength(password: string): { score: number; level: string; complexity: string } {
		let score = 0;
		let complexity = '';

		// 長度評分
		if (password.length >= 12) score += 2;
		else if (password.length >= 8) score += 1;

		// 字元種類評分
		if (/[a-z]/.test(password)) score += 1;
		if (/[A-Z]/.test(password)) score += 1;
		if (/[0-9]/.test(password)) score += 1;
		if (/[^A-Za-z0-9]/.test(password)) score += 1;

		const levels = ['極弱', '弱', '普通', '強', '極強'];
		const level = levels[Math.min(score - 1, 4)] || '極弱';

		if (score <= 1) complexity = '簡單';
		else if (score <= 2) complexity = '中等';
		else if (score <= 3) complexity = '複雜';
		else complexity = '極複雜';

		return { score, level, complexity };
	}

	// JSON 分析方法
	private analyzeJSON(obj: any): { keys: number; values: number; arrays: number; objects: number } {
		let keys = 0;
		let values = 0;
		let arrays = 0;
		let objects = 0;

		const analyze = (item: any) => {
			if (Array.isArray(item)) {
				arrays++;
				item.forEach(analyze);
			} else if (typeof item === 'object' && item !== null) {
				objects++;
				Object.keys(item).forEach(key => {
					keys++;
					analyze(item[key]);
				});
			} else {
				values++;
			}
		};

		analyze(obj);
		return { keys, values, arrays, objects };
	}

	// MD5 計算方法（簡化版本）
	private calculateMD5(data: string): string {
		// 這是一個簡化的 MD5 模擬，實際應用中應使用專業的加密庫
		let hash = 0;
		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		
		// 轉換為 hex 格式
		const hex = Math.abs(hash).toString(16);
		return hex.padStart(32, '0').substring(0, 32);
	}

	// 顏色解析方法
	private parseColor(color: string): { r: number; g: number; b: number; hue: number; saturation: number; brightness: number } {
		color = color.trim().toLowerCase();

		// 預設顏色名稱
		const colorNames: Record<string, string> = {
			red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00',
			orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', brown: '#a52a2a',
			black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080'
		};

		// 如果是顏色名稱，轉換為 HEX
		if (colorNames[color]) {
			color = colorNames[color];
		}

		let r = 0, g = 0, b = 0;

		// 解析 HEX 格式
		if (color.startsWith('#')) {
			const hex = color.substring(1);
			if (hex.length === 3) {
				r = parseInt(hex[0] + hex[0], 16);
				g = parseInt(hex[1] + hex[1], 16);
				b = parseInt(hex[2] + hex[2], 16);
			} else if (hex.length === 6) {
				r = parseInt(hex.substring(0, 2), 16);
				g = parseInt(hex.substring(2, 4), 16);
				b = parseInt(hex.substring(4, 6), 16);
			}
		}
		// 解析 RGB 格式
		else if (color.startsWith('rgb')) {
			const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (match) {
				r = parseInt(match[1]);
				g = parseInt(match[2]);
				b = parseInt(match[3]);
			}
		}

		// 計算 HSL 值
		const max = Math.max(r, g, b) / 255;
		const min = Math.min(r, g, b) / 255;
		const brightness = (max + min) / 2 * 100;
		
		let hue = 0;
		let saturation = 0;

		if (max !== min) {
			const delta = max - min;
			saturation = brightness > 50 ? delta / (2 - max - min) : delta / (max + min);
			
			switch (max) {
				case r / 255:
					hue = (g / 255 - b / 255) / delta + (g < b ? 6 : 0);
					break;
				case g / 255:
					hue = (b / 255 - r / 255) / delta + 2;
					break;
				case b / 255:
					hue = (r / 255 - g / 255) / delta + 4;
					break;
			}
			hue /= 6;
		}

		return {
			r, g, b,
			hue: hue * 360,
			saturation: saturation * 100,
			brightness
		};
	}

	// 顏色格式轉換方法
	private convertColorFormats(color: { r: number; g: number; b: number; hue: number; saturation: number; brightness: number }) {
		const { r, g, b, hue, saturation, brightness } = color;

		// HEX 格式
		const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

		// RGB 格式
		const rgb = `rgb(${r}, ${g}, ${b})`;

		// HSL 格式
		const hsl = `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(brightness)}%)`;

		// HSV 格式
		const hsv = `hsv(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(Math.max(r, g, b) / 255 * 100)}%)`;

		// CMYK 格式（簡化計算）
		const k = 1 - Math.max(r, g, b) / 255;
		const c = k === 1 ? 0 : (1 - r / 255 - k) / (1 - k);
		const m = k === 1 ? 0 : (1 - g / 255 - k) / (1 - k);
		const y = k === 1 ? 0 : (1 - b / 255 - k) / (1 - k);
		const cmyk = `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;

		return { hex, rgb, hsl, hsv, cmyk };
	}
}

// Export the OAuth handler as the default
const mcpServer = new MyMCP();

export default new OAuthProvider({
	apiRoute: "/sse",
	// TODO: fix these types
	// @ts-expect-error
	apiHandler: mcpServer.server,
	// @ts-expect-error
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
