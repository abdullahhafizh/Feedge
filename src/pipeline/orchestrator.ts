/*
 * Copyright 2024 Feedge Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { loadConfig } from '../config/index.js';
import { fetchFeed, type FetchOptions } from '../rss/fetcher.js';
import { tryParseFeed } from '../rss/parser.js';
import { selectPosts, selectPostsWithIcons, isEmptyResult, type SelectOptions } from '../transform/selector.js';
import { renderBadgeSvg, renderErrorSvg, renderEmptyStateSvg } from '../svg/renderer.js';
import { createLogger } from '../utils/logger.js';
import type { Config } from '../model/types.js';

const logger = createLogger('pipeline');

export interface BadgeOptions extends FetchOptions, SelectOptions {
  theme?: 'light' | 'dark';
  badgeTitle?: string;
  hideTitle?: boolean;
  position?: number; // If set, only render the post at this position (0 = latest)
}

export interface BadgeResult {
  success: boolean;
  svg: string;
  error?: { type: string; message: string };
  metadata: { postsFound: number; postsRendered: number; duration: number; feedUrl: string };
}

export async function generateBadge(feedUrl: string, options: BadgeOptions = {}): Promise<BadgeResult> {
  const start = Date.now();
  const config: Config = loadConfig({ theme: options.theme });

  if (!feedUrl) {
    logger.error('No feed URL');
    return {
      success: false,
      svg: renderErrorSvg('CONFIG_ERROR', config),
      error: { type: 'CONFIG_ERROR', message: 'No RSS feed URL provided' },
      metadata: { postsFound: 0, postsRendered: 0, duration: Date.now() - start, feedUrl: '' },
    };
  }

  const fetchResult = await fetchFeed(feedUrl, options);
  if (!fetchResult.success || !fetchResult.body) {
    const errType = fetchResult.error?.type === 'timeout' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR';
    return {
      success: false,
      svg: renderErrorSvg(errType, config),
      error: { type: errType, message: fetchResult.error?.message ?? 'Fetch failed' },
      metadata: { postsFound: 0, postsRendered: 0, duration: Date.now() - start, feedUrl },
    };
  }

  const parseResult = tryParseFeed(fetchResult.body);
  if (parseResult.error) {
    return {
      success: false,
      svg: renderErrorSvg('PARSE_ERROR', config),
      error: { type: 'PARSE_ERROR', message: parseResult.error },
      metadata: { postsFound: 0, postsRendered: 0, duration: Date.now() - start, feedUrl },
    };
  }

  // Use async version if fetchIcons is enabled
  let selection = options.fetchIcons
    ? await selectPostsWithIcons(parseResult.posts, options)
    : selectPosts(parseResult.posts, options);

  // Single post mode: filter to just the post at position
  if (options.position !== undefined && options.position >= 0) {
    const post = selection.posts[options.position];
    if (post) {
      selection = {
        ...selection,
        posts: [post],
        metadata: { ...selection.metadata, selected: 1 },
      };
    } else {
      // Position out of range
      return {
        success: true,
        svg: renderEmptyStateSvg(config),
        metadata: { postsFound: parseResult.posts.length, postsRendered: 0, duration: Date.now() - start, feedUrl },
      };
    }
  }

  if (isEmptyResult(selection)) {
    return {
      success: true,
      svg: renderEmptyStateSvg(config),
      metadata: { postsFound: parseResult.posts.length, postsRendered: 0, duration: Date.now() - start, feedUrl },
    };
  }

  const badgeTitle = options.badgeTitle ?? '';
  const showTitle = options.position !== undefined
    ? false
    : options.hideTitle
      ? false
      : Boolean(options.badgeTitle);

  const svg = renderBadgeSvg(selection.posts, config, badgeTitle, showTitle);

  logger.info('Badge generated', { posts: selection.posts.length, duration: Date.now() - start });

  return {
    success: true,
    svg,
    metadata: {
      postsFound: parseResult.posts.length,
      postsRendered: selection.posts.length,
      duration: Date.now() - start,
      feedUrl,
    },
  };
}