/** HTTP and OAuth transport for the GLPI 12 High-Level API v3. */
export interface GlpiConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  entityId?: number;
  profileId?: number;
  entityRecursive?: boolean;
}

export class GlpiApiError extends Error {
  constructor(public readonly status: number, public readonly path: string, detail: string) {
    super(`GLPI API ${status} at ${path}: ${detail}`);
    this.name = 'GlpiApiError';
  }
}

export class GlpiClient {
  private readonly baseUrl: string;
  private readonly tokens = new Map<string, { value: string; expiresAt: number }>();
  private readonly tokenRequests = new Map<string, Promise<string>>();

  constructor(private readonly config: GlpiConfig) {
    if (!/^https?:\/\//.test(config.url)) throw new Error('GLPI_URL must be an HTTP(S) URL');
    for (const key of ['clientId', 'clientSecret', 'username', 'password'] as const) {
      if (!config[key]) throw new Error(`Missing GLPI OAuth configuration: ${key}`);
    }
    this.baseUrl = config.url.replace(/\/+$/, '').replace(/\/api\.php(?:\/v\d+)?$/, '');
  }

  private async token(scope: string): Promise<string> {
    const cached = this.tokens.get(scope);
    if (cached && Date.now() < cached.expiresAt) return cached.value;
    let pending = this.tokenRequests.get(scope);
    if (!pending) {
      pending = this.acquireToken(scope).finally(() => { this.tokenRequests.delete(scope); });
      this.tokenRequests.set(scope, pending);
    }
    return pending;
  }

  private async acquireToken(scope: string): Promise<string> {
    const form = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username,
      password: this.config.password,
      scope,
    });
    const response = await fetch(`${this.baseUrl}/api.php/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(),
    });
    if (!response.ok) throw new GlpiApiError(response.status, '/token', `OAuth ${scope} scope grant failed`);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token || !Number.isFinite(data.expires_in) || Number(data.expires_in) <= 0) {
      throw new Error('GLPI OAuth response did not include a valid token and expiry');
    }
    this.tokens.set(scope, { value: data.access_token, expiresAt: Date.now() + Math.max(0, Number(data.expires_in) * 1000 - 30000) });
    return data.access_token;
  }

  async requestBinary(path: string, maxBytes = 10 * 1024 * 1024): Promise<{ data: Buffer; mimeType: string }> {
    if (!/^\/Management\/Document\/[1-9]\d*\/Download$/.test(path)) throw new Error('Invalid GLPI document path');
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.token('api');
      const response = await fetch(`${this.baseUrl}/api.php/v3${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' },
      });
      if (response.status === 401 && attempt === 0) {
        this.tokens.delete('api');
        continue;
      }
      if (!response.ok) throw new GlpiApiError(response.status, path, response.statusText || 'Download failed');
      const declared = Number(response.headers.get('Content-Length'));
      if (declared > maxBytes) throw new GlpiApiError(413, path, 'Document exceeds 10 MiB limit');
      const chunks: Buffer[] = [];
      let size = 0;
      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) {
              await reader.cancel();
              throw new GlpiApiError(413, path, 'Document exceeds 10 MiB limit');
            }
            chunks.push(Buffer.from(value));
          }
        } finally {
          reader.releaseLock();
        }
      }
      return { data: Buffer.concat(chunks), mimeType: response.headers.get('Content-Type')?.split(';')[0] || 'application/octet-stream' };
    }
    throw new Error('GLPI document request could not be authenticated');
  }

  async request(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!path.startsWith('/') || path.includes('..') || path.includes('?')) throw new Error('Invalid GLPI API path');
    const url = new URL(`${this.baseUrl}/api.php/v3${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const scope = path.startsWith('/Administration/User/Me') ? 'user' : 'api';
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.token(scope);
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (options.entityId !== undefined) headers['GLPI-Entity'] = String(options.entityId);
      if (options.profileId !== undefined) headers['GLPI-Profile'] = String(options.profileId);
      if (options.entityRecursive !== undefined) headers['GLPI-Entity-Recursive'] = String(options.entityRecursive);
      const response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (response.status === 401 && attempt === 0) {
        this.tokens.delete(scope);
        continue;
      }
      if (!response.ok) {
        let detail = response.statusText || 'Request failed';
        try {
          const value = await response.json() as Record<string, unknown>;
          const message = value.detail ?? value.message ?? value.title;
          if (typeof message === 'string') detail = message.slice(0, 500);
        } catch { /* Some GLPI errors have no JSON body. */ }
        throw new GlpiApiError(response.status, path, detail);
      }
      if (response.status === 204) return { success: true };
      const responseText = await response.text();
      if (!responseText) return { success: true };
      const data: unknown = JSON.parse(responseText);
      if (Array.isArray(data)) {
        const totalHeader = response.headers.get('X-Total-Count') ?? response.headers.get('X-Total')
          ?? response.headers.get('Content-Range')?.split('/')[1];
        const total = totalHeader === undefined || totalHeader === null || totalHeader === '*' ? undefined : Number(totalHeader);
        return { items: data, ...(Number.isFinite(total) ? { total } : {}) };
      }
      return data;
    }
    throw new Error('GLPI request could not be authenticated');
  }
}
