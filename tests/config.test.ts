import { describe, it, expect } from 'bun:test';
import { loadConfig, getThemeColors, getFontFamily } from '../src/config/index.js';
import { logTestResult } from '../src/utils/logger.js';

describe('[F03] Configuration Module', () => {
  it('[F03-02] should define schema with all required properties', () => {
    const config = loadConfig();
    const hasAll =
      'theme' in config &&
      'width' in config &&
      'padding' in config &&
      'lineHeight' in config &&
      'fontSize' in config &&
      'fontPrimary' in config &&
      'lightTheme' in config &&
      'darkTheme' in config;
    logTestResult('F03-02', 'Schema defines all required properties', hasAll);
    expect(hasAll).toBe(true);
  });

  it('[F03-05] should have safe default values', () => {
    const config = loadConfig();
    const ok =
      config.width === 400 &&
      config.padding === 16 &&
      config.fontSize === 14 &&
      config.fontPrimary === 'Segoe UI';
    logTestResult('F03-05', 'Default values are set correctly', ok);
    expect(ok).toBe(true);
  });

  it('[F03-06] should separate visual config correctly', () => {
    const config = loadConfig();
    const hasVisual = 'width' in config && 'lightTheme' in config;
    logTestResult('F03-06', 'Visual config separation', hasVisual);
    expect(hasVisual).toBe(true);
  });

  it('[F03-07] should export validated config helpers', () => {
    const config = loadConfig();
    const colors = getThemeColors(config);
    const fontFamily = getFontFamily(config);
    const ok = !!colors.background && !!fontFamily;
    logTestResult('F03-07', 'Config exports work correctly', ok);
    expect(ok).toBe(true);
  });

  it('should apply theme override', () => {
    const light = loadConfig({ theme: 'light' });
    const dark = loadConfig({ theme: 'dark' });
    expect(light.theme).toBe('light');
    expect(dark.theme).toBe('dark');
  });
});