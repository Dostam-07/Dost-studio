import type { OllamaModel, AppSettings } from '@/types';

const PROXY_PREFIX = '/api/ollama';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
const LOCAL_FALLBACK_MODEL_PRIORITY = [
  // Best local models on your machine (hermes is preferred if installed)
  'hermes3:8b',
  'hermes3',
  'hermes',
  'qwen2.5-coder:7b',
  'qwen2.5-coder',
  // Good all-rounders
  'devstral',
  // Capable smaller models
  'deepseek-r1:7b',
  'deepseek-r1',
  'qwen3:4b',
  'qwen3',
  // Fallbacks
  'llama3',
  'llama3.2',
  'mistral',
];

type OpenRouterMessage = { role: string; content: string };
type OpenRouterTestResult = { ok: boolean; message: string };

type FallbackHistory = {
  from: 'OpenRouter';
  to: string;
  originalModel: string;
  reason: string;
  timestamp: string;
};

export class OllamaService {
  private baseUrl: string;
  private provider: 'ollama' | 'openrouter' = 'ollama';
  private openRouterKey = '';
  private openRouterModel = 'google/gemini-2.0-flash-001';
  public lastFallback: FallbackHistory | null = null;
  public lastOpenRouterKeyUsed: string | null = null;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  configureWithSettings(settings: AppSettings) {
    this.provider = settings.apiProvider ?? this.provider;
    // Support multiple keys via settings.openRouterKeys (array) or comma/newline-separated in openRouterKey
    if (settings.openRouterKeys && Array.isArray(settings.openRouterKeys)) {
      this.openRouterKeys = settings.openRouterKeys.map((k) => k.trim()).filter(Boolean);
    } else if (settings.openRouterKey) {
      this.openRouterKeys = settings.openRouterKey.split(/[,\n\r]+/).map((k) => k.trim()).filter(Boolean);
    }
    this.openRouterKey = this.openRouterKeys.length > 0 ? this.openRouterKeys[0] : (settings.openRouterKey ?? this.openRouterKey);
    this.openRouterModel = settings.openRouterModel ?? this.openRouterModel;
    if (settings.ollamaUrl) this.baseUrl = settings.ollamaUrl;
    
    // Log configuration for debugging
    if (this.provider === 'openrouter') {
      const keyCount = this.openRouterKeys.length;
      const firstKey = this.openRouterKey ? `${this.openRouterKey.slice(0, 6)}...${this.openRouterKey.slice(-6)}` : 'none';
      console.debug(`[Dost] OpenRouter configured: ${keyCount} key(s) available, using ${firstKey}, model: ${this.openRouterModel}`);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl || PROXY_PREFIX;
  }

  private url(path: string): string {
    return this.ollamaUrl(path);
  }

  private async fetchWithRetry(path: string, options: RequestInit = {}, retries = 3, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(this.url(path), options);
        return res;
      } catch (err) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delay * (i + 1)));
        } else {
          throw err;
        }
      }
    }
    throw new Error('unreachable');
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.fetchWithRetry('/tags', {}, 2, 500);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(retries = 6, delay = 2000): Promise<OllamaModel[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.fetchWithRetry('/tags', {}, 1, 500);
        if (res.ok) {
          const data = await res.json();
          return (data.models || []).map((m: { name: string; model: string; size: number; modified_at: string }) => ({
            name: m.name,
            model: m.model,
            size: (m.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            modified: m.modified_at,
          }));
        }
        const body = await res.text().catch(() => '');
        console.log(`Ollama not ready (${attempt}/${retries}):`, res.status, body);
        if (attempt < retries) await new Promise(r => setTimeout(r, delay));
        else return [];
      } catch (err) {
        console.log(`Ollama connection error (${attempt}/${retries}):`, err);
        if (attempt < retries) await new Promise(r => setTimeout(r, delay));
        else return [];
      }
    }
    return [];
  }

  async generate(model: string, prompt: string, system?: string, stream?: (chunk: string) => void, images?: string[]): Promise<string> {
    if (this.provider === 'openrouter' && this.openRouterKey) {
      try {
        return await this.openRouterGenerate(model, prompt, system, stream, images);
      } catch (error) {
        if (this.shouldFallbackToLocal(error)) {
          const fallbackModel = await this.getLocalFallbackModel(model);
          this.recordFallback('OpenRouter', fallbackModel, (error as Error)?.message || 'OpenRouter failure', model);
          console.warn(`[Dost] OpenRouter failed → falling back to local model: ${fallbackModel}`);
          return this.ollamaGenerate(fallbackModel, prompt, system, stream, images);
        }
        throw error;
      }
    }
    return this.ollamaGenerate(model, prompt, system, stream, images);
  }

  async generateJSON<T>(model: string, prompt: string, system?: string): Promise<T> {
    if (this.provider === 'openrouter' && this.openRouterKey) {
      try {
        return await this.openRouterGenerateJSON<T>(model, prompt, system);
      } catch (error) {
        if (this.shouldFallbackToLocal(error)) {
          const fallbackModel = await this.getLocalFallbackModel(model);
          this.recordFallback('OpenRouter', fallbackModel, (error as Error)?.message || 'OpenRouter failure', model);
          console.warn(`[Dost] OpenRouter JSON failed → falling back to local model: ${fallbackModel}`);
          return this.ollamaGenerateJSON<T>(fallbackModel, prompt, system);
        }
        throw error;
      }
    }
    return this.ollamaGenerateJSON<T>(model, prompt, system);
  }

  async chat(model: string, messages: { role: string; content: string }[], stream?: (chunk: string) => void): Promise<string> {
    if (this.provider === 'openrouter' && this.openRouterKey) {
      try {
        return await this.openRouterChat(model, messages, stream);
      } catch (error) {
        if (this.shouldFallbackToLocal(error)) {
          const fallbackModel = await this.getLocalFallbackModel(model);
          this.recordFallback('OpenRouter', fallbackModel, (error as Error)?.message || 'OpenRouter failure', model);
          console.warn(`[Dost] OpenRouter chat failed → falling back to local model: ${fallbackModel}`);
          return this.ollamaChat(fallbackModel, messages, stream);
        }
        throw error;
      }
    }
    return this.ollamaChat(model, messages, stream);
  }

  // --- Ollama methods ---

  /** Returns the full URL for an Ollama API call.
   *
   *  URL construction rules:
   *  - Pure Ollama mode (baseUrl set): baseUrl + /api + path
   *    e.g. http://localhost:11434 + /api + /generate = http://localhost:11434/api/generate
   *  - OpenRouter fallback mode (no custom baseUrl, provider=openrouter):
   *    direct localhost:11434/api + path — bypasses Vite proxy for speed
   *  - Default Ollama mode (no baseUrl, provider=ollama):
   *    Vite proxy path /api/ollama + path
   */
  private ollamaUrl(path: string): string {
    const isLocalhost = !this.baseUrl || 
      this.baseUrl.includes('localhost') || 
      this.baseUrl.includes('127.0.0.1');

    if (isLocalhost) {
      // Default: Use Vite proxy to avoid CORS issues on localhost
      return `${PROXY_PREFIX}${path}`;
    }

    // Custom remote baseUrl — always add /api
    const base = this.baseUrl.replace(/\/+$/, ''); // strip trailing slash
    return `${base}/api${path}`;
  }

  private async ollamaGenerate(model: string, prompt: string, system?: string, stream?: (chunk: string) => void, images?: string[]): Promise<string> {
    const body: Record<string, unknown> = { model, prompt, stream: !!stream };
    if (system) body.system = system;
    if (images && images.length) body.images = images;
    try {
      const res = await fetch(this.ollamaUrl('/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Ollama error (${res.status}): ${errBody || res.statusText} — model="${model}"`);
      }
      if (stream) return this.parseOllamaStream(res, (chunk) => stream(chunk));
      const data = await res.json();
      return data.response || '';
    } catch (error) {
      console.error('Ollama generate error:', error);
      throw error;
    }
  }

  private async ollamaGenerateJSON<T>(model: string, prompt: string, system?: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond with valid JSON only. No markdown formatting. No code blocks.`;
    const response = await this.ollamaGenerate(model, fullPrompt, system);
    return this.extractJSON<T>(response, model);
  }

  private async ollamaChat(model: string, messages: { role: string; content: string }[], stream?: (chunk: string) => void): Promise<string> {
    try {
      const res = await fetch(this.ollamaUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: !!stream }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Ollama error (${res.status}): ${errBody || res.statusText} — model="${model}"`);
      }
      if (stream) return this.parseOllamaChatStream(res, (chunk) => stream(chunk));
      const data = await res.json();
      return data.message?.content || '';
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  private async parseOllamaStream(res: Response, onChunk: (chunk: string) => void): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try { const p = JSON.parse(line); if (p.response) { full += p.response; onChunk(p.response); } } catch { /* skip */ }
      }
    }
    return full;
  }

  private async parseOllamaChatStream(res: Response, onChunk: (chunk: string) => void): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try { const p = JSON.parse(line); if (p.message?.content) { full += p.message.content; onChunk(p.message.content); } } catch { /* skip */ }
      }
    }
    return full;
  }

  private extractJSON<T>(response: string, model: string): T {
    const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Try the whole response first
    try { return JSON.parse(cleaned) as T; } catch { /* fall through */ }
    // Iterate through each potential JSON start position
    let idx = 0;
    while (true) {
      const firstBrace = cleaned.indexOf('{', idx);
      if (firstBrace < 0) break;
      let depth = 0;
      let inString = false;
      let jsonEnd = -1;
      for (let i = firstBrace; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (inString) {
          if (c === '\\') { i++; continue; }
          if (c === '"') inString = false;
          continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
      }
      if (jsonEnd > 0) {
        const candidate = cleaned.slice(firstBrace, jsonEnd + 1);
        try { return JSON.parse(candidate) as T; } catch { idx = firstBrace + 1; }
      } else {
        idx = firstBrace + 1;
      }
    }

    const fallbackCandidate = cleaned.slice(0, cleaned.lastIndexOf('}') + 1);
    if (fallbackCandidate) {
      try { return JSON.parse(fallbackCandidate) as T; } catch { /* fall through */ }
    }

    const balanced = this.balanceJson(cleaned);
    if (balanced) {
      try { return JSON.parse(balanced) as T; } catch { /* fall through */ }
    }

    throw new Error(`Failed to parse JSON from model "${model}". Raw: ${cleaned.slice(0, 500)}...`);
  }

  private balanceJson(raw: string): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (const char of raw) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === '{') depth++;
      else if (char === '}') depth--;
    }
    if (depth > 0) {
      return raw + '}'.repeat(depth);
    }
    return null;
  }

  private recordFallback(from: 'OpenRouter', to: string, reason: string, originalModel: string) {
    this.lastFallback = {
      from,
      to,
      originalModel,
      reason,
      timestamp: new Date().toISOString(),
    };
  }

  // --- OpenRouter methods ---

  private getOpenRouterKeys(apiKey?: string): string[] {
    const fromApiKey = apiKey ? apiKey.split(/[\n\r,]+/).map((k) => k.trim()).filter(Boolean) : [];
    if (fromApiKey.length > 0) return fromApiKey;
    if (this.openRouterKeys && this.openRouterKeys.length > 0) return this.openRouterKeys;
    if (this.openRouterKey) return [this.openRouterKey];
    return [];
  }

  async testOpenRouterConnection(apiKey: string | undefined, model: string): Promise<OpenRouterTestResult> {
    const keysToTry = this.getOpenRouterKeys(apiKey);
    let lastMessage = '';
    for (const k of keysToTry) {
      try {
        const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${k}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
            'X-Title': 'Dost Studio',
          },
          body: JSON.stringify({
            model: model || 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: 'Reply with the word "ok" only.' }],
            max_tokens: 10,
          }),
        });
        if (res.ok) {
          this.lastOpenRouterKeyUsed = k;
          return { ok: true, message: 'Connected successfully (key works)' };
        }
        const body = await res.text().catch(() => '');
        lastMessage = `Status ${res.status}: ${body.slice(0, 200)}`;
        if (res.status === 401 || res.status === 402 || res.status === 429 || /credit|payment required|insufficient credits/i.test(body)) {
          continue;
        }
        return { ok: false, message: `Error ${res.status}: ${body.slice(0, 200)}` };
      } catch (err) {
        lastMessage = (err as Error).message;
        continue;
      }
    }
    return { ok: false, message: `All keys failed. Last: ${lastMessage}` };
  }

  async testOpenRouterKeys(apiKey: string | undefined, model: string): Promise<Array<{ key: string; ok: boolean; message: string }>> {
    const keysToTry = this.getOpenRouterKeys(apiKey);
    return Promise.all(keysToTry.map(async (k) => {
      try {
        const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${k}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
            'X-Title': 'Dost Studio',
          },
          body: JSON.stringify({
            model: model || 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: 'Reply with the word "ok" only.' }],
            max_tokens: 10,
          }),
        });
        if (res.ok) return { key: k, ok: true, message: 'Key works' };
        const body = await res.text().catch(() => '');
        return { key: k, ok: false, message: `Status ${res.status}: ${body.slice(0, 200)}` };
      } catch (err) {
        return { key: k, ok: false, message: (err as Error).message };
      }
    }));
  }

  /**
   * Quick image-capability probe for an OpenRouter model using a tiny 1x1 PNG.
   * Returns ok=true when the API accepts the request (2xx) and a short message.
   */
  async testOpenRouterImageSupport(apiKey: string | undefined, model: string): Promise<OpenRouterTestResult> {
    const keysToTry = this.getOpenRouterKeys(apiKey);
    let lastMessage = '';
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    for (const k of keysToTry) {
      try {
        const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${k}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          },
          body: JSON.stringify({
            model: model || 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: 'Reply with the word "ok" only.' }],
            images: [tinyPng],
            max_tokens: 10,
          }),
        });
        if (res.ok) {
          this.lastOpenRouterKeyUsed = k;
          return { ok: true, message: 'OpenRouter accepted image payload (key works)' };
        }
        const body = await res.text().catch(() => '');
        lastMessage = `Status ${res.status}: ${body.slice(0, 200)}`;
        if (res.status === 401 || res.status === 402) continue;
        return { ok: false, message: `Error ${res.status}: ${body.slice(0, 200)}` };
      } catch (err) {
        lastMessage = (err as Error).message;
        continue;
      }
    }
    return { ok: false, message: `All keys failed. Last: ${lastMessage}` };
  }

  async testOpenRouterImageKeys(apiKey: string | undefined, model: string): Promise<Array<{ key: string; ok: boolean; message: string }>> {
    const keysToTry = this.getOpenRouterKeys(apiKey);
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    return Promise.all(keysToTry.map(async (k) => {
      try {
        const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${k}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          },
          body: JSON.stringify({
            model: model || 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: 'Reply with the word "ok" only.' }],
            images: [tinyPng],
            max_tokens: 10,
          }),
        });
        if (res.ok) return { key: k, ok: true, message: 'Image works' };
        const body = await res.text().catch(() => '');
        return { key: k, ok: false, message: `Status ${res.status}: ${body.slice(0, 200)}` };
      } catch (err) {
        return { key: k, ok: false, message: (err as Error).message };
      }
    }));
  }

  private openRouterKeys: string[] = [];

  private async openRouterFetchWithKey(messages: OpenRouterMessage[], stream: boolean, model?: string, extraBody: Record<string, unknown> = {}, key?: string): Promise<Response> {
    let modelToUse = model || this.openRouterModel;
    if (modelToUse && !modelToUse.includes('/')) {
      console.warn(`Local model ID "${modelToUse}" passed to OpenRouter. Falling back to "${this.openRouterModel}"`);
      modelToUse = this.openRouterModel;
    }
    const auth = key ? `Bearer ${key}` : `Bearer ${this.openRouterKey}`;
    return fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
        'X-Title': 'Dost Studio',
      },
      // Use 4096 tokens — enough for full file generation. extraBody can override.
      body: JSON.stringify({ model: modelToUse, messages, stream, max_tokens: 4096, temperature: 0.1, ...extraBody }),
    });
  }

  private shouldRotateOpenRouterKey(status: number, body: string): boolean {
    const retryableStatus = [401, 402, 429];
    const retryableBody = /credit|payment required|ran out of credits|insufficient credits|context|maximum context length|context length exceeded|rate limit/i;
    return retryableStatus.includes(status) || retryableBody.test(body);
  }

  private async openRouterFetchTryKeys(messages: OpenRouterMessage[], stream: boolean, model?: string, extraBody: Record<string, unknown> = {}): Promise<Response> {
    const keys = (this.openRouterKeys && this.openRouterKeys.length > 0) ? this.openRouterKeys : (this.openRouterKey ? [this.openRouterKey] : []);
    let lastErr: string | null = null;
    if (keys.length === 0) {
      // No keys configured — fall back to single-request with current key (may be empty)
      return this.openRouterFetchWithKey(messages, stream, model, extraBody, this.openRouterKey);
    }
    for (const k of keys) {
      try {
        const res = await this.openRouterFetchWithKey(messages, stream, model, extraBody, k);
        if (res.ok) {
          this.lastOpenRouterKeyUsed = k;
          console.info(`[Dost] OpenRouter request succeeded using key ending ${k.slice(-6)}`);
          return res;
        }
        const body = await res.text().catch(() => '');
        lastErr = `Status ${res.status}: ${body}`;
        if (this.shouldRotateOpenRouterKey(res.status, body)) {
          console.debug(`[Dost] OpenRouter key failed (status ${res.status}) — trying next key`);
          continue;
        }
        return res;
      } catch (err) {
        lastErr = (err as Error).message;
        console.warn('[Dost] OpenRouter request error, trying next key if available:', lastErr);
        continue;
      }
    }
    throw new Error(`OpenRouter: all keys exhausted. Last error: ${lastErr}`);
  }

  private async openRouterGenerate(model: string, prompt: string, system?: string, stream?: (chunk: string) => void, images?: string[]): Promise<string> {
    const messages: OpenRouterMessage[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    try {
      const extra: Record<string, unknown> = {};
      if (images && images.length) extra.images = images;
      const res = await this.openRouterFetchTryKeys(messages, !!stream, model, extra);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenRouter error (${res.status}): ${body || res.statusText} — model="${model}"`);
      }
      if (stream) return this.parseOpenRouterStream(res, (chunk) => stream(chunk));
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenRouter generate error:', error);
      throw error;
    }
  }

  private async openRouterGenerateJSON<T>(model: string, prompt: string, system?: string): Promise<T> {
    const messages: OpenRouterMessage[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: `${prompt}\n\nRespond with valid JSON only. No markdown formatting. No code blocks.` });

    const res = await this.openRouterFetchTryKeys(messages, false, model, { response_format: { type: 'json_object' } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenRouter error (${res.status}): ${body || res.statusText} — model="${model}"`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'object') {
      return content as T;
    }
    if (typeof content === 'string') {
      return this.extractJSON<T>(content, model);
    }
    throw new Error(`OpenRouter JSON response did not contain text content for model "${model}". Raw: ${JSON.stringify(data).slice(0, 500)}`);
  }

  private async openRouterChat(model: string, messages: OpenRouterMessage[], stream?: (chunk: string) => void): Promise<string> {
    try {
      const res = await this.openRouterFetchTryKeys(messages, !!stream, model);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenRouter error (${res.status}): ${body || res.statusText} — model="${model}"`);
      }
      if (stream) return this.parseOpenRouterStream(res, (chunk) => stream(chunk));
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      throw error;
    }
  }

  private shouldFallbackToLocal(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    // Any OpenRouter HTTP error should try fallback
    if (msg.includes('openrouter error')) return true;
    // Network failures
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error')) return true;
    // Credits / billing / rate limit — the most common cases
    if (msg.includes('402') || msg.includes('requires more credits') || msg.includes('payment required') ||
        msg.includes('insufficient credits') || msg.includes('fewer max_tokens') ||
        msg.includes('rate limit') || msg.includes('429')) return true;
    return false;
  }

  private async getLocalFallbackModel(preferredModel: string): Promise<string> {
    // For fallback we need to be fast — try both direct Ollama and the proxy
    // Direct hit to localhost:11434 first (works if ollama serve is running)
    // Then fall back to the proxy path
    let modelNames: string[] = [];

    // 1. Try direct Ollama endpoint — fast, no proxy overhead
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        modelNames = (data.models || []).flatMap((m: { name: string; model: string }) => [m.name, m.model]).filter(Boolean);
        console.log(`[fallback] Found ${modelNames.length} local models via direct Ollama`);
      }
    } catch {
      // Ollama not on direct port — try via proxy
    }

    // 2. If direct failed, try via the server proxy (1 attempt, fast)
    if (modelNames.length === 0) {
      try {
        const res = await fetch('/api/ollama/tags', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          modelNames = (data.models || []).flatMap((m: { name: string; model: string }) => [m.name, m.model]).filter(Boolean);
          console.log(`[fallback] Found ${modelNames.length} local models via proxy`);
        }
      } catch {
        // proxy also failed
      }
    }

    if (modelNames.length === 0) {
      throw new Error(
        'OpenRouter ran out of credits and Ollama is not reachable.\n\n' +
        'To fix choose one:\n' +
        '  1. Top up OpenRouter credits at openrouter.ai/settings/credits\n' +
        '  OR\n' +
        '  2. Start Ollama in a terminal: ollama serve\n' +
        '     (Dost Studio will auto-detect and use hermes3:8b, hermes, or qwen2.5-coder:7b)'
      );
    }

    const normalizedPreferred = preferredModel?.toLowerCase() || '';

    // If preferred is a local name (no /), try it first
    if (normalizedPreferred && !normalizedPreferred.includes('/')) {
      const exact = modelNames.find((n) => n.toLowerCase() === normalizedPreferred);
      if (exact) return exact;
      const partial = modelNames.find((n) => n.toLowerCase().includes(normalizedPreferred));
      if (partial) return partial;
    }

    // Walk the priority list
    for (const candidate of LOCAL_FALLBACK_MODEL_PRIORITY) {
      const found = modelNames.find((n) => n.toLowerCase().startsWith(candidate.toLowerCase()));
      if (found) {
        console.log(`[fallback] Selected local model: ${found}`);
        return found;
      }
    }

    // Any model is better than nothing
    console.info(`[fallback] Using first available local model: ${modelNames[0]}`);
    return modelNames[0];
  }

  private async parseOpenRouterStream(res: Response, onChunk: (chunk: string) => void): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) { full += content; onChunk(content); }
          } catch { /* skip */ }
        }
      }
    }
    return full;
  }
}

export const ollamaService = new OllamaService();
