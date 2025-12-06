import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateBadgeUrl } from '../src/security/validator.js';

function isGeneratorEnabled(): boolean {
  const raw = process.env.URL_GENERATOR_ENABLED;
  if (!raw) return true; // default: enabled
  const v = raw.toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
}

function formHtml(): string {
  return `<!DOCTYPE html>
<html><head><title>Feedge - Badge URL Generator</title>
<style>
body{font-family:system-ui;max-width:700px;margin:2rem auto;padding:1rem}
h1{color:#0969da}
form{background:#f6f8fa;padding:1.5rem;border-radius:8px}
label{display:block;margin:1rem 0 .25rem;font-weight:500}
input,select{width:100%;padding:.75rem;border:1px solid #d0d7de;border-radius:6px;font-size:1rem;margin-bottom:1rem;box-sizing:border-box}
button[type="submit"]{background:#0969da;color:#fff;padding:.75rem 1.5rem;border:none;border-radius:6px;cursor:pointer;font-size:1rem;transition:background .2s}
button[type="submit"]:hover{background:#0860ca}
button[type="submit"]:disabled{background:#8c959f;cursor:not-allowed}
.result{padding:1.5rem;border-radius:8px;margin-top:1.5rem;display:none}
.result.success{background:#dafbe1;display:block}
.result.error{background:#ffebe9;display:block}
.code-block{position:relative;margin:1rem 0}
.code-block label{font-size:.875rem;color:#57606a;margin-bottom:.5rem;display:block}
.code-block code{display:block;background:#0d1117;color:#c9d1d9;padding:1rem;border-radius:6px;font-size:.875rem;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
.copy-btn{position:absolute;top:1.75rem;right:.5rem;background:#238636;color:#fff;border:none;padding:.4rem .75rem;border-radius:4px;cursor:pointer;font-size:.75rem;transition:background .2s}
.copy-btn:hover{background:#2ea043}
.copy-btn.copied{background:#8250df}
.preview{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #d0d7de}
.preview img{max-width:100%;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.12)}
.spinner{display:inline-block;width:1rem;height:1rem;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-right:.5rem;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body>
<h1>📡 Feedge - Badge URL Generator</h1>
<form id="generator-form">
<label>Username *</label><input name="username" id="username" required placeholder="your-username">
<label>Feed URL *</label><input name="feedUrl" id="feedUrl" required placeholder="https://blog.example.com/feed.xml" type="url">
<label>Max Items</label><select name="maxItems" id="maxItems"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option></select>
<label>Theme</label><select name="theme" id="theme"><option value="light">Light</option><option value="dark">Dark</option></select>
<button type="submit" id="submit-btn">Generate Badge URL</button>
</form>

<div class="result" id="result">
  <h3 id="result-title"></h3>
  <div id="result-content"></div>
</div>

<script>
const form = document.getElementById('generator-form');
const submitBtn = document.getElementById('submit-btn');
const resultDiv = document.getElementById('result');
const resultTitle = document.getElementById('result-title');
const resultContent = document.getElementById('result-content');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>Generating...';
  resultDiv.className = 'result';
  
  const data = {
    username: document.getElementById('username').value,
    feedUrl: document.getElementById('feedUrl').value,
    maxItems: document.getElementById('maxItems').value,
    theme: document.getElementById('theme').value
  };
  
  try {
    const res = await fetch('/api/generate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const json = await res.json();
    
    if (json.error) {
      resultDiv.className = 'result error';
      resultTitle.textContent = '❌ Error';
      resultContent.innerHTML = '<p>' + json.error + '</p>';
    } else {
      resultDiv.className = 'result success';
      resultTitle.textContent = '✅ Badge Generated Successfully!';
      resultContent.innerHTML = buildResultHtml(json);
    }
  } catch (err) {
    resultDiv.className = 'result error';
    resultTitle.textContent = '❌ Error';
    resultContent.innerHTML = '<p>Network error. Please try again.</p>';
  }
  
  submitBtn.disabled = false;
  submitBtn.textContent = 'Generate Badge URL';
});

function buildResultHtml(data) {
  var escapeHtml = function(s) { return s.replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  return '<div class="code-block">' +
    '<label>📋 Markdown (for README.md)</label>' +
    '<code id="markdown-code">' + data.markdown + '</code>' +
    '<button class="copy-btn" onclick="copyCode(\'markdown-code\', this)">Copy</button>' +
    '</div>' +
    '<div class="code-block">' +
    '<label>🔗 Direct URL</label>' +
    '<code id="url-code">' + data.url + '</code>' +
    '<button class="copy-btn" onclick="copyCode(\'url-code\', this)">Copy</button>' +
    '</div>' +
    '<div class="code-block">' +
    '<label>🌐 HTML</label>' +
    '<code id="html-code">' + escapeHtml(data.html) + '</code>' +
    '<button class="copy-btn" onclick="copyCode(\'html-code\', this)">Copy</button>' +
    '</div>' +
    '<div class="preview">' +
    '<label>👁️ Preview</label>' +
    '<img src="' + data.url + '" alt="Badge Preview">' +
    '</div>';
}

function copyCode(id, btn) {
  const el = document.getElementById(id);
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}
</script>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isGeneratorEnabled()) {
    res.status(404).send('Not Found');
    return;
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const baseUrl = `${protocol}://${host}`;

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(formHtml());
    return;
  }

  if (req.method === 'POST') {
    const wantsJson = req.headers.accept?.includes('application/json');
    const { username, feedUrl, maxItems, theme } = req.body;

    if (!username || !feedUrl) {
      if (wantsJson) {
        res.status(400).json({ error: 'Username and Feed URL are required' });
      } else {
        res.status(400).send('Username and Feed URL are required');
      }
      return;
    }

    const secret = process.env.SIGNING_SECRET;
    if (!secret) {
      if (wantsJson) {
        res.status(500).json({ error: 'Server not configured: SIGNING_SECRET missing' });
      } else {
        res.status(500).send('Server not configured');
      }
      return;
    }

    const url = generateBadgeUrl(baseUrl, username, secret, {
      maxItems: parseInt(maxItems, 10) || undefined,
      theme: theme === 'dark' ? 'dark' : 'light',
      feedUrl,
    });

    const markdown = `![Blog Posts](${url})`;
    const html = `<a href="${url}"><img src="${url}" alt="Blog Posts"></a>`;

    if (wantsJson) {
      res.status(200).json({ url, markdown, html });
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`<a href="${url}">${url}</a>`);
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}