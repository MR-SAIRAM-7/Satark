import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/tokens';

import { tapFeedback } from './Button';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Tints the card and draws a coloured edge, e.g. for a verdict. */
  tone?: { main: string; soft: string };
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, tone, padded = true, style, accessibilityLabel }: CardProps) {
  const body = [
    styles.card,
    padded && styles.padded,
    tone && { backgroundColor: tone.soft, borderColor: tone.main, borderLeftWidth: 5 },
    style,
  ];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [body, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.85 },
});
