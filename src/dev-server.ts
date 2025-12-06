import { generateBadge } from './pipeline/orchestrator.js';
import { validateRequest, generateBadgeUrl } from './security/validator.js';
import { renderErrorSvg } from './svg/renderer.js';
import { loadConfig } from './config/index.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('dev-server');
const PORT = parseInt(Bun.env.PORT || '3000', 10);
const SIGNING_SECRET = Bun.env.SIGNING_SECRET;

const URL_GENERATOR_ENABLED = (() => {
  const raw = Bun.env.URL_GENERATOR_ENABLED;
  if (!raw) return true; // default: enabled
  const v = raw.toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
})();

function parseQuery(url: URL): Record<string, string> {
  const q: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (q[k] = v));
  return q;
}

function formPage(baseUrl: string, generatedUrl?: string): string {
  return `<!DOCTYPE html>
<html><head><title>Feedge - Badge Generator</title>
<style>body{font-family:system-ui;max-width:600px;margin:2rem auto;padding:1rem}
h1{color:#0969da}form{background:#f6f8fa;padding:1.5rem;border-radius:8px}
label{display:block;margin:1rem 0 .25rem}input,select{width:100%;padding:.5rem;margin-bottom:.5rem}
button{background:#0969da;color:#fff;padding:.75rem 1.5rem;border:none;cursor:pointer;margin-top:1rem}
.result{background:#dafbe1;padding:1rem;margin-top:1rem;border-radius:4px;word-break:break-all}
.preview img{max-width:100%;margin-top:1rem}</style></head><body>
<h1>📡 Feedge Generator</h1>
<form method="POST">
<label>Username</label><input name="username" required placeholder="your-username">
<label>Feed URL</label><input name="feedUrl" required placeholder="https://blog.example.com/feed.xml">
<label>Max Items</label><select name="maxItems"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option></select>
<label>Theme</label><select name="theme"><option value="light">Light</option><option value="dark">Dark</option></select>
<button type="submit">Generate URL</button>
</form>
${generatedUrl ? `<div class="result"><strong>URL:</strong><br><code>${generatedUrl}</code><div class="preview"><img src="${generatedUrl}" alt="Preview"></div></div>` : ''}
</body></html>`;
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => (params[k] = v));
  return params;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health
    if (path === '/api/health') {
      return Response.json({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    // RSS Badge
    if (path === '/api/rss-badge' && req.method === 'GET') {
      const q = parseQuery(url);

      // Parameters with defaults (snake_case)
      const maxItems = parseInt(q.max_items ?? '5', 10);
      const selectedTheme: 'light' | 'dark' = q.theme?.toLowerCase() === 'dark' ? 'dark' : 'light';
      const titleMaxLength = parseInt(q.title_max_length ?? '50', 10);
      const timeoutMs = parseInt(q.timeout_ms ?? '8000', 10);

      // Boolean flags with defaults
      const hideTitleRaw = q.hide_title?.toLowerCase();
      const hideTitle = hideTitleRaw ? ['1', 'true', 'yes'].includes(hideTitleRaw) : false;

      const fetchIconsRaw = q.fetch_icons?.toLowerCase();
      const fetchIcons = fetchIconsRaw ? !['0', 'false', 'no'].includes(fetchIconsRaw) : true; // default: true

      const config = loadConfig({ theme: selectedTheme });

      if (!SIGNING_SECRET) {
        // Server misconfiguration: security enabled but secret not set
        return new Response(renderErrorSvg('CONFIG_ERROR', config), {
          status: 500,
          headers: { 'Content-Type': 'image/svg+xml' },
        });
      }

      const validation = validateRequest(q.username, q.sig, SIGNING_SECRET, true);

      if (!validation.valid) {
        return new Response(renderErrorSvg('SECURITY_ERROR', config), {
          status: 401,
          headers: { 'Content-Type': 'image/svg+xml' },
        });
      }

      const feedUrl = q.feed;
      if (!feedUrl) {
        return new Response(renderErrorSvg('CONFIG_ERROR', config), {
          status: 400,
          headers: { 'Content-Type': 'image/svg+xml' },
        });
      }

      const result = await generateBadge(feedUrl, {
        theme: selectedTheme,
        maxItems,
        titleMaxLength,
        timeoutMs,
        badgeTitle: q.title,
        hideTitle,
        fetchIcons,
      });

      return new Response(result.svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // URL Generator
    if (path === '/generate-url' || path === '/api/generate-url') {
      if (!URL_GENERATOR_ENABLED) {
        return new Response('URL generator is disabled on this deployment.', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      const baseUrl = `http://localhost:${PORT}`;

      if (req.method === 'GET') {
        return new Response(formPage(baseUrl), { headers: { 'Content-Type': 'text/html' } });
      }
      if (req.method === 'POST') {
        const body = await parseBody(req);

        let genUrl: string;
        if (SIGNING_SECRET) {
          // Security enabled: generate signed URL with username + signature
          genUrl = generateBadgeUrl(baseUrl, body.username, SIGNING_SECRET, {
            maxItems: parseInt(body.maxItems, 10) || undefined,
            theme: body.theme === 'dark' ? 'dark' : 'light',
            feedUrl: body.feedUrl,
          });
        } else {
          // Security disabled: generate unsigned URL, no username/signature needed
          const params = new URLSearchParams();
          params.set('feed', body.feedUrl);
          if (body.maxItems) params.set('max_items', body.maxItems);
          if (body.theme) params.set('theme', body.theme);
          genUrl = `${baseUrl.replace(/\/$/, '')}/api/rss-badge?${params.toString()}`;
        }

        return new Response(formPage(baseUrl, genUrl), { headers: { 'Content-Type': 'text/html' } });
      }
    }

    // Root redirect
    if (path === '/') {
      return Response.redirect('/generate-url', 302);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

logger.info('Dev server started', { port: PORT });
console.log(`\n📡 Feedge dev server at http://localhost:${PORT}`);
console.log(`   🔗 URL Generator: http://localhost:${PORT}/generate-url\n`);