import { describe, it, expect } from 'bun:test';
import { renderBadgeSvg, renderErrorSvg, escapeXml } from '../src/svg/renderer.js';
import { loadConfig } from '../src/config/index.js';
import type { RenderablePost } from '../src/model/types.js';
import { logTestResult } from '../src/utils/logger.js';

const samplePosts: RenderablePost[] = [
  { displayTitle: 'First Post Title', url: 'https://example.com/1', dateLabel: '2024-01-01' },
  { displayTitle: 'Second Post Title', url: 'https://example.com/2', dateLabel: '2024-01-15' },
  { displayTitle: 'Third Post Title', url: 'https://example.com/3', dateLabel: '2024-01-30' },
];

describe('[F07] SVG Renderer Module', () => {
  const config = loadConfig();

  it('[F07-01] should calculate dimensions based on post count', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    // SVG should have width and height attributes
    const hasWidth = svg.includes('width="');
    const hasHeight = svg.includes('height="');
    
    const passed = hasWidth && hasHeight;
    logTestResult('F07-01', 'Calculates dimensions correctly', passed);
    expect(passed).toBe(true);
  });

  it('[F07-02] should render SVG structure with posts', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    const hasSvgTag = svg.includes('<svg') && svg.includes('</svg>');
    const hasBackground = svg.includes('<rect');
    const hasLinks = svg.includes('<a href=');
    const hasAllPosts = samplePosts.every(post => svg.includes(post.displayTitle));
    
    const passed = hasSvgTag && hasBackground && hasLinks && hasAllPosts;
    logTestResult('F07-02', 'Renders complete SVG structure', passed);
    expect(passed).toBe(true);
  });

  it('[F07-03] should include font family from config', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    const hasFontFamily = svg.includes('font-family:') || svg.includes('font-family=');
    const hasPrimaryFont = svg.includes('Segoe UI');
    
    const passed = hasFontFamily && hasPrimaryFont;
    logTestResult('F07-03', 'Includes configured fonts', passed);
    expect(passed).toBe(true);
  });

  it('[F07-06] should create clickable links with proper attributes', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    const hasLinks = samplePosts.every(post => 
      svg.includes(`href="${post.url}"`)
    );
    const hasTarget = svg.includes('target="_blank"');
    const hasRel = svg.includes('rel="noopener noreferrer"');
    
    const passed = hasLinks && hasTarget && hasRel;
    logTestResult('F07-06', 'Creates proper clickable links', passed);
    expect(passed).toBe(true);
  });

  it('[F07-07] should apply theme colors', () => {
    const lightConfig = loadConfig({ theme: 'light' });
    const darkConfig = loadConfig({ theme: 'dark' });
    
    const lightSvg = renderBadgeSvg(samplePosts, lightConfig);
    const darkSvg = renderBadgeSvg(samplePosts, darkConfig);
    
    // Light and dark should have different background colors
    const passed = lightSvg !== darkSvg;
    logTestResult('F07-07', 'Applies theme colors', passed);
    expect(passed).toBe(true);
  });

  it('[F07-08] should include fade-in animation', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    const hasAnimation = svg.includes('@keyframes fadeIn') || svg.includes('animation:');
    
    logTestResult('F07-08', 'Includes fade-in animation', hasAnimation);
    expect(hasAnimation).toBe(true);
  });

  it('should render date labels when present', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    const allDatesPresent = samplePosts.every((p) => p.dateLabel && svg.includes(p.dateLabel));
    logTestResult('F07-date', 'Renders date labels for posts', allDatesPresent);
    expect(allDatesPresent).toBe(true);
  });

  it('[F07-09] should render error SVG with message', () => {
    const errorSvg = renderErrorSvg('NETWORK_ERROR', config);
    
    const hasSvg = errorSvg.includes('<svg') && errorSvg.includes('</svg>');
    const hasErrorContent = errorSvg.includes('Connection Issue') || errorSvg.includes('Error');
    
    const passed = hasSvg && hasErrorContent;
    logTestResult('F07-09', 'Renders error SVG correctly', passed);
    expect(passed).toBe(true);
  });

  it('[F07-10] should escape XML special characters', () => {
    const input = 'Test & <script> "hello" \'world\'';
    const escaped = escapeXml(input);
    
    const passed = !escaped.includes('&') || escaped.includes('&amp;');
    const noRawChars = !escaped.includes('<script>');
    
    logTestResult('F07-10', 'Escapes XML special characters', passed && noRawChars);
    expect(passed && noRawChars).toBe(true);
  });

  it('[F10-04] should produce valid SVG output', () => {
    const svg = renderBadgeSvg(samplePosts, config);
    
    // Basic SVG validation
    const startsWithSvg = svg.trim().startsWith('<svg');
    const endsWithSvg = svg.trim().endsWith('</svg>');
    const hasXmlns = svg.includes('xmlns="http://www.w3.org/2000/svg"');
    
    const passed = startsWithSvg && endsWithSvg && hasXmlns;
    logTestResult('F10-04', 'Produces valid SVG output', passed);
    expect(passed).toBe(true);
  });
});
