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
