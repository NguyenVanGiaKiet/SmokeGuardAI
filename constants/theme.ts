/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3DDC5C';
const tintColorDark = '#3DDC5C';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F7F7F7',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#3DDC5C',
    secondary: '#0EA5E9',
    danger: '#F43F5E',
    warning: '#F59E0B',
    muted: '#8A8A8E',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0A0A0A',
    tint: tintColorDark,
    icon: '#FFFFFF',
    tabIconDefault: '#8A8A8E',
    tabIconSelected: tintColorDark,
    card: '#1C1C1E',
    border: '#2A2A2D',
    primary: '#3DDC5C',
    secondary: '#4ADE80',
    danger: '#FF5A5F',
    warning: '#FBBF24',
    muted: '#8A8A8E',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
