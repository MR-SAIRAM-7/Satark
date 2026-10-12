import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { tapFeedback } from './Button';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Tints the card, e.g. for a verdict or a granted permission. */
  tone?: { main: string; soft: string };
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ children, onPress, tone, padded = true, style, accessibilityLabel, testID }: CardProps) {
  const styles = useStyles();
  const { shadow } = useTheme();
  const body = [
    styles.card,
    shadow.card,
    padded && styles.padded,
    tone && { backgroundColor: tone.soft, borderColor: tone.main + '40' },
    style,
  ];
  if (!onPress) {
    return (
      <View testID={testID} style={body}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
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

const useStyles = makeStyles(({ c }) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
  },
  padded: { padding: spacing.lg + 2 },
  pressed: { transform: [{ scale: 0.985 }], backgroundColor: c.surface2 },
}));
