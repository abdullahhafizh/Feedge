/*
 * Dynamic redirect endpoint - redirects to the post at a given position in the RSS feed
 * Usage: /api/redirect?feed=<feedUrl>&position=<0-N>&sig=<signature>&username=<username>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateRequest } from '../src/security/validator.js';
import { fetchFeed } from '../src/rss/fetcher.js';
import { tryParseFeed } from '../src/rss/parser.js';
import { sortPostsByDate } from '../src/transform/selector.js';

const UTM_VALUE = 'feedge.abdullahhafizh.my.id';

function appendReferral(originalUrl: string): string {
  try {
    const u = new URL(originalUrl);
    u.searchParams.set('utm_source', UTM_VALUE);
    u.searchParams.set('utm_medium', UTM_VALUE);
    u.searchParams.set('utm_campaign', UTM_VALUE);
    return u.toString();
  } catch {
    const hashIndex = originalUrl.indexOf('#');
    const base = hashIndex >= 0 ? originalUrl.slice(0, hashIndex) : originalUrl;
    const hash = hashIndex >= 0 ? originalUrl.slice(hashIndex) : '';
    const sep = base.includes('?') ? '&' : '?';
    const tail = `utm_source=${encodeURIComponent(UTM_VALUE)}&utm_medium=${encodeURIComponent(UTM_VALUE)}&utm_campaign=${encodeURIComponent(UTM_VALUE)}`;
    return `${base}${sep}${tail}${hash}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = req.query;
  const getParam = (key: string): string | undefined => {
    const val = q[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const username = getParam('username');
  const sig = getParam('sig');
  const feed = getParam('feed');
  const positionRaw = getParam('position');

  const position = positionRaw !== undefined ? parseInt(positionRaw, 10) : 0;

  const feedUrl = feed ? String(feed) : undefined;

  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  // Validate signature (same as badge endpoint)
  const validation = validateRequest(
    username ? String(username) : undefined,
    sig ? String(sig) : undefined,
    secret,
    true,
    feedUrl,
  );

  if (!validation.valid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  if (!feedUrl) {
    res.status(400).json({ error: 'Feed URL required' });
    return;
  }

  // Fetch and parse RSS
  const fetchResult = await fetchFeed(feedUrl, { timeoutMs: 8000 });
  if (!fetchResult.success || !fetchResult.body) {
    res.status(502).json({ error: 'Failed to fetch RSS feed' });
    return;
  }

  const parseResult = tryParseFeed(fetchResult.body);
  if (parseResult.error) {
    res.status(502).json({ error: 'Failed to parse RSS feed' });
    return;
  }

  const sorted = sortPostsByDate(parseResult.posts);
  const post = sorted[position];

  if (!post) {
    const target = appendReferral(feedUrl);
    res.redirect(302, target);
    return;
  }

  const target = appendReferral(post.url);
  res.redirect(302, target);
}
