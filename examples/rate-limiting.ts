// 範例：速率限制實現
// 使用 Durable Objects 實現速率限制

export class RateLimiter {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anonymous';
    const action = url.searchParams.get('action') || 'check';

    switch (action) {
      case 'check':
        return await this.checkLimit(userId);
      case 'reset':
        return await this.resetLimit(userId);
      case 'status':
        return await this.getStatus(userId);
      default:
        return new Response('Invalid action', { status: 400 });
    }
  }

  // 檢查速率限制
  private async checkLimit(userId: string): Promise<Response> {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 小時
    const maxRequests = 100; // 每小時最多 100 次請求

    // 取得用戶的請求記錄
    const key = `rate:${userId}`;
    const record = await this.state.storage.get<RateLimitRecord>(key) || {
      count: 0,
      resetAt: now + windowMs,
      firstRequestAt: now
    };

    // 檢查時間窗口是否已過期
    if (now >= record.resetAt) {
      // 重置計數
      record.count = 1;
      record.resetAt = now + windowMs;
      record.firstRequestAt = now;
    } else {
      // 增加計數
      record.count++;
    }

    // 儲存更新後的記錄
    await this.state.storage.put(key, record);

    // 檢查是否超過限制
    const allowed = record.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - record.count);
    const resetIn = Math.ceil((record.resetAt - now) / 1000); // 秒

    return new Response(JSON.stringify({
      allowed,
      limit: maxRequests,
      remaining,
      resetIn,
      current: record.count
    }), {
      status: allowed ? 200 : 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': record.resetAt.toString(),
        'Retry-After': resetIn.toString()
      }
    });
  }

  // 重置用戶的速率限制
  private async resetLimit(userId: string): Promise<Response> {
    const key = `rate:${userId}`;
    await this.state.storage.delete(key);
    return new Response('Rate limit reset', { status: 200 });
  }

  // 取得用戶的速率限制狀態
  private async getStatus(userId: string): Promise<Response> {
    const key = `rate:${userId}`;
    const record = await this.state.storage.get<RateLimitRecord>(key);

    if (!record) {
      return new Response(JSON.stringify({
        status: 'no-data',
        message: 'No rate limit data for this user'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Date.now();
    const resetIn = Math.ceil((record.resetAt - now) / 1000);

    return new Response(JSON.stringify({
      count: record.count,
      resetAt: new Date(record.resetAt).toISOString(),
      resetIn,
      firstRequestAt: new Date(record.firstRequestAt).toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstRequestAt: number;
}

// ============================================
// 如何在 MCP Server 中使用速率限制
// ============================================

// 在 src/index.ts 中的工具調用前加入速率限制檢查：

async function checkRateLimit(userId: string, env: Env): Promise<boolean> {
  const id = env.RATE_LIMITER.idFromName(userId);
  const stub = env.RATE_LIMITER.get(id);
  
  const response = await stub.fetch(
    new Request(`https://fake-host/?userId=${userId}&action=check`)
  );
  
  const data = await response.json() as any;
  return data.allowed;
}

// 修改工具調用邏輯：
// this.server.tool("yourTool", schema, async (params) => {
//   const userId = this.getUserId(); // 從 session 取得 userId
//   
//   const allowed = await checkRateLimit(userId, this.env);
//   if (!allowed) {
//     return {
//       content: [{
//         type: "text",
//         text: "❌ 已達到速率限制。請稍後再試。（每小時最多 100 次請求）"
//       }]
//     };
//   }
//   
//   // 執行實際的工具邏輯...
// });

// ============================================
// wrangler.jsonc 配置
// ============================================

// {
//   "durable_objects": {
//     "bindings": [
//       {
//         "class_name": "MyMCP",
//         "name": "MCP_OBJECT"
//       },
//       {
//         "class_name": "RateLimiter",
//         "name": "RATE_LIMITER"
//       }
//     ]
//   }
// }

