import { XMLParser } from 'fast-xml-parser';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('rss-parser');

export interface Post {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  source?: string;
  description?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: true,
  trimValues: true,
});

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitize(val: unknown): string {
  if (typeof val !== 'string') return String(val ?? '');
  return stripHtml(val).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function parseDate(val: unknown): Date {
  if (!val) return new Date(0);
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if ('#text' in o) return String(o['#text']);
    if ('@_value' in o) return String(o['@_value']);
  }
  return '';
}

function extractLink(item: Record<string, unknown>): string {
  if (typeof item.link === 'string') return item.link;
  if (item.link && typeof item.link === 'object') {
    const l = item.link as Record<string, unknown>;
    if ('@_href' in l) return String(l['@_href']);
    if (Array.isArray(item.link)) {
      for (const x of item.link) {
        if (x && typeof x === 'object' && '@_href' in x) return String((x as Record<string, unknown>)['@_href']);
      }
    }
  }
  if (item.guid) {
    const g = extractText(item.guid);
    if (g.startsWith('http')) return g;
  }
  return '';
}

export function parseFeed(xml: string): Post[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (err) {
    logger.error('XML parse failed', { error: (err as Error).message });
    throw new Error(`Failed to parse XML: ${(err as Error).message}`);
  }

  let items: unknown[] = [];
  let source = 'unknown';

  if (parsed.rss && typeof parsed.rss === 'object') {
    const ch = (parsed.rss as Record<string, unknown>).channel as Record<string, unknown> | undefined;
    if (ch) {
      source = sanitize(ch.title) || 'RSS Feed';
      items = Array.isArray(ch.item) ? ch.item : ch.item ? [ch.item] : [];
    }
  } else if (parsed.feed && typeof parsed.feed === 'object') {
    const f = parsed.feed as Record<string, unknown>;
    source = sanitize(f.title) || 'Atom Feed';
    items = Array.isArray(f.entry) ? f.entry : f.entry ? [f.entry] : [];
  } else if (parsed['rdf:RDF'] && typeof parsed['rdf:RDF'] === 'object') {
    const r = parsed['rdf:RDF'] as Record<string, unknown>;
    items = Array.isArray(r.item) ? r.item : r.item ? [r.item] : [];
    source = 'RDF Feed';
  }

  const posts: Post[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const title = sanitize(extractText(o.title));
    const link = extractLink(o);
    if (!title || !link) continue;
    posts.push({
      id: link,
      title,
      url: link,
      publishedAt: parseDate(o.pubDate || o.published || o.updated || o['dc:date']),
      source,
      description: sanitize(extractText(o.description || o.summary || o.content)) || undefined,
    });
  }

  logger.info('Parsed feed', { total: items.length, valid: posts.length });
  return posts;
}

export function tryParseFeed(xml: string): { posts: Post[]; error?: string } {
  try {
    return { posts: parseFeed(xml) };
  } catch (err) {
    return { posts: [], error: (err as Error).message };
  }
}