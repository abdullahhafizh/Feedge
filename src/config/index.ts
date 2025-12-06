import type { Config, ThemeColors } from '../model/types.js';

// Light theme: dark text for light README backgrounds
const defaultLightTheme: ThemeColors = {
  background: 'transparent',
  text: '#1f2328',           // near-black for high contrast on white
  link: '#0969da',           // GitHub blue
  linkHover: '#0550ae',
  border: '#d0d7de',
  accent: '#0969da',
  secondaryText: '#59636e',  // medium gray
};

// Dark theme: light text for dark README backgrounds
const defaultDarkTheme: ThemeColors = {
  background: 'transparent',
  text: '#e6edf3',           // bright white-ish for dark bg
  link: '#4493f8',           // brighter blue for dark mode
  linkHover: '#6cb6ff',
  border: '#3d444d',
  accent: '#4493f8',
  secondaryText: '#9198a1',  // lighter gray for dark bg
};

const defaultConfig: Config = {
  theme: 'light',
  width: 400,
  padding: 16,
  lineHeight: 28,
  fontSize: 14,
  fontPrimary: 'Segoe UI',
  fontSecondary: 'Poppins',
  fontFallbackStack: 'Ubuntu, system-ui, sans-serif',
  lightTheme: defaultLightTheme,
  darkTheme: defaultDarkTheme,
};

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...defaultConfig,
    ...overrides,
    lightTheme: overrides.lightTheme ?? defaultConfig.lightTheme,
    darkTheme: overrides.darkTheme ?? defaultConfig.darkTheme,
  };
}

export function getThemeColors(config: Config): ThemeColors {
  return config.theme === 'dark' ? config.darkTheme : config.lightTheme;
}

export function getFontFamily(config: Config): string {
  return `"${config.fontPrimary}", "${config.fontSecondary}", ${config.fontFallbackStack}`;
}

export { defaultConfig, defaultLightTheme, defaultDarkTheme };

