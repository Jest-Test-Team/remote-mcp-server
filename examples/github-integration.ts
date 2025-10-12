// 範例：GitHub API 整合
// 將此代碼加入 src/index.ts 的 init() 方法中

// 需要在 wrangler.jsonc 中設定：
// wrangler secret put GITHUB_TOKEN

// GitHub Issue 創建工具
this.server.tool(
  "createGitHubIssue",
  {
    owner: z.string().describe("倉庫擁有者（GitHub 用戶名或組織名）"),
    repo: z.string().describe("倉庫名稱"),
    title: z.string().describe("Issue 標題"),
    body: z.string().describe("Issue 內容描述"),
    labels: z.array(z.string()).optional().describe("標籤列表"),
    assignees: z.array(z.string()).optional().describe("指派人員")
  },
  async ({ owner, repo, title, body, labels = [], assignees = [] }) => {
    try {
      // 從環境變數取得 GitHub Token
      const token = (this.env as any).GITHUB_TOKEN;
      
      if (!token) {
        return {
          content: [{
            type: "text",
            text: "❌ GitHub Token 未設定。請執行：wrangler secret put GITHUB_TOKEN"
          }]
        };
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'MCP-Server'
          },
          body: JSON.stringify({
            title,
            body,
            labels,
            assignees
          })
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        return {
          content: [{
            type: "text",
            text: `❌ GitHub API 錯誤：${error.message || response.statusText}`
          }]
        };
      }

      const issue = await response.json() as any;

      return {
        content: [{
          type: "text",
          text: `✅ **GitHub Issue 創建成功！**\n\n` +
                `📋 **標題**：${issue.title}\n` +
                `🔗 **連結**：${issue.html_url}\n` +
                `🔢 **Issue #**：${issue.number}\n` +
                `👤 **創建者**：${issue.user.login}\n` +
                `🏷️ **標籤**：${labels.length > 0 ? labels.join(', ') : '無'}\n` +
                `👥 **指派給**：${assignees.length > 0 ? assignees.join(', ') : '無'}\n` +
                `📅 **創建時間**：${new Date(issue.created_at).toLocaleString('zh-TW')}\n\n` +
                `💡 可以直接點擊連結查看 Issue 詳情。`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ 創建 Issue 失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        }]
      };
    }
  }
);

// GitHub 倉庫搜尋工具
this.server.tool(
  "searchGitHubRepos",
  {
    query: z.string().describe("搜尋關鍵字"),
    language: z.string().optional().describe("程式語言過濾"),
    sort: z.enum(["stars", "forks", "updated"]).optional().describe("排序方式"),
    limit: z.number().min(1).max(10).optional().describe("返回數量（1-10）")
  },
  async ({ query, language, sort = "stars", limit = 5 }) => {
    try {
      const searchQuery = language 
        ? `${query}+language:${language}` 
        : query;

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${sort}&per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MCP-Server'
          }
        }
      );

      if (!response.ok) {
        return {
          content: [{
            type: "text",
            text: `❌ GitHub API 錯誤：${response.statusText}`
          }]
        };
      }

      const data = await response.json() as any;
      const repos = data.items || [];

      if (repos.length === 0) {
        return {
          content: [{
            type: "text",
            text: `🔍 **搜尋結果**\n\n找不到符合 "${query}" 的倉庫。`
          }]
        };
      }

      let result = `🔍 **GitHub 倉庫搜尋結果**\n\n`;
      result += `📊 **搜尋關鍵字**：${query}\n`;
      result += `🔤 **程式語言**：${language || '不限'}\n`;
      result += `📈 **排序方式**：${sort}\n`;
      result += `📦 **總結果數**：${data.total_count.toLocaleString()} 個（顯示前 ${limit} 個）\n\n`;
      result += `---\n\n`;

      repos.forEach((repo: any, index: number) => {
        result += `**${index + 1}. ${repo.full_name}**\n`;
        result += `📝 ${repo.description || '無描述'}\n`;
        result += `⭐ Stars: ${repo.stargazers_count.toLocaleString()} | `;
        result += `🍴 Forks: ${repo.forks_count.toLocaleString()} | `;
        result += `👁️ Watchers: ${repo.watchers_count.toLocaleString()}\n`;
        result += `🔤 語言: ${repo.language || '未指定'} | `;
        result += `📅 更新: ${new Date(repo.updated_at).toLocaleDateString('zh-TW')}\n`;
        result += `🔗 ${repo.html_url}\n\n`;
      });

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
          text: `❌ 搜尋失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        }]
      };
    }
  }
);

// GitHub 用戶資訊查詢
this.server.tool(
  "getGitHubUser",
  {
    username: z.string().describe("GitHub 用戶名")
  },
  async ({ username }) => {
    try {
      const response = await fetch(
        `https://api.github.com/users/${username}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MCP-Server'
          }
        }
      );

      if (!response.ok) {
        return {
          content: [{
            type: "text",
            text: `❌ 找不到用戶：${username}`
          }]
        };
      }

      const user = await response.json() as any;

      return {
        content: [{
          type: "text",
          text: `👤 **GitHub 用戶資訊**\n\n` +
                `🆔 **用戶名**：${user.login}\n` +
                `📛 **名稱**：${user.name || '未設定'}\n` +
                `📝 **簡介**：${user.bio || '無'}\n` +
                `📍 **位置**：${user.location || '未知'}\n` +
                `🏢 **公司**：${user.company || '未知'}\n` +
                `🌐 **網站**：${user.blog || '無'}\n` +
                `📧 **Email**：${user.email || '未公開'}\n` +
                `🐦 **Twitter**：${user.twitter_username ? '@' + user.twitter_username : '無'}\n\n` +
                `📊 **統計資訊**：\n` +
                `• 公開倉庫：${user.public_repos}\n` +
                `• Gists：${user.public_gists}\n` +
                `• Followers：${user.followers}\n` +
                `• Following：${user.following}\n\n` +
                `📅 **註冊日期**：${new Date(user.created_at).toLocaleDateString('zh-TW')}\n` +
                `🔗 **個人頁面**：${user.html_url}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ 查詢失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        }]
      };
    }
  }
);

