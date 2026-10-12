import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, MAX_CONTENT_WIDTH, radius, spacing, TAB_BAR_HEIGHT, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { tapFeedback, type IconName } from './ui/Button';

export const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['shield-checkmark', 'shield-checkmark-outline'],
  activity: ['pulse', 'pulse-outline'],
  reports: ['document-text', 'document-text-outline'],
  learn: ['school', 'school-outline'],
  settings: ['settings', 'settings-outline'],
};

/**
 * Floating tab bar: a capsule above the content, the selected tab marked by a
 * tinted pill behind its icon. Labels always show, because icons alone are a
 * guessing game for many older users.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { c, shadow } = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.bar, shadow.float]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const [active, idle] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const badge = options.tabBarBadge;

          const onPress = () => {
            tapFeedback();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              testID={`tab-${route.name}`}
              onPress={onPress}
              style={styles.tab}>
              <View style={[styles.iconPill, focused && styles.iconPillOn]}>
                <Ionicons name={focused ? active : idle} size={23} color={focused ? c.accentText : c.textMuted} />
                {badge !== undefined ? (
                  <View style={styles.badge}>
                    <AppText variant="caption" color={c.onFill} style={styles.badgeText}>
                      {String(badge)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" color={focused ? c.text : c.textMuted} numberOfLines={1} style={focused ? styles.labelOn : undefined}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xxl,
    backgroundColor: c.chrome,
    borderWidth: 1,
    borderColor: c.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconPill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconPillOn: { backgroundColor: c.accentSoft },
  labelOn: { fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.surface,
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
}));
