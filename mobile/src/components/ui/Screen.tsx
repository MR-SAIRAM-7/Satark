import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/DemoBanner';
import { colors, MAX_CONTENT_WIDTH, spacing, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';

export interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Shows a back button. Pass a function to override where it goes. */
  back?: boolean | (() => void);
  right?: React.ReactNode;
  scroll?: boolean;
  /** Sticky area under the content, for primary actions. */
  footer?: React.ReactNode;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tab screens sit above the tab bar, which already handles the bottom inset. */
  inTabs?: boolean;
  /** Rendered under another header (e.g. a verdict hero): no top inset, no demo banner. */
  embedded?: boolean;
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Screen({
  children,
  title,
  subtitle,
  back,
  right,
  scroll = true,
  footer,
  background = colors.bg,
  contentStyle,
  inTabs,
  embedded,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const hasHeader = Boolean(title || back || right);

  const content = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: background, paddingTop: embedded ? 0 : insets.top }]}>
      {embedded ? null : <DemoBanner />}
      {hasHeader ? (
        <View style={styles.header}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={typeof back === 'function' ? back : goBack}
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}>
              <Ionicons name="arrow-back" size={26} color={colors.brand} />
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            {title ? (
              <AppText variant="title" numberOfLines={2} accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="label" color={colors.textMuted}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}

      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + (footer || inTabs ? 0 : insets.bottom) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}

      {footer ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + (inTabs ? 0 : insets.bottom) }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  backButton: {
    width: TOUCH - 8,
    height: TOUCH - 8,
    borderRadius: (TOUCH - 8) / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: spacing.sm },
});
