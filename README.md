# 📡 Feedge

[![CI](https://github.com/abdullahhafizh/Feedge/actions/workflows/ci.yml/badge.svg)](https://github.com/abdullahhafizh/Feedge/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/abdullahhafizh/Feedge)

**Feed + Badge = Feedge** — Dynamic SVG badge that displays your latest blog posts from an RSS feed, designed for GitHub README profiles.

![Example Badge](https://via.placeholder.com/400x200?text=RSS+Badge+Preview)

## ✨ Features

- **Dynamic Updates**: Badge updates automatically when you publish new posts
- **Secure**: HMAC-based authentication prevents unauthorized usage
- **Customizable**: Light/dark themes, configurable post count
- **Fast**: Optimized caching for quick loads
- **Easy Deploy**: One-click deployment to Vercel

## 🚀 Quick Start

### Option 1: Deploy Your Own (Recommended)

1. **Fork this repository**

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "New Project" → Import your forked repo
   - Add environment variable:
     - `SIGNING_SECRET`: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Click "Deploy"

3. **Generate your badge URL**
   - Visit `https://your-app.vercel.app/generate-url`
   - Enter your GitHub username and RSS feed URL
   - Copy the generated Markdown snippet

4. **Add to your README**
   ```markdown
   ![Blog Posts](https://your-app.vercel.app/api/rss-badge?username=abdullahhafizh&sig=YOUR_SIGNATURE&feed=YOUR_FEED_URL)
   ```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/abdullahhafizh/Feedge.git
cd Feedge

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env and set SIGNING_SECRET

# Start dev server
bun dev

# Open http://localhost:3000/generate-url
```

## 📋 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SIGNING_SECRET` | Yes* | - | Secret key for HMAC signatures |
| `DEFAULT_FEED_URL` | No | - | Default RSS feed URL |
| `MAX_ITEMS` | No | `5` | Maximum posts to display |
| `DEFAULT_THEME` | No | `light` | Theme: `light` or `dark` |
| `TIMEOUT_MS` | No | `8000` | Request timeout in ms |
| `SECURITY_ENABLED` | No | `true` | Enable/disable security |

*Required when `SECURITY_ENABLED` is true

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|----------|
| `username` | Your identifier (required with security) | - |
| `sig` | HMAC signature (required with security) | - |
| `feed` | RSS feed URL | - |
| `max_items` | Number of posts (1-20) | `5` |
| `theme` | `light` or `dark` | `light` |
| `title_max_length` | Max title characters | `50` |
| `title` | Custom badge header text | `Latest Blog Posts` |
| `hide_title` | Hide badge header (`1`, `true`, `yes`) | `false` |
| `fetch_icons` | Fetch OG/favicon per post (default ON, use `0`/`false`/`no` to disable) | `true` |
| `timeout_ms` | Request timeout in ms | `8000` |

## 🎨 Themes

### Light Theme (Default)
```markdown
![Blog Posts](https://your-app.vercel.app/api/rss-badge?...&theme=light)
```

### Dark Theme
```markdown
![Blog Posts](https://your-app.vercel.app/api/rss-badge?...&theme=dark)
```

## 🔒 Security

This badge uses HMAC-SHA256 signatures to prevent unauthorized usage:

1. Each deployment has a unique `SIGNING_SECRET`
2. The URL generator creates signed URLs using your username
3. Requests without valid signatures are rejected
4. Failed attempts are rate-limited (max 10 failures per 40 min)

**Important**: Never share your `SIGNING_SECRET` or commit it to your repository.

### Secret Rotation

To rotate your `SIGNING_SECRET`:

1. Generate a new secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `SIGNING_SECRET` in Vercel dashboard → Settings → Environment Variables
3. Redeploy your project
4. Regenerate all badge URLs from `/generate-url`
5. Update your README with new URLs

> **Note**: Old URLs will stop working immediately after secret rotation.

## 🔧 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/rss-badge` | Returns SVG badge |
| `GET /api/generate-url` | URL generator form |
| `POST /api/generate-url` | Generate signed URL |
| `GET /api/health` | Health check |

## 📁 Project Structure

```
├── api/                    # Vercel API routes
│   ├── rss-badge.ts       # Main badge endpoint
│   ├── generate-url.ts    # URL generator
│   └── health.ts          # Health check
├── src/
│   ├── config/            # Configuration module
│   ├── model/             # TypeScript types
│   ├── pipeline/          # Badge generation pipeline
│   ├── rss/               # RSS fetching & parsing
│   ├── security/          # HMAC validation
│   ├── svg/               # SVG renderer
│   ├── transform/         # Data transformation
│   └── utils/             # Logging utilities
├── tests/                 # Test suites
├── vercel.json           # Vercel configuration
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests with watch mode
bun test:watch

# Run specific test file
bun test -- tests/parser.test.ts
```

Tests are organized by phase with codes like `[F03-01]` for traceability.

## 🛠️ CLI Tool

Generate badges locally for testing:

```bash
# Generate badge to stdout
bun generate -- https://blog.example.com/feed.xml

# Save to file
bun generate -- -f https://blog.example.com/feed.xml -o badge.svg

# With options
bun generate -- https://blog.example.com/feed.xml -n 3 -t dark
```

## ❓ FAQ

### Badge not updating?
- Badges are cached for 5 minutes. Wait or add `&t=timestamp` to force refresh
- Check if your RSS feed is accessible and valid XML
- Verify your RSS feed has valid `<pubDate>` or `<updated>` tags

### Getting "Access Denied" or "Configuration Error"?
- **Access Denied**: URL missing valid `username` and `sig`. Regenerate from `/generate-url`
- **Configuration Error**: `SIGNING_SECRET` not set in environment. Add it in Vercel dashboard

### Text getting cut off?
- Titles truncated at 50 characters by default
- Add `&title_max_length=80` to URL for longer titles

### Works locally but not on Vercel?
- Check `SIGNING_SECRET` is set in Vercel → Settings → Environment Variables
- Verify RSS feed URL is publicly accessible (not behind auth)
- Check Vercel function logs for error details

### Wrong theme colors?
- Use `&theme=dark` for dark README backgrounds
- Use `&theme=light` for light README backgrounds
- Badge has transparent background; only text colors change

### Icons not showing?
- Icons are enabled by default (`fetch_icons=true`)
- Add `&fetch_icons=0` to disable and use emoji instead
- Some sites may block favicon requests
- Falls back to 📄 emoji if fetch fails

## 📈 Roadmap

- [ ] Multi-feed support (aggregate multiple RSS sources)
- [ ] Custom color schemes via query params
- [ ] Category/tag filtering
- [ ] More badge layouts (compact, wide, grid)
- [ ] Webhook notifications for monitoring
- [ ] PNG/JPEG output format
- [ ] Click analytics

## 🐛 Troubleshooting

### Error SVG Messages

| Error | Cause | Solution |
|-------|-------|----------|
| ⚙️ Configuration Error | `SIGNING_SECRET` not set | Add env var in Vercel |
| 🔒 Access Denied | Invalid/missing signature | Regenerate URL from `/generate-url` |
| 🌐 Network Error | RSS feed unreachable | Check feed URL is public |
| ⏱️ Timeout | Feed took too long | Increase `timeout_ms` or check feed |
| 📭 No Posts | Feed empty or invalid | Verify feed has items with dates |

### Reading Logs

For Vercel deployments:
1. Go to Vercel dashboard → Your project
2. Click "Deployments" → Select latest
3. Click "Functions" tab → Click function name
4. View real-time logs

Log format:
```
[LEVEL] [module] message { context }
```

Example:
```
[INFO] [pipeline] Badge generated { posts: 5, duration: 234 }
[ERROR] [rss-fetcher] Fetch failed { url: '...', error: 'timeout' }
```

## 📄 License

Licensed under the **Apache License 2.0** - see [LICENSE](LICENSE) for details.

### Important Notes

- You **must** retain the [NOTICE](NOTICE) file in all copies and derivative works
- You **must** provide attribution to the original Feedge project
- The "Feedge" name and branding are protected trademarks
- See [CONTRIBUTING.md](CONTRIBUTING.md) for fork and attribution requirements

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

### Quick Rules

1. ✅ **Fork via GitHub** (don't clone and re-upload)
2. ✅ **Keep attribution** (LICENSE, NOTICE, copyright headers)
3. ✅ **Link back** to the original repository
4. ❌ **Don't claim as your own** original work

---

Made with ❤️ for the GitHub community | © 2024 Feedge Contributors

## 📖 Detailed Deployment Guide

### Step-by-Step Vercel Deployment

1. **Create Vercel Account** (if needed)
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Fork Repository**
   - Click "Fork" on this repo
   - Keep all default settings

3. **Import to Vercel**
   - In Vercel dashboard, click "Add New..." → "Project"
   - Select your forked repository
   - Framework Preset: "Other"
   - Root Directory: `./` (default)

4. **Configure Environment Variables**
   - Expand "Environment Variables"
   - Add `SIGNING_SECRET`:
     ```
     Name: SIGNING_SECRET
     Value: (generate with command below)
     ```
   - Generate value:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~1-2 min)

6. **Generate Badge URL**
   - Visit `https://YOUR-APP.vercel.app/generate-url`
   - Enter your GitHub username
   - Enter your blog's RSS feed URL
   - Select theme and options
   - Click "Generate URL"
   - Copy the generated Markdown

7. **Add to Your Profile README**
   - Edit your `github.com/USERNAME/USERNAME` README
   - Paste the Markdown snippet
   - Commit changes

### URL Generator

The `/generate-url` page provides a simple form to:
- Enter your username and RSS feed URL
- Select theme and post count
- Generate a properly signed URL
- Preview the badge before using

No coding required - just fill the form and copy the result!
