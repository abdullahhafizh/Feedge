export interface ThemeColors {
  background: string;
  text: string;
  link: string;
  linkHover: string;
  border: string;
  accent: string;
  secondaryText: string;
}

export interface Config {
  theme: 'light' | 'dark';
  width: number;
  padding: number;
  lineHeight: number;
  fontSize: number;
  fontPrimary: string;
  fontSecondary: string;
  fontFallbackStack: string;
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
}

export interface RenderablePost {
  displayTitle: string;
  url: string;
  dateLabel?: string;
  iconUrl?: string; // OG image or favicon URL
}

