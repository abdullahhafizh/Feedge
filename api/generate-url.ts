import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateBadgeUrl } from '../src/security/validator.js';

function isGeneratorEnabled(): boolean {
  const raw = process.env.URL_GENERATOR_ENABLED;
  if (!raw) return true; // default: enabled
  const v = raw.toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
}

function formHtml(baseUrl: string, generatedUrl?: string, error?: string): string {
  return `<!DOCTYPE html>
<html><head><title>RSS Badge URL Generator</title>
<style>body{font-family:system-ui;max-width:700px;margin:2rem auto;padding:1rem}h1{color:#0969da}
form{background:#f6f8fa;padding:1.5rem;border-radius:8px}label{display:block;margin:1rem 0 .25rem}
input,select{width:100%;padding:.75rem;border:1px solid #d0d7de;border-radius:6px;font-size:1rem;margin-bottom:1rem}
button{background:#0969da;color:#fff;padding:.75rem 1.5rem;border:none;border-radius:6px;cursor:pointer}
.result{background:#dafbe1;padding:1rem;border-radius:8px;margin-top:1rem;word-break:break-all}
.result.error{background:#ffebe9}.preview img{max-width:100%;margin-top:1rem}</style></head><body>
<h1>🔖 RSS Badge URL Generator</h1>
<form method="POST">
<label>Username *</label><input name="username" required placeholder="your-username">
<label>Feed URL *</label><input name="feedUrl" required placeholder="https://blog.example.com/feed.xml" type="url">
<label>Max Items</label><select name="maxItems"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option></select>
<label>Theme</label><select name="theme"><option value="light">Light</option><option value="dark">Dark</option></select>
<button type="submit">Generate Badge URL</button>
</form>
${generatedUrl ? `<div class="result"><h3>✅ Your Badge URL</h3><code>${generatedUrl}</code><div class="preview"><img src="${generatedUrl}" alt="Preview"></div></div>` : ''}
${error ? `<div class="result error"><h3>❌ Error</h3><p>${error}</p></div>` : ''}
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isGeneratorEnabled()) {
    // Pretend this route does not exist when disabled
    res.status(404).send('Not Found');
    return;
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const baseUrl = `${protocol}://${host}`;

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(formHtml(baseUrl));
    return;
  }

  if (req.method === 'POST') {
    const { username, feedUrl, maxItems, theme } = req.body;
    if (!username || !feedUrl) {
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(formHtml(baseUrl, undefined, 'Username and Feed URL are required'));
      return;
    }

    const secret = process.env.SIGNING_SECRET;
    if (!secret) {
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(formHtml(baseUrl, undefined, 'Server not configured: SIGNING_SECRET missing'));
      return;
    }

    const url = generateBadgeUrl(baseUrl, username, secret, {
      maxItems: parseInt(maxItems, 10) || undefined,
      theme: theme === 'dark' ? 'dark' : 'light',
      feedUrl,
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(formHtml(baseUrl, url));
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}