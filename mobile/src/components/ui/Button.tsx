import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'onDark' | 'whatsapp';
export type IconName = keyof typeof Ionicons.glyphMap;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brandBright, fg: colors.textOnDark },
  secondary: { bg: colors.surface, fg: colors.brand, border: colors.border },
  danger: { bg: colors.danger, fg: colors.textOnDark },
  success: { bg: colors.safe, fg: colors.textOnDark },
  whatsapp: { bg: colors.whatsapp, fg: colors.textOnDark },
  ghost: { bg: 'transparent', fg: colors.brandBright },
  onDark: { bg: 'rgba(255,255,255,0.16)', fg: colors.textOnDark, border: 'rgba(255,255,255,0.4)' },
};

export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  loading,
  disabled,
  style,
  testID,
}: ButtonProps) {
  const tone = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        { backgroundColor: tone.bg, borderColor: tone.border ?? 'transparent' },
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'lg' ? 26 : 22} color={tone.fg} /> : null}
          <AppText variant={size === 'lg' ? 'heading' : 'bodyStrong'} color={tone.fg} center style={styles.label}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  large: { minHeight: 68, borderRadius: radius.lg, paddingHorizontal: spacing.xl },
  label: { flexShrink: 1 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  inactive: { opacity: 0.5 },
});
