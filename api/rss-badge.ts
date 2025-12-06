/*
 * Copyright 2024 Feedge Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateBadge } from '../src/pipeline/orchestrator.js';
import { validateRequest } from '../src/security/validator.js';
import { renderErrorSvg } from '../src/svg/renderer.js';
import { loadConfig } from '../src/config/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Parse query parameters (snake_case)
  const q = req.query;
  const getParam = (key: string): string | undefined => {
    const val = q[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const username = getParam('username');
  const sig = getParam('sig');
  const feed = getParam('feed');
  const title = getParam('title');

  const feedUrl = feed ? String(feed) : undefined;

  // Parameters with defaults
  const maxItems = parseInt(getParam('max_items') ?? '5', 10);
  const themeValue = getParam('theme')?.toLowerCase();
  const selectedTheme: 'light' | 'dark' = themeValue === 'dark' ? 'dark' : 'light';
  const titleMaxLength = parseInt(getParam('title_max_length') ?? '50', 10);
  const timeoutMs = parseInt(getParam('timeout_ms') ?? '8000', 10);

  // Single post mode: position=0 means latest, position=1 means second, etc.
  const positionRaw = getParam('position');
  const position = positionRaw !== undefined ? parseInt(positionRaw, 10) : undefined;

  // Boolean flags with defaults
  const hideTitleRaw = getParam('hide_title')?.toLowerCase();
  const hideTitle = hideTitleRaw ? ['1', 'true', 'yes'].includes(hideTitleRaw) : false;

  const fetchIconsRaw = getParam('fetch_icons')?.toLowerCase();
  const fetchIcons = fetchIconsRaw ? !['0', 'false', 'no'].includes(fetchIconsRaw) : true; // default: true

  const config = loadConfig({ theme: selectedTheme });

  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    // Server misconfiguration: security is enabled in code but secret is not set in env
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(renderErrorSvg('CONFIG_ERROR', config));
    return;
  }

  const validation = validateRequest(
    username ? String(username) : undefined,
    sig ? String(sig) : undefined,
    secret,
    true,
    feedUrl,
  );

  if (!validation.valid) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(validation.cached ? 429 : 401).send(renderErrorSvg('SECURITY_ERROR', config));
    return;
  }

  if (!feedUrl) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(400).send(renderErrorSvg('CONFIG_ERROR', config));
    return;
  }

  const result = await generateBadge(feedUrl, {
    theme: selectedTheme,
    maxItems: position !== undefined ? position + 1 : maxItems, // fetch enough posts for position
    titleMaxLength,
    timeoutMs,
    badgeTitle: title,
    hideTitle,
    fetchIcons,
    position, // single post mode
  });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.status(200).send(result.svg);
}