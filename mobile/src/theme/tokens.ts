import type { Verdict } from '@satark/shared';
import { StyleSheet, useColorScheme, type ViewStyle } from 'react-native';

import { useSettings } from '@/store/settings';

/**
 * Satark's design system: "Night" and "Day".
 *
 * One signature colour, Satark Cobalt, on calm near-neutral surfaces; status
 * colours that mean the same thing everywhere (green safe, saffron careful,
 * vermilion scam) and are never used for decoration. Every text/background
 * pair below meets WCAG AA (4.5:1) for body text, checked with a script.
 * Elder-first: large type, 56 dp touch targets, no meaning by colour alone.
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
  bg: '#F2F3F7',
  surface: '#FFFFFF',
  surface2: '#EDEFF4',
  surface3: '#E2E5EC',
  border: '#E3E6EE',
  borderStrong: '#CCD2DD',

  text: '#0E1117',
  textMuted: '#4F5869',
  textFaint: '#6F788A',
  onFill: '#FFFFFF',

  accent: '#2E5BFF',
  accentPressed: '#1F45E0',
  accentText: '#2449E6',
  accentSoft: '#E8EDFF',
  glacier: '#12B3D6',

  safe: '#08804F',
  safeText: '#05683F',
  safeSoft: '#E3F5EC',
  warn: '#B05A00',
  warnText: '#8A4500',
  warnSoft: '#FFF1DC',
  danger: '#D92C20',
  dangerText: '#B0241A',
  dangerSoft: '#FDEAE8',

  whatsapp: '#13894A',
  whatsappSoft: '#E3F6EA',
  overlay: 'rgba(9, 12, 20, 0.46)',
  chrome: 'rgba(255, 255, 255, 0.94)',
  ink: ['#13204A', '#0A1029'],
};

const night: Palette = {
  bg: '#0A0B0F',
  surface: '#15171D',
  surface2: '#1D2028',
  surface3: '#272B35',
  border: '#242833',
  borderStrong: '#343A48',

  text: '#F3F5F9',
  textMuted: '#A4ACBB',
  textFaint: '#737B8C',
  onFill: '#FFFFFF',

  accent: '#3F5EFF',
  accentPressed: '#3350E8',
  accentText: '#91A5FF',
  accentSoft: '#1B2246',
  glacier: '#38C8E8',

  safe: '#0B8553',
  safeText: '#4BDB9E',
  safeSoft: '#10291F',
  warn: '#B05A00',
  warnText: '#FFB547',
  warnSoft: '#2D2112',
  danger: '#D7302A',
  dangerText: '#FF7B70',
  dangerSoft: '#32181A',

  whatsapp: '#1A9E58',
  whatsappSoft: '#0F2A1C',
  overlay: 'rgba(0, 0, 0, 0.62)',
  chrome: 'rgba(25, 28, 36, 0.96)',
  ink: ['#15204A', '#090D20'],
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
      card: { boxShadow: dark ? 'none' : '0 1px 2px rgba(16, 24, 40, 0.04), 0 6px 18px rgba(16, 24, 40, 0.05)' },
      raised: { boxShadow: dark ? '0 12px 32px rgba(0, 0, 0, 0.45)' : '0 14px 34px rgba(30, 50, 120, 0.16)' },
      float: { boxShadow: dark ? '0 10px 30px rgba(0, 0, 0, 0.55)' : '0 10px 30px rgba(16, 24, 40, 0.14)' },
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
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, xxl: 34, pill: 999 } as const;

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
