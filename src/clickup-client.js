export class ClickUpApiError extends Error {
  constructor(message, status, responseBody) {
    super(message);
    this.status = status;
    this.responseBody = responseBody;
  }
}

const DEFAULT_BASE_URL = 'https://api.clickup.com/api/v2';

export class ClickUpClient {
  constructor(options) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 5;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 500;
  }

  async getUser() { return this.request('GET', '/user'); }
  async getWorkspaces() { return this.request('GET', '/team'); }
  async getSpaces(workspaceId) { return this.request('GET', `/team/${workspaceId}/space`); }
  async getFolders(spaceId) { return this.request('GET', `/space/${spaceId}/folder`); }
  async getLists(folderId) { return this.request('GET', `/folder/${folderId}/list`); }
  async getListCustomFields(listId) {
    const result = await this.request('GET', `/list/${listId}/field`);
    return result.fields;
  }
  async createTask(listId, payload) { return this.request('POST', `/list/${listId}/task`, payload); }
  async createSubtask(taskId, payload) { return this.request('POST', `/task/${taskId}/subtask`, payload); }

  async request(method, path, body) {
    let attempt = 0;
    while (true) {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: this.token, 'Content-Type': 'application/json' },
        body: body == null ? undefined : JSON.stringify(body),
      });

      if (response.status === 429 && attempt < this.maxRetries) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
        const backoffMs = retryAfterMs ?? this.retryBaseDelayMs * 2 ** attempt;
        const jitterMs = Math.floor(Math.random() * 100);
        await sleep(backoffMs + jitterMs);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const maybeJson = await safeJson(response);
        throw new ClickUpApiError(`ClickUp API request failed: ${method} ${path} (${response.status})`, response.status, maybeJson);
      }

      return response.json();
    }
  }
}

async function safeJson(response) {
  try { return await response.json(); } catch { return undefined; }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export function taskUrl(task) {
  return task.url || `https://app.clickup.com/t/${task.id}`;
}
