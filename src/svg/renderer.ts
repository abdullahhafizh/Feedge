import type { Config, RenderablePost, ThemeColors } from '../model/types.js';
import { getThemeColors, getFontFamily } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('svg-renderer');

const UTM_VALUE = 'feedge.abdullahhafizh.my.id';

function appendUtmParams(originalUrl: string): string {
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

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// SVG icons for post items (document icon)
const POST_ICON =
  '<path d="M3 0h10l4 4v13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1zm9 1H3v15h13V4h-4V1zm-6 7h8v1H6v-1zm0 2h8v1H6v-1zm0 2h5v1H6v-1z" fill="currentColor"/>';

// Emojis for different sections
const EMOJI = {
  header: '📰',      // newspaper for blog posts header
  post: '📄',        // document for each post
  footer: '⚡',      // lightning for "powered by"
  update: '🔄',      // refresh for "updated"
  error: '⚠️',       // warning
  security: '🔒',    // lock for security errors
  timeout: '⏱️',     // timer for timeout
  config: '⚙️',      // gear for config errors
  network: '🌐',     // globe for network errors
};

function calculateDimensions(postCount: number, config: Config, showTitle: boolean): { width: number; height: number } {
  // When title is hidden, shrink top padding + header height so content hugs the top
  const topPadding = showTitle ? config.padding : 4;
  const headerHeight = showTitle ? 40 : 0;
  const contentHeight = postCount * config.lineHeight;
  const footerHeight = 16;
  const bottomPadding = config.padding;
  const height = topPadding + headerHeight + contentHeight + footerHeight + bottomPadding;
  return { width: config.width, height };
}

function generateStyles(colors: ThemeColors, fontFamily: string, fontSize: number): string {
  return `
    <style>
      .rss-badge { font-family: ${fontFamily}; }
      .rss-header {
        font: 600 ${fontSize + 2}px ${fontFamily};
        fill: ${colors.text};
        animation: fadeInAnimation 0.8s ease-in-out forwards;
      }
      @supports(-moz-appearance: auto) {
        /* Firefox font size fix */
        .rss-header { font-size: ${fontSize + 1}px; }
      }
      .rss-stat {
        font: 600 ${fontSize}px ${fontFamily};
        fill: ${colors.text};
      }
      .rss-date {
        font: 400 ${fontSize - 2}px ${fontFamily};
        fill: ${colors.secondaryText};
      }
      @supports(-moz-appearance: auto) {
        .rss-stat { font-size: ${fontSize - 1}px; }
      }
      .rss-link { fill: ${colors.link}; text-decoration: none; }
      .rss-link:hover { fill: ${colors.linkHover}; text-decoration: underline; }
      .rss-secondary { fill: ${colors.secondaryText}; font-size: ${fontSize - 2}px; }
      .rss-icon { fill: ${colors.secondaryText}; display: block; }
      .rss-emoji { font-size: ${fontSize}px; fill: ${colors.text}; }
      .stagger {
        opacity: 0;
        animation: fadeInAnimation 0.3s ease-in-out forwards;
      }
      @keyframes fadeInAnimation {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
  `;
}

function renderPostItem(post: RenderablePost, y: number, index: number, config: Config, useEmoji = true): string {
  const iconSize = 16;
  const textX = config.padding + iconSize + 6; // icon + gap
  const title = escapeXml(post.displayTitle);
  const urlWithUtm = appendUtmParams(post.url);
  const url = escapeXml(urlWithUtm);
  const textY = y + 14;
  const animDelayMs = 150 + index * 100;

  // Use emoji or fallback SVG icon so the badge works well on platforms that sanitize external images
  let iconContent: string;
  if (useEmoji) {
    iconContent = `<text x="${config.padding}" y="${y + 14}" class="rss-emoji">${EMOJI.post}</text>`;
  } else {
    iconContent = `<svg class="rss-icon" x="${config.padding}" y="${y}" width="${iconSize}" height="${iconSize}" viewBox="0 0 18 18" overflow="visible">${POST_ICON}</svg>`;
  }

  const dateLabel = post.dateLabel ? escapeXml(post.dateLabel) : '';
  const datePrefix = dateLabel
    ? `<tspan class="rss-date">${dateLabel}</tspan><tspan class="rss-date"> • </tspan>`
    : '';

  return `
    <g data-testid="post-item-${index}" class="stagger" style="animation-delay: ${animDelayMs}ms">
      ${iconContent}
      <a href="${url}" xlink:href="${url}" target="_blank" rel="noopener noreferrer">
        <text x="${textX}" y="${textY}">
          ${datePrefix}
          <tspan class="rss-stat rss-link">${title}</tspan>
        </text>
      </a>
    </g>
  `;
}

export function renderBadgeSvg(
  posts: RenderablePost[],
  config: Config,
  title: string = 'Latest Blog Posts',
  showTitle: boolean = true,
): string {
  const colors = getThemeColors(config);
  const fontFamily = getFontFamily(config);
  const { width, height } = calculateDimensions(posts.length, config, showTitle);
  const styles = generateStyles(colors, fontFamily, config.fontSize);

  const headerY = config.padding + 24;
  const postsStartY = showTitle ? config.padding + 50 : 4;

  const items = posts
    .map((post, index) => renderPostItem(post, postsStartY + index * config.lineHeight, index, config))
    .join('\n');

  const escapedTitle = escapeXml(title);
  const postCount = posts.length;
  const description = `RSS feed badge showing ${postCount} latest blog posts`;

  const svg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  fill="none"
  role="img"
  aria-labelledby="titleId descId"
  class="rss-badge"
  data-theme="${config.theme}"
>
  <title id="titleId">${escapedTitle}</title>
  <desc id="descId">${description}</desc>
  ${styles}
  <rect
    data-testid="card-bg"
    x="0"
    y="0"
    width="${width}"
    height="${height}"
    fill="transparent"
  />
  ${
    showTitle
      ? `<g data-testid="card-title" transform="translate(${config.padding}, ${headerY})">
    <text x="0" y="0" class="rss-header" data-testid="header">${EMOJI.header} ${escapedTitle}</text>
  </g>`
      : ''
  }
  <g data-testid="main-card-body" transform="translate(0, 0)">
    <svg overflow="visible">
      ${items}
    </svg>
  </g>
  <a xlink:href="https://github.com/abdullahhafizh/Feedge" href="https://github.com/abdullahhafizh/Feedge" target="_blank" rel="noopener noreferrer">
    <text x="${config.padding}" y="${height - 10}" class="rss-secondary">${EMOJI.update} Updated via RSS  •  ${EMOJI.footer} Feedge</text>
  </a>
</svg>`;

  logger.info('Rendered badge SVG', { posts: posts.length, theme: config.theme });
  return svg;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; emoji: string }> = {
  CONFIG_ERROR: {
    title: 'Configuration Error',
    message: 'Badge configuration is invalid. Please check your settings.',
    emoji: EMOJI.config,
  },
  NETWORK_ERROR: {
    title: 'Connection Issue',
    message: 'Unable to fetch RSS feed. The service may be temporarily unavailable.',
    emoji: EMOJI.network,
  },
  PARSE_ERROR: {
    title: 'Feed Error',
    message: 'Unable to read the RSS feed. The feed format may be invalid.',
    emoji: EMOJI.error,
  },
  NO_POSTS_ERROR: {
    title: 'No Posts',
    message: 'No recent posts available in the RSS feed.',
    emoji: '📭',
  },
  RENDER_ERROR: {
    title: 'Display Error',
    message: 'Unable to generate the badge. Please try again later.',
    emoji: EMOJI.error,
  },
  SECURITY_ERROR: {
    title: 'Access Denied',
    message: 'Invalid or missing authentication. Check your badge URL.',
    emoji: EMOJI.security,
  },
  TIMEOUT_ERROR: {
    title: 'Timeout',
    message: 'The request took too long. Please try again.',
    emoji: EMOJI.timeout,
  },
};

export function renderErrorSvg(errorType: string, config: Config, customMessage?: string): string {
  const colors = getThemeColors(config);
  const fontFamily = getFontFamily(config);
  const defaultInfo = { title: 'Error', message: customMessage ?? 'An unexpected error occurred.', emoji: EMOJI.error };
  const info = ERROR_MESSAGES[errorType] ?? defaultInfo;

  const width = config.width;
  const height = 100;
  const accent = config.theme === 'dark' ? '#f85149' : '#cf222e';
  const escapedTitle = escapeXml(info.title);
  const escapedMessage = escapeXml(info.message);
  const emoji = info.emoji ?? EMOJI.error;

  return `<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  fill="none"
  role="img"
  aria-labelledby="errorTitleId errorDescId"
>
  <title id="errorTitleId">${escapedTitle}</title>
  <desc id="errorDescId">${escapedMessage}</desc>
  <style>
    .error-badge { font-family: ${fontFamily}; }
    .error-emoji { font-size: 20px; fill: ${accent}; }
    .error-title { font: 600 14px ${fontFamily}; fill: ${accent}; animation: fadeInAnimation 0.5s ease-in-out forwards; }
    .error-message { font: 400 12px ${fontFamily}; fill: ${colors.secondaryText}; }
    .error-link { font: 400 11px ${fontFamily}; fill: ${colors.link}; }
    .error-link:hover { text-decoration: underline; }
    @keyframes fadeInAnimation { from { opacity: 0; } to { opacity: 1; } }
  </style>
  <rect
    data-testid="error-card-bg"
    x="0"
    y="0"
    width="${width}"
    height="${height}"
    fill="transparent"
  />
  <text x="${config.padding}" y="36" class="error-emoji" data-testid="error-icon">${emoji}</text>
  <text x="${config.padding + 28}" y="34" class="error-title" data-testid="error-title">${escapedTitle}</text>
  <text x="${config.padding}" y="58" class="error-message" data-testid="error-message">${escapedMessage}</text>
  <a xlink:href="https://github.com/abdullahhafizh/Feedge#readme" href="https://github.com/abdullahhafizh/Feedge#readme" target="_blank" rel="noopener noreferrer">
    <text x="${config.padding}" y="${height - 16}" class="error-link">🔗 Need help? View troubleshooting guide</text>
  </a>
</svg>`;
}

export function renderEmptyStateSvg(config: Config): string {
  return renderErrorSvg('NO_POSTS_ERROR', config);
}

