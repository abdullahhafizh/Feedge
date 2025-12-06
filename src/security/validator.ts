import { createHmac, timingSafeEqual } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('security');

export interface SecurityValidationResult {
  valid: boolean;
  error?: string;
  username?: string;
  cached?: boolean;
}

interface CacheEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

const failedAttemptsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 40 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of failedAttemptsCache.entries()) {
    if (now - entry.lastSeen > CACHE_TTL_MS) {
      failedAttemptsCache.delete(key);
    }
  }
}

setInterval(cleanExpiredEntries, 5 * 60 * 1000).unref?.();

function cacheKey(username: string, signature: string): string {
  return `${username}:${signature.slice(0, 8)}`;
}

function isInSpamCache(username: string, signature: string): boolean {
  const key = cacheKey(username, signature);
  const entry = failedAttemptsCache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.lastSeen > CACHE_TTL_MS) {
    failedAttemptsCache.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(username: string, signature: string): void {
  const key = cacheKey(username, signature);
  const existing = failedAttemptsCache.get(key);
  const now = Date.now();
  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
  } else {
    failedAttemptsCache.set(key, { count: 1, firstSeen: now, lastSeen: now });
  }
}

const STATIC_NONCE = 'github-rss-badge-v1';

export function generateSignature(username: string, secret: string): string {
  const payload = `${username}:${STATIC_NONCE}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

export function verifySignature(username: string, providedSignature: string, secret: string): boolean {
  const expected = generateSignature(username, secret);
  try {
    const providedBuf = Buffer.from(providedSignature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (providedBuf.length !== expectedBuf.length) return false;
    // Use a loosely-typed wrapper to avoid TS incompatibilities between
    // Node's Buffer/ArrayBufferView definitions across environments.
    const safeEqual = timingSafeEqual as unknown as (a: any, b: any) => boolean;
    return safeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function validateRequest(
  username: string | undefined,
  signature: string | undefined,
  secret: string | undefined,
  securityEnabled: boolean,
): SecurityValidationResult {
  if (!securityEnabled) {
    logger.info('Security disabled, allowing request');
    return { valid: true, username };
  }

  if (!secret) {
    logger.error('Security enabled but no secret provided to validator');
    return { valid: false, error: 'Server misconfiguration: security secret not set' };
  }

  if (!username) {
    logger.warn('Missing username parameter');
    return { valid: false, error: 'Missing required parameter: username' };
  }

  if (!signature) {
    logger.warn('Missing signature parameter', { username });
    return { valid: false, error: 'Missing required parameter: signature' };
  }

  if (isInSpamCache(username, signature)) {
    logger.warn('Request blocked by spam cache', { username });
    return { valid: false, error: 'Too many failed attempts, please wait', cached: true };
  }

  const ok = verifySignature(username, signature, secret);
  if (!ok) {
    recordFailedAttempt(username, signature);
    logger.warn('Invalid signature', { username });
    return { valid: false, error: 'Invalid signature' };
  }

  logger.info('Request validated successfully', { username });
  return { valid: true, username };
}

export function generateBadgeUrl(
  baseUrl: string,
  username: string,
  secret: string,
  options?: { maxItems?: number; theme?: 'light' | 'dark'; feedUrl?: string },
): string {
  const sig = generateSignature(username, secret);
  const params = new URLSearchParams();
  params.set('username', username);

  // Use snake_case for all parameters
  if (options?.maxItems != null) params.set('max_items', String(options.maxItems));
  if (options?.theme) params.set('theme', options.theme);
  if (options?.feedUrl) params.set('feed', options.feedUrl);

  params.set('sig', sig);

  return `${baseUrl.replace(/\/$/, '')}/api/rss-badge?${params.toString()}`;
}

export function getCacheStats(): { entries: number; blockedPatterns: number } {
  let blocked = 0;
  for (const entry of failedAttemptsCache.values()) {
    if (entry.count >= MAX_FAILED_ATTEMPTS) blocked += 1;
  }
  return { entries: failedAttemptsCache.size, blockedPatterns: blocked };
}

export function clearCache(): void {
  failedAttemptsCache.clear();
}

