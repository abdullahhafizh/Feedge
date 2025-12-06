// Config
export { loadConfig, getThemeColors, getFontFamily, defaultConfig } from './config/index.js';
export type { Config, ThemeColors, RenderablePost } from './model/types.js';

// SVG Renderer
export { renderBadgeSvg, renderErrorSvg, renderEmptyStateSvg, escapeXml } from './svg/renderer.js';

// Security
export {
  generateSignature,
  verifySignature,
  validateRequest,
  generateBadgeUrl,
  getCacheStats,
  clearCache,
} from './security/validator.js';
export type { SecurityValidationResult } from './security/validator.js';

// Logger
export { createLogger, setLogLevel, logTestResult } from './utils/logger.js';