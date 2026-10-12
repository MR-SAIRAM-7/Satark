import { router } from 'expo-router';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/DemoBanner';
import { makeStyles, MAX_CONTENT_WIDTH, spacing, TAB_BAR_HEIGHT, useTheme } from '@/theme/tokens';

import { AppText } from './AppText';
import { IconButton } from './Button';

export interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  /** Shows a back button. Pass a function to override where it goes. */
  back?: boolean | (() => void);
  right?: React.ReactNode;
  scroll?: boolean;
  /** Sticky area under the content, for primary actions. */
  footer?: React.ReactNode;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tab screens: large title, and room for the floating tab bar. */
  inTabs?: boolean;
  /** Rendered under another header (e.g. a hero): no top inset, no demo banner. */
  embedded?: boolean;
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Space the floating tab bar takes at the bottom of a tab screen. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.md;
}

export function Screen({
  children,
  title,
  subtitle,
  eyebrow,
  back,
  right,
  scroll = true,
  footer,
  background,
  contentStyle,
  inTabs,
  embedded,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const styles = useStyles();
  const { c } = useTheme();
  const hasBar = Boolean(back || right);
  const bottomInset = inTabs ? tabSpace : insets.bottom;

  const content = (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.content, contentStyle]}>
      {title || eyebrow ? (
        <View style={styles.titleBlock}>
          {eyebrow ? (
            <AppText variant="overline" color={c.accentText}>
              {eyebrow}
            </AppText>
          ) : null}
          {title ? (
            <AppText variant={inTabs ? 'display' : 'title'} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="label" color={c.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: background ?? c.bg, paddingTop: embedded ? 0 : insets.top }]}>
      {embedded ? null : <DemoBanner />}
      {hasBar ? (
        <View style={styles.bar}>
          {back ? (
            <IconButton icon="chevron-back" label="Back" onPress={typeof back === 'function' ? back : goBack} />
          ) : (
            <View />
          )}
          <View style={styles.right}>{right}</View>
        </View>
      ) : null}

      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + (footer ? 0 : bottomInset) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingBottom: footer ? 0 : bottomInset }]}>{content}</View>
      )}

      {footer ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + bottomInset }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  root: { flex: 1 },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleBlock: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: spacing.sm },
}));
