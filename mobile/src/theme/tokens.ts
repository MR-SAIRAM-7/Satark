import type { Verdict } from '@satark/shared';

/**
 * Design tokens. Elder-first: high contrast, generous touch targets, and risk
 * colours that mean the same thing everywhere (green safe, amber careful, red scam).
 */
export const colors = {
  bg: '#F3F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF0F8',
  border: '#DCE3EE',

  text: '#0D1728',
  textMuted: '#4D5A72',
  textFaint: '#8590A6',
  textOnDark: '#FFFFFF',

  brand: '#143A6E',
  brandDeep: '#0B2547',
  brandBright: '#1F6FEB',
  brandSoft: '#E4EDFC',

  safe: '#12804A',
  safeDeep: '#0A5A32',
  safeSoft: '#E3F5EA',

  warn: '#B4580A',
  warnBright: '#F59E0B',
  warnDeep: '#7A3B05',
  warnSoft: '#FEF1D8',

  danger: '#CC1F1F',
  dangerDeep: '#8C0F0F',
  dangerSoft: '#FDE8E8',

  whatsapp: '#128C4A',
  whatsappSoft: '#E1F7E9',
  overlay: 'rgba(8, 18, 36, 0.55)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

export const type = {
  display: { size: 34, weight: '800' },
  title: { size: 26, weight: '800' },
  heading: { size: 20, weight: '700' },
  body: { size: 17, weight: '400' },
  bodyStrong: { size: 17, weight: '700' },
  label: { size: 15, weight: '600' },
  caption: { size: 13, weight: '500' },
} as const;
export type TextVariant = keyof typeof type;

/** Minimum touch target: larger than the 48dp guideline, for unsteady hands. */
export const TOUCH = 56;

export const shadow = {
  card: {
    shadowColor: '#0B2547',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B2547',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export interface VerdictPalette {
  main: string;
  deep: string;
  soft: string;
  gradient: readonly [string, string];
  icon: 'shield-checkmark' | 'warning' | 'alert-circle';
}

export const verdictPalette: Record<Verdict, VerdictPalette> = {
  safe: { main: colors.safe, deep: colors.safeDeep, soft: colors.safeSoft, gradient: ['#17A05C', '#0A5A32'], icon: 'shield-checkmark' },
  suspicious: { main: colors.warn, deep: colors.warnDeep, soft: colors.warnSoft, gradient: ['#F0A020', '#B4580A'], icon: 'warning' },
  scam: { main: colors.danger, deep: colors.dangerDeep, soft: colors.dangerSoft, gradient: ['#E03131', '#8C0F0F'], icon: 'alert-circle' },
};

export const MAX_CONTENT_WIDTH = 560;
