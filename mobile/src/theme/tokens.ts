import type { Verdict } from '@satark/shared';
import { StyleSheet, useColorScheme, type ViewStyle } from 'react-native';

import { useSettings } from '@/store/settings';

/**
 * Satark's design system: "Night" and "Day".
 *
 * One signature colour, Peacock (the deep blue-green of India's national
 * bird), on warm paper-and-ink neutrals rather than the usual cold greys;
 * status colours that mean the same thing everywhere (green safe, saffron
 * careful, vermilion scam) and are never used for decoration. Every
 * text/background pair below meets WCAG AA (4.5:1) for body text, checked
 * with a script. Elder-first: large type, 56 dp touch targets, no meaning by
 * colour alone.
 */
export interface Palette {
  bg: string;
  surface: string;
  /** Inputs, tracks, grouped fills. */
  surface2: string;
  /** Pressed and raised fills. */
  surface3: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textFaint: string;
  /** Text on filled accent, status and hero surfaces. */
  onFill: string;

  /** Filled buttons and selected states. */
  accent: string;
  accentPressed: string;
  /** Accent-coloured text and icons on surfaces. */
  accentText: string;
  accentSoft: string;
  /** Second, cooler accent: used only in the hero gradients and charts. */
  glacier: string;

  safe: string;
  safeText: string;
  safeSoft: string;
  warn: string;
  warnText: string;
  warnSoft: string;
  danger: string;
  dangerText: string;
  dangerSoft: string;

  whatsapp: string;
  whatsappSoft: string;
  /** Backdrop behind sheets and pop-ups. */
  overlay: string;
  /** The floating tab bar and toasts. */
  chrome: string;
  /** The ink of the hero cards; the same in both themes so the hero always reads as a hero. */
  ink: readonly [string, string];
}

const day: Palette = {
  bg: '#F4F2EE',
  surface: '#FFFFFF',
  surface2: '#EFECE6',
  surface3: '#E4E0D8',
  border: '#E7E3DB',
  borderStrong: '#D3CDC2',

  text: '#14130F',
  textMuted: '#5D584F',
  textFaint: '#6B655B',
  onFill: '#FFFFFF',

  accent: '#006A84',
  accentPressed: '#00566B',
  accentText: '#00627A',
  accentSoft: '#DDEFF2',
  glacier: '#E3A82B',

  safe: '#0F7B4B',
  safeText: '#0A6640',
  safeSoft: '#E1F3E8',
  warn: '#A85A00',
  warnText: '#8A4600',
  warnSoft: '#FDF0DA',
  danger: '#CF2E26',
  dangerText: '#AE231C',
  dangerSoft: '#FBE8E5',

  whatsapp: '#13894A',
  whatsappSoft: '#E3F6EA',
  overlay: 'rgba(20, 18, 14, 0.5)',
  chrome: 'rgba(255, 255, 255, 0.94)',
  ink: ['#0E4152', '#061A22'],
};

const night: Palette = {
  bg: '#0B0F11',
  surface: '#13191C',
  surface2: '#1A2226',
  surface3: '#232D32',
  border: '#1F292E',
  borderStrong: '#2F3C42',

  text: '#EEF3F2',
  textMuted: '#9CAAAD',
  textFaint: '#7F8F93',
  onFill: '#FFFFFF',

  accent: '#0A7F9C',
  accentPressed: '#086B84',
  accentText: '#57D0EA',
  accentSoft: '#0F2A32',
  glacier: '#F2B544',

  safe: '#0C8452',
  safeText: '#45D69A',
  safeSoft: '#0E261C',
  warn: '#B05A00',
  warnText: '#FFB547',
  warnSoft: '#2B2012',
  danger: '#D2322B',
  dangerText: '#FF7D72',
  dangerSoft: '#2E1718',

  whatsapp: '#1A9E58',
  whatsappSoft: '#0F2A1C',
  overlay: 'rgba(0, 0, 0, 0.66)',
  chrome: 'rgba(19, 25, 28, 0.95)',
  ink: ['#10475A', '#05141A'],
};

export type Scheme = 'light' | 'dark';

export interface StatusLook {
  /** Filled backgrounds (white text on top). */
  fill: string;
  /** Text and icons on surfaces. */
  text: string;
  soft: string;
  /** Hero gradient, light to deep. */
  gradient: readonly [string, string];
  icon: 'shield-checkmark' | 'warning' | 'alert-circle';
}

export interface Theme {
  scheme: Scheme;
  c: Palette;
  verdict: Record<Verdict, StatusLook>;
  shadow: { card: ViewStyle; raised: ViewStyle; float: ViewStyle };
}

function build(scheme: Scheme, c: Palette): Theme {
  const dark = scheme === 'dark';
  return {
    scheme,
    c,
    verdict: {
      safe: { fill: c.safe, text: c.safeText, soft: c.safeSoft, gradient: ['#13A86A', '#05603D'], icon: 'shield-checkmark' },
      suspicious: { fill: c.warn, text: c.warnText, soft: c.warnSoft, gradient: ['#F09A1A', '#A04E00'], icon: 'warning' },
      scam: { fill: c.danger, text: c.dangerText, soft: c.dangerSoft, gradient: ['#F0443A', '#9A1710'], icon: 'alert-circle' },
    },
    // On dark surfaces depth comes from lighter fills and hairlines, not shadows.
    shadow: {
      card: { boxShadow: dark ? 'none' : '0 1px 1px rgba(40, 30, 10, 0.04), 0 8px 24px rgba(40, 30, 10, 0.05)' },
      raised: { boxShadow: dark ? '0 16px 40px rgba(0, 0, 0, 0.5)' : '0 18px 40px rgba(6, 40, 52, 0.18)' },
      float: { boxShadow: dark ? '0 12px 34px rgba(0, 0, 0, 0.6)' : '0 12px 34px rgba(40, 30, 10, 0.14)' },
    },
  };
}

export const THEMES: Record<Scheme, Theme> = { light: build('light', day), dark: build('dark', night) };

/** The scheme in use: the user's choice, or the phone's when set to follow the system. */
export function useScheme(): Scheme {
  const mode = useSettings((s) => s.themeMode);
  const system = useColorScheme();
  if (mode === 'system') return system === 'light' ? 'light' : 'dark';
  return mode;
}

export function useTheme(): Theme {
  return THEMES[useScheme()];
}

type AnyStyles = StyleSheet.NamedStyles<any>;

/** Theme-aware StyleSheet, built once per scheme. */
export function makeStyles<T extends AnyStyles>(factory: (theme: Theme) => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles() {
    const theme = useTheme();
    return (cache[theme.scheme] ??= StyleSheet.create(factory(theme)));
  };
}

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 30, pill: 999 } as const;

/**
 * Type scale. Headings use Bricolage Grotesque for English; Telugu, Hindi and
 * the other scripts use the phone's own fonts, which shape them correctly.
 */
export const type = {
  hero: { size: 38, weight: '800', display: true, tracking: -1 },
  display: { size: 31, weight: '800', display: true, tracking: -0.7 },
  title: { size: 26, weight: '700', display: true, tracking: -0.5 },
  heading: { size: 20, weight: '700', display: true, tracking: -0.25 },
  bodyStrong: { size: 17, weight: '600' },
  body: { size: 17, weight: '400' },
  label: { size: 15, weight: '500' },
  caption: { size: 13, weight: '500' },
  overline: { size: 12, weight: '700', upper: true, tracking: 1.1 },
  /** Big numbers: always the display face (digits are Latin in every language here). */
  numeral: { size: 34, weight: '800', display: true, digits: true, tracking: -1.2 },
} as const;
export type TextVariant = keyof typeof type;

export const DISPLAY_FONT = {
  '600': 'BricolageGrotesque_600SemiBold',
  '700': 'BricolageGrotesque_700Bold',
  '800': 'BricolageGrotesque_800ExtraBold',
} as const;

/** Minimum touch target: larger than the 48 dp guideline, for unsteady hands. */
export const TOUCH = 56;
export const MAX_CONTENT_WIDTH = 560;
/** Height of the floating tab bar, without the bottom safe area. */
export const TAB_BAR_HEIGHT = 68;
