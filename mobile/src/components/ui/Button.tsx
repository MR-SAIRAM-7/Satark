import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, TOUCH, useTheme, type Palette } from '@/theme/tokens';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'success' | 'ghost' | 'onDark' | 'whatsapp';
export type IconName = keyof typeof Ionicons.glyphMap;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  /** Icon after the label, e.g. an arrow on "Continue". */
  trailingIcon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

function tone(c: Palette, variant: ButtonVariant): { bg: string; pressed: string; fg: string; border?: string } {
  switch (variant) {
    case 'primary':
      return { bg: c.accent, pressed: c.accentPressed, fg: c.onFill };
    case 'secondary':
      return { bg: c.surface2, pressed: c.surface3, fg: c.text, border: c.border };
    case 'tonal':
      return { bg: c.accentSoft, pressed: c.surface3, fg: c.accentText };
    case 'danger':
      return { bg: c.danger, pressed: c.dangerText, fg: c.onFill };
    case 'success':
      return { bg: c.safe, pressed: c.safeText, fg: c.onFill };
    case 'whatsapp':
      return { bg: c.whatsapp, pressed: c.safe, fg: c.onFill };
    case 'ghost':
      return { bg: 'transparent', pressed: c.surface2, fg: c.accentText };
    case 'onDark':
      return { bg: 'rgba(255,255,255,0.14)', pressed: 'rgba(255,255,255,0.24)', fg: '#FFFFFF', border: 'rgba(255,255,255,0.22)' };
  }
}

export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
}

const HEIGHT = { sm: 44, md: TOUCH - 4, lg: 62 } as const;

/** Pill button. Every press scales down slightly and ticks the haptics, so a tap always feels answered. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  size = 'md',
  loading,
  disabled,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const { c } = useTheme();
  const t = tone(c, variant);
  const inactive = disabled || loading;
  const iconSize = size === 'lg' ? 24 : size === 'sm' ? 18 : 21;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: HEIGHT[size], paddingHorizontal: size === 'sm' ? spacing.lg : spacing.xl },
        { backgroundColor: pressed ? t.pressed : t.bg, borderColor: t.border ?? 'transparent' },
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconSize} color={t.fg} /> : null}
          {label ? (
            <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} color={t.fg} center style={styles.label}>
              {label}
            </AppText>
          ) : null}
          {trailingIcon ? <Ionicons name={trailingIcon} size={iconSize} color={t.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Round icon-only button: close, back, play, theme switch. */
export function IconButton({
  icon,
  onPress,
  label,
  variant = 'secondary',
  size = 48,
  color,
  testID,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  variant?: ButtonVariant;
  size?: number;
  color?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const t = tone(c, variant);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: pressed ? t.pressed : t.bg, borderColor: t.border ?? 'transparent' },
        pressed && styles.pressed,
        style,
      ]}>
      <View>
        <Ionicons name={icon} size={Math.round(size * 0.46)} color={color ?? t.fg} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { flexShrink: 1 },
  icon: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  inactive: { opacity: 0.45 },
});
