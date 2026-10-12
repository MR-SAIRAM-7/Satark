import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, MAX_CONTENT_WIDTH, radius, spacing, useTheme } from '@/theme/tokens';

export interface SheetProps {
  children: React.ReactNode;
  /** Tapping the backdrop closes the sheet. */
  onClose: () => void;
  /** Sticky actions under the scrolling content. */
  footer?: React.ReactNode;
  /** Edge-to-edge band above the content (e.g. a verdict colour); replaces the drag handle. */
  header?: React.ReactNode;
  testID?: string;
}

/**
 * Pop-up sheet over the current screen: a bottom sheet on a phone, a centred
 * card on a wide screen. Content scrolls; the actions stay put.
 */
export function Sheet({ children, onClose, footer, header, testID }: SheetProps) {
  const styles = useStyles();
  const { c, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 720;

  return (
    <View style={[styles.root, wide && styles.rootWide]} testID={testID}>
      <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(22).stiffness(190)}
        style={[
          styles.sheet,
          shadow.float,
          wide ? styles.sheetWide : { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          { maxHeight: height * (wide ? 0.86 : 0.92) },
        ]}
        accessibilityViewIsModal>
        {header ?? (wide ? null : <View style={styles.handle} />)}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  rootWide: { justifyContent: 'center', padding: spacing.xl },
  sheet: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  sheetWide: { borderRadius: radius.xxl },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, marginTop: spacing.sm },
  scroll: { flexGrow: 0 },
  content: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: c.border },
}));
