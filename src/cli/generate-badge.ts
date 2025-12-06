#!/usr/bin/env bun
import { generateBadge } from '../pipeline/orchestrator.js';

async function main() {
  const args = Bun.argv.slice(2);
  let feedUrl = '';
  let outputFile = '';
  let maxItems: number | undefined;
  let theme: 'light' | 'dark' | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--feed' || arg === '-f') feedUrl = args[++i];
    else if (arg === '--output' || arg === '-o') outputFile = args[++i];
    else if (arg === '--max-items' || arg === '-n') maxItems = parseInt(args[++i], 10);
    else if (arg === '--theme' || arg === '-t') theme = args[++i] as 'light' | 'dark';
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun generate <feed-url> [options]
  -f, --feed <url>      RSS feed URL
  -o, --output <file>   Output file (default: stdout)
  -n, --max-items <n>   Max posts (default: 5)
  -t, --theme <theme>   light or dark (default: light)
  -h, --help            Show help
`);
      process.exit(0);
    } else if (!feedUrl && arg.startsWith('http')) {
      feedUrl = arg;
    }
  }

  if (!feedUrl) {
    console.error('Error: Feed URL required');
    process.exit(1);
  }

  console.log(`\n🔖 Generating badge for ${feedUrl}...\n`);

  const result = await generateBadge(feedUrl, { maxItems, theme });

  if (!result.success) {
    console.error(`❌ ${result.error?.message}`);
    process.exit(1);
  }

  console.log(`✅ Posts found: ${result.metadata.postsFound}, rendered: ${result.metadata.postsRendered}`);

  if (outputFile) {
    await Bun.write(outputFile, result.svg);
    console.log(`📄 Saved to ${outputFile}`);
  } else {
    console.log('\n--- SVG ---\n');
    console.log(result.svg);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});