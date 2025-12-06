import type { RenderablePost } from '../model/types.js';
import type { Post } from '../rss/parser.js';
import { createLogger } from '../utils/logger.js';
import { fetchOgMetadataBatch } from './og-fetcher.js';

const logger = createLogger('post-selector');

export interface SelectOptions {
  maxItems?: number;
  titleMaxLength?: number;
  fetchIcons?: boolean; // Enable OG icon fetching (default: false)
}

export interface SelectionResult {
  posts: RenderablePost[];
  metadata: { totalAvailable: number; selected: number; skipped: number; isEmpty: boolean };
}

export function sortPostsByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  const cut = title.slice(0, maxLen - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut) + '...';
}

export function normalizeUrl(url: string): string {
  let u = url.trim();
  if (u.startsWith('http://')) u = 'https://' + u.slice(7);
  u = u.replace(/[.,;:!?]+$/, '');
  try {
    new URL(u);
    return u;
  } catch {
    return url;
  }
}

function formatDateLabel(date: Date): string | undefined {
  if (!(date instanceof Date)) return undefined;
  const time = date.getTime();
  if (Number.isNaN(time)) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function selectPosts(posts: Post[], options: SelectOptions = {}): SelectionResult {
  const maxItems = options.maxItems ?? 5;
  const maxLen = options.titleMaxLength ?? 50;

  const sorted = sortPostsByDate(posts);
  const selected = sorted.slice(0, maxItems);
  const rendered: RenderablePost[] = selected.map((p) => ({
    displayTitle: truncateTitle(p.title, maxLen),
    url: normalizeUrl(p.url),
    dateLabel: formatDateLabel(p.publishedAt),
  }));

  logger.info('Selection complete', { total: posts.length, selected: rendered.length });

  return {
    posts: rendered,
    metadata: {
      totalAvailable: posts.length,
      selected: rendered.length,
      skipped: posts.length - rendered.length,
      isEmpty: rendered.length === 0,
    },
  };
}

/**
 * Async version that optionally fetches OG icons for each post.
 */
export async function selectPostsWithIcons(
  posts: Post[],
  options: SelectOptions = {}
): Promise<SelectionResult> {
  const result = selectPosts(posts, options);

  if (!options.fetchIcons || result.posts.length === 0) {
    return result;
  }

  // Fetch OG metadata in parallel
  const urls = result.posts.map((p) => p.url);
  const ogMap = await fetchOgMetadataBatch(urls, 3);

  // Attach iconUrl to each post
  const postsWithIcons: RenderablePost[] = result.posts.map((post) => {
    const og = ogMap.get(post.url);
    return {
      ...post,
      iconUrl: og?.iconUrl,
    };
  });

  logger.info('Icons fetched', { count: postsWithIcons.filter((p) => p.iconUrl).length });

  return {
    ...result,
    posts: postsWithIcons,
  };
}

export function isEmptyResult(result: SelectionResult): boolean {
  return result.metadata.isEmpty;
}