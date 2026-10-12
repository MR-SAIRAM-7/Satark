import { Text, type TextProps, type TextStyle } from 'react-native';

import { useSettings } from '@/store/settings';
import { colors, type, type TextVariant } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

/**
 * All text goes through here so the elder's chosen text size applies everywhere.
 * Line height is generous because Telugu and Devanagari glyphs sit taller than Latin.
 */
export function AppText({ variant = 'body', color = colors.text, center, style, ...rest }: AppTextProps) {
  const scale = useSettings((s) => s.textScale);
  const spec = type[variant];
  const fontSize = Math.round(spec.size * scale);
  const base: TextStyle = {
    fontSize,
    lineHeight: Math.round(fontSize * 1.42),
    fontWeight: spec.weight,
    color,
    textAlign: center ? 'center' : undefined,
  };
  return <Text {...rest} style={[base, style]} />;
}
