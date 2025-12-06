import { describe, it, expect } from 'bun:test';
import { selectPosts, sortPostsByDate, truncateTitle, normalizeUrl, isEmptyResult } from '../src/transform/selector.js';
import type { Post } from '../src/rss/parser.js';
import { logTestResult } from '../src/utils/logger.js';

const makePosts = (): Post[] => [
  { id: '1', title: 'Oldest', url: 'https://example.com/1', publishedAt: new Date('2024-01-01'), source: 'Test' },
  { id: '2', title: 'Middle', url: 'https://example.com/2', publishedAt: new Date('2024-01-15'), source: 'Test' },
  { id: '3', title: 'Newest', url: 'https://example.com/3', publishedAt: new Date('2024-01-30'), source: 'Test' },
  { id: '4', title: 'Very Long Title That Should Be Truncated Because It Exceeds Max', url: 'https://example.com/4', publishedAt: new Date('2024-01-20'), source: 'Test' },
  { id: '5', title: 'HTTP', url: 'http://example.com/5', publishedAt: new Date('2024-01-10'), source: 'Test' },
];

describe('[F06] Post Selection Module', () => {
  it('[F06-01] should sort by date (newest first)', () => {
    const sorted = sortPostsByDate(makePosts());
    const ok = sorted[0].id === '3' && sorted[sorted.length - 1].id === '1';
    logTestResult('F06-01', 'Sorts posts by date correctly', ok);
    expect(ok).toBe(true);
  });

  it('[F06-02] should apply maxItems limit', () => {
    const result = selectPosts(makePosts(), { maxItems: 3 });
    logTestResult('F06-02', 'Applies maxItems limit', result.posts.length === 3);
    expect(result.posts.length).toBe(3);
  });

  it('[F06-03] should truncate titles with ellipsis', () => {
    const t = truncateTitle('This is a very long title that should definitely be truncated', 30);
    const ok = t.length <= 30 && t.endsWith('...');
    logTestResult('F06-03', 'Truncates titles with ellipsis', ok);
    expect(ok).toBe(true);
  });

  it('[F06-04] should normalize URLs to https', () => {
    const n = normalizeUrl('http://example.com/page');
    logTestResult('F06-04', 'Normalizes URLs to https', n.startsWith('https://'));
    expect(n.startsWith('https://')).toBe(true);
  });

  it('[F06-05] should create renderable post structure', () => {
    const result = selectPosts(makePosts(), { maxItems: 5 });
    const ok = result.posts.every((p) => 'displayTitle' in p && 'url' in p);
    logTestResult('F06-05', 'Creates renderable post structure', ok);
    expect(ok).toBe(true);
  });

  it('[F06-06] should include metadata', () => {
    const result = selectPosts(makePosts(), { maxItems: 3 });
    const ok = result.metadata.totalAvailable === 5 && result.metadata.selected === 3 && result.metadata.skipped === 2;
    logTestResult('F06-06', 'Includes selection metadata', ok);
    expect(ok).toBe(true);
  });

  it('[F06-07] should signal empty result', () => {
    const result = selectPosts([], { maxItems: 5 });
    const ok = isEmptyResult(result) && result.metadata.isEmpty;
    logTestResult('F06-07', 'Signals empty result correctly', ok);
    expect(ok).toBe(true);
  });

  it('[F06-08] should format date label as YYYY-MM-DD', () => {
    const result = selectPosts(makePosts(), { maxItems: 1 });
    const first = result.posts[0];
    const hasDate = typeof first.dateLabel === 'string' && first.dateLabel.length === 10;
    logTestResult('F06-08', 'Formats date label for posts', hasDate);
    expect(first.dateLabel).toBe('2024-01-30');
  });
});