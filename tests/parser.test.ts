import { describe, it, expect } from 'bun:test';
import { parseFeed, tryParseFeed } from '../src/rss/parser.js';
import { logTestResult } from '../src/utils/logger.js';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <title>First Post</title>
      <link>https://blog.example.com/first</link>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://blog.example.com/second</link>
      <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Third &amp; Special</title>
      <link>https://blog.example.com/third</link>
      <pubDate>Wed, 03 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <entry>
    <title>Atom Entry</title>
    <link href="https://blog.example.com/atom"/>
    <published>2024-01-01T12:00:00Z</published>
  </entry>
</feed>`;

const INVALID_RSS = `<invalid>not valid`;

describe('[F05] RSS Parser Module', () => {
  it('[F05-02] should parse RSS feed with required fields', () => {
    const posts = parseFeed(SAMPLE_RSS);
    const ok = posts.length === 3 && posts.every((p) => p.title && p.url && p.publishedAt);
    logTestResult('F05-02', 'Parses RSS with required fields', ok);
    expect(ok).toBe(true);
  });

  it('[F05-03] should use internal post model', () => {
    const posts = parseFeed(SAMPLE_RSS);
    const ok = posts.every((p) => 'id' in p && 'title' in p && 'url' in p && 'publishedAt' in p);
    logTestResult('F05-03', 'Uses internal post model', ok);
    expect(ok).toBe(true);
  });

  it('[F05-04] should sanitize HTML and special chars', () => {
    const posts = parseFeed(SAMPLE_RSS);
    const third = posts.find((p) => p.title.includes('Special'));
    const ok = !!third && third.title.includes('&') && !third.title.includes('&amp;');
    logTestResult('F05-04', 'Sanitizes HTML and special chars', ok);
    expect(ok).toBe(true);
  });

  it('[F05-05] should normalize dates', () => {
    const posts = parseFeed(SAMPLE_RSS);
    const ok = posts.every((p) => p.publishedAt instanceof Date && !isNaN(p.publishedAt.getTime()));
    logTestResult('F05-05', 'Normalizes dates correctly', ok);
    expect(ok).toBe(true);
  });

  it('[F05-06] should skip items without title or link', () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Blog</title>
  <item><title>Good</title><link>https://example.com/good</link></item>
  <item><title>No Link</title></item>
</channel></rss>`;
    const posts = parseFeed(xml);
    const ok = posts.length === 1 && posts[0].title === 'Good';
    logTestResult('F05-06', 'Skips invalid items', ok);
    expect(ok).toBe(true);
  });

  it('[F05-07] should handle various formats', () => {
    const atomPosts = parseFeed(SAMPLE_ATOM);
    const invalidResult = tryParseFeed(INVALID_RSS);
    const ok = atomPosts.length === 1 && invalidResult.posts.length === 0;
    logTestResult('F05-07', 'Handles various RSS samples', ok);
    expect(ok).toBe(true);
  });
});