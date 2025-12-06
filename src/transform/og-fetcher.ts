import { createLogger } from '../utils/logger.js';

const logger = createLogger('og-fetcher');

export interface OgMetadata {
  iconUrl?: string;
  title?: string;
  description?: string;
}

const OG_FETCH_TIMEOUT_MS = 3000;
const MAX_HTML_SIZE = 50_000; // 50KB max to scan for OG tags

/**
 * Extract OG image or favicon from a URL's HTML head.
 *
 * Priority order:
 * 1. og:image (Open Graph - rich preview image)
 * 2. twitter:image (Twitter Card image)
 * 3. <link rel="icon"> or apple-touch-icon (fallback if no OG)
 * 4. /favicon.ico (last resort fallback)
 */
export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  try {
    const parsedUrl = new URL(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    // Cast to any so TypeScript doesn't complain about the Response/Headers
    // shape when building in non-Bun environments (e.g. Vercel Node runtime).
    const response = (await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Feedge/1.0 (Icon Fetcher)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    })) as any;

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.debug('OG fetch failed', { url, status: response.status });
      return { iconUrl: getFaviconFallback(parsedUrl) };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { iconUrl: getFaviconFallback(parsedUrl) };
    }

    // Read limited HTML
    const reader = response.body?.getReader();
    if (!reader) return { iconUrl: getFaviconFallback(parsedUrl) };

    let html = '';
    const decoder = new TextDecoder();

    while (html.length < MAX_HTML_SIZE) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Stop early if we've passed </head>
      if (html.includes('</head>')) break;
    }

    reader.cancel().catch(() => {}); // Clean up

    const metadata = parseOgFromHtml(html, parsedUrl);
    return metadata;
  } catch (error) {
    logger.debug('OG fetch error', { url, error: String(error) });
    try {
      const parsedUrl = new URL(url);
      return { iconUrl: getFaviconFallback(parsedUrl) };
    } catch {
      return {};
    }
  }
}

function getFaviconFallback(parsedUrl: URL): string {
  return withIconCacheBuster(`${parsedUrl.origin}/favicon.ico`);
}

function withIconCacheBuster(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('badge_icon')) {
      u.searchParams.set('badge_icon', '1');
    }
    return u.toString();
  } catch {
    return url;
  }
}

function parseOgFromHtml(html: string, baseUrl: URL): OgMetadata {
  const result: OgMetadata = {};

  // Priority 1: og:image (Open Graph - rich preview)
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

  if (ogImageMatch?.[1]) {
    result.iconUrl = resolveUrl(ogImageMatch[1], baseUrl);
    return result;
  }

  // Priority 2: twitter:image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

  if (twitterImageMatch?.[1]) {
    result.iconUrl = resolveUrl(twitterImageMatch[1], baseUrl);
    return result;
  }

  // Priority 3: Favicon (fallback if no OG image)
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);

  if (faviconMatch?.[1]) {
    const resolvedIcon = resolveUrl(faviconMatch[1], baseUrl);
    result.iconUrl = withIconCacheBuster(resolvedIcon);
    return result;
  }

  // Priority 4: Fallback to /favicon.ico
  result.iconUrl = getFaviconFallback(baseUrl);
  return result;
}

function resolveUrl(url: string, baseUrl: URL): string {
  try {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `${baseUrl.origin}${url}`;
    }
    if (!url.startsWith('http')) {
      return new URL(url, baseUrl.href).href;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Fetch OG metadata for multiple URLs in parallel with concurrency limit.
 */
export async function fetchOgMetadataBatch(
  urls: string[],
  concurrency = 3
): Promise<Map<string, OgMetadata>> {
  const results = new Map<string, OgMetadata>();
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const metadata = await fetchOgMetadata(url);
      results.set(url, metadata);
    }
  }

  const workers = Array(Math.min(concurrency, urls.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  logger.info('OG metadata batch complete', { count: results.size });
  return results;
}
