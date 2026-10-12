import { Text, type TextProps, type TextStyle } from 'react-native';

import { useSettings } from '@/store/settings';
import { DISPLAY_FONT, type, useTheme, type TextVariant } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

/**
 * All text goes through here so the elder's chosen text size applies everywhere.
 * Headings use the display face in English only; Telugu, Devanagari and the
 * other scripts keep the phone's fonts and a taller line height.
 */
export function AppText({ variant = 'body', color, center, style, ...rest }: AppTextProps) {
  const { c } = useTheme();
  const scale = useSettings((s) => s.textScale);
  const lang = useSettings((s) => s.lang);
  const spec = type[variant] as (typeof type)[TextVariant] & { display?: boolean; digits?: boolean; upper?: boolean; tracking?: number };
  const fontSize = Math.round(spec.size * scale);
  const display = Boolean(spec.display) && (lang === 'en' || Boolean(spec.digits));
  const base: TextStyle = {
    fontSize,
    lineHeight: Math.round(fontSize * (display ? 1.18 : 1.42)),
    color: color ?? c.text,
    textAlign: center ? 'center' : undefined,
    letterSpacing: display || spec.upper ? spec.tracking : undefined,
    textTransform: spec.upper ? 'uppercase' : undefined,
    ...(display ? { fontFamily: DISPLAY_FONT[spec.weight as keyof typeof DISPLAY_FONT] } : { fontWeight: spec.weight }),
  };
  return <Text {...rest} style={[base, style]} />;
}
