import { createLogger } from '../utils/logger.js';

const logger = createLogger('rss-fetcher');

export interface FetchOptions {
  timeoutMs?: number;
  maxResponseSize?: number;
  retryCount?: number;
}

export interface FetchResult {
  success: boolean;
  body?: string;
  status?: number;
  error?: { type: 'network' | 'timeout' | 'http' | 'size'; message: string };
  duration: number;
  retries: number;
}

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_MAX_SIZE = 1024 * 1024; // 1MB
const DEFAULT_RETRIES = 2;
const USER_AGENT = 'Feedge/1.0';

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchFeed(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxSize = options.maxResponseSize ?? DEFAULT_MAX_SIZE;
  const maxRetries = options.retryCount ?? DEFAULT_RETRIES;

  const start = Date.now();
  let lastError: Error | undefined;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
      logger.info(`Retry ${attempt}/${maxRetries}`, { delay });
      await sleep(delay);
      retries++;
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      // Cast to any so this compiles both in Bun (where Response has extra
      // properties) and in Node/Vercel where the TS lib for Response differs.
      const res = (await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: controller.signal,
      })) as any;

      clearTimeout(tid);

      if (!res.ok) {
        if (res.status >= 500 && attempt < maxRetries) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }
        return { success: false, status: res.status, error: { type: 'http', message: `HTTP ${res.status}` }, duration: Date.now() - start, retries };
      }

      const len = res.headers.get('content-length');
      if (len && parseInt(len, 10) > maxSize) {
        return { success: false, error: { type: 'size', message: `Response too large: ${len}` }, duration: Date.now() - start, retries };
      }

      const body = await res.text();
      if (body.length > maxSize) {
        return { success: false, error: { type: 'size', message: `Body too large: ${body.length}` }, duration: Date.now() - start, retries };
      }

      logger.info('Fetch success', { url, duration: Date.now() - start, size: body.length });
      return { success: true, body, status: res.status, duration: Date.now() - start, retries };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.name === 'AbortError') {
        if (attempt < maxRetries) continue;
        return { success: false, error: { type: 'timeout', message: `Timeout after ${timeoutMs}ms` }, duration: Date.now() - start, retries };
      }
      if (attempt < maxRetries) continue;
    }
  }

  return { success: false, error: { type: 'network', message: lastError?.message ?? 'Unknown error' }, duration: Date.now() - start, retries };
}