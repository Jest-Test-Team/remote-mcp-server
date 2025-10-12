// 範例：使用分析追蹤系統
// 追蹤工具使用情況，提供數據洞察

// ============================================
// 1. D1 資料庫 Schema
// ============================================

/*
-- database/schema.sql

CREATE TABLE IF NOT EXISTS tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  parameters TEXT,
  result_status TEXT CHECK(result_status IN ('success', 'error')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON tool_usage(user_id);
CREATE INDEX idx_tool_name ON tool_usage(tool_name);
CREATE INDEX idx_created_at ON tool_usage(created_at);
CREATE INDEX idx_result_status ON tool_usage(result_status);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  first_call_at DATETIME,
  last_call_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 執行 migration:
-- wrangler d1 execute mcp-server-db --file=./database/schema.sql
*/

// ============================================
// 2. Analytics 類別
// ============================================

export class Analytics {
  constructor(private env: Env) {}

  // 記錄工具調用
  async trackToolCall(data: {
    userId: string;
    toolName: string;
    parameters: any;
    status: 'success' | 'error';
    errorMessage?: string;
    durationMs: number;
  }) {
    try {
      // 記錄詳細調用
      await this.env.DB.prepare(`
        INSERT INTO tool_usage 
        (user_id, tool_name, parameters, result_status, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.userId,
        data.toolName,
        JSON.stringify(data.parameters),
        data.status,
        data.errorMessage || null,
        data.durationMs
      ).run();

      // 更新用戶統計
      await this.updateUserStats(data.userId, data.status);

      // 可選：推送到 Analytics Engine (即時分析)
      if (this.env.ANALYTICS_ENGINE) {
        await this.env.ANALYTICS_ENGINE.writeDataPoint({
          blobs: [data.toolName, data.status],
          doubles: [data.durationMs],
          indexes: [data.userId]
        });
      }
    } catch (error) {
      console.error('Failed to track tool call:', error);
      // 分析失敗不應影響主要功能
    }
  }

  // 更新用戶統計
  private async updateUserStats(userId: string, status: 'success' | 'error') {
    await this.env.DB.prepare(`
      INSERT INTO user_stats 
        (user_id, total_calls, successful_calls, failed_calls, first_call_at, last_call_at)
      VALUES 
        (?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        total_calls = total_calls + 1,
        successful_calls = successful_calls + ?,
        failed_calls = failed_calls + ?,
        last_call_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      status === 'success' ? 1 : 0,
      status === 'error' ? 1 : 0,
      status === 'success' ? 1 : 0,
      status === 'error' ? 1 : 0
    ).run();
  }

  // 取得用戶統計
  async getUserStats(userId: string) {
    const result = await this.env.DB.prepare(`
      SELECT * FROM user_stats WHERE user_id = ?
    `).bind(userId).first();

    return result;
  }

  // 取得工具使用排行
  async getTopTools(limit: number = 10, days: number = 7) {
    const result = await this.env.DB.prepare(`
      SELECT 
        tool_name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN result_status = 'success' THEN 1 ELSE 0 END) as successful_calls,
        AVG(duration_ms) as avg_duration_ms,
        MAX(created_at) as last_used_at
      FROM tool_usage
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY tool_name
      ORDER BY total_calls DESC
      LIMIT ?
    `).bind(days, limit).all();

    return result.results;
  }

  // 取得錯誤報告
  async getErrorReport(days: number = 7) {
    const result = await this.env.DB.prepare(`
      SELECT 
        tool_name,
        error_message,
        COUNT(*) as error_count,
        MAX(created_at) as last_occurrence
      FROM tool_usage
      WHERE 
        result_status = 'error' 
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY tool_name, error_message
      ORDER BY error_count DESC
      LIMIT 20
    `).bind(days).all();

    return result.results;
  }

  // 取得使用趨勢（按小時）
  async getUsageTrend(days: number = 7) {
    const result = await this.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
        COUNT(*) as calls,
        COUNT(DISTINCT user_id) as unique_users
      FROM tool_usage
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY hour
      ORDER BY hour
    `).bind(days).all();

    return result.results;
  }
}

// ============================================
// 3. 在 MCP Server 中使用 Analytics
// ============================================

// 在 src/index.ts 的 MyMCP 類別中：

export class MyMCP extends McpAgent {
  private analytics: Analytics;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.analytics = new Analytics(env);
  }

  async init() {
    // 包裝工具調用以加入分析
    const originalTool = this.server.tool.bind(this.server);
    
    this.server.tool = (name: string, schema: any, handler: any) => {
      const wrappedHandler = async (params: any) => {
        const startTime = Date.now();
        const userId = this.getUserId(); // 從 session 取得
        
        try {
          const result = await handler(params);
          const duration = Date.now() - startTime;
          
          // 記錄成功調用
          await this.analytics.trackToolCall({
            userId,
            toolName: name,
            parameters: params,
            status: 'success',
            durationMs: duration
          });
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // 記錄失敗調用
          await this.analytics.trackToolCall({
            userId,
            toolName: name,
            parameters: params,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            durationMs: duration
          });
          
          throw error;
        }
      };
      
      return originalTool(name, schema, wrappedHandler);
    };

    // 定義原有工具...
    this.server.tool("add", ...);
    // ... 其他工具
  }

  private getUserId(): string {
    // 從 OAuth session 或 request 中取得 user ID
    // 實作細節取決於您的認證系統
    return 'user-id-from-session';
  }
}

// ============================================
// 4. 新增分析查詢工具
// ============================================

// 在 init() 中加入分析查詢工具：

this.server.tool(
  "getMyStats",
  {},
  async () => {
    const userId = this.getUserId();
    const stats = await this.analytics.getUserStats(userId);
    
    return {
      content: [{
        type: "text",
        text: `📊 **您的使用統計**\n\n` +
              `🔢 **總調用次數**：${stats?.total_calls || 0}\n` +
              `✅ **成功次數**：${stats?.successful_calls || 0}\n` +
              `❌ **失敗次數**：${stats?.failed_calls || 0}\n` +
              `📅 **首次使用**：${stats?.first_call_at || 'N/A'}\n` +
              `⏰ **最後使用**：${stats?.last_call_at || 'N/A'}\n\n` +
              `📈 **成功率**：${stats ? ((stats.successful_calls / stats.total_calls) * 100).toFixed(1) : 0}%`
      }]
    };
  }
);

this.server.tool(
  "getTopTools",
  {
    limit: z.number().min(1).max(20).optional().describe("顯示數量"),
    days: z.number().min(1).max(30).optional().describe("查詢天數")
  },
  async ({ limit = 10, days = 7 }) => {
    const tools = await this.analytics.getTopTools(limit, days);
    
    let result = `🏆 **熱門工具排行（最近 ${days} 天）**\n\n`;
    
    tools.forEach((tool: any, index: number) => {
      const successRate = (tool.successful_calls / tool.total_calls * 100).toFixed(1);
      result += `**${index + 1}. ${tool.tool_name}**\n`;
      result += `📊 調用次數：${tool.total_calls}\n`;
      result += `✅ 成功率：${successRate}%\n`;
      result += `⚡ 平均耗時：${Math.round(tool.avg_duration_ms)}ms\n`;
      result += `⏰ 最後使用：${new Date(tool.last_used_at).toLocaleString('zh-TW')}\n\n`;
    });
    
    return {
      content: [{ type: "text", text: result }]
    };
  }
);

// ============================================
// 5. wrangler.jsonc 配置
// ============================================

/*
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mcp-server-db",
      "database_id": "your-database-id"
    }
  ],
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS_ENGINE"
    }
  ]
}
*/

