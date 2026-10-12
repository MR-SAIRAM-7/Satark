import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, Switch, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, TOUCH, type as typeScale, useTheme } from '@/theme/tokens';

import { AppText } from './AppText';
import { tapFeedback, type IconName } from './Button';

/** Small uppercase heading above a group, with an optional action on the right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="overline" color={c.textMuted} accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <AppText variant="label" color={c.accentText}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Rounded-square tinted icon: the visual anchor of a row or card. */
export function IconBadge({ name, color, soft, size = 48 }: { name: IconName; color?: string; soft?: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: soft ?? c.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={name} size={Math.round(size * 0.5)} color={color ?? c.accentText} />
    </View>
  );
}

export interface ListRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  tone?: { color: string; soft: string };
  last?: boolean;
  testID?: string;
}

/** A grouped-list row. Rows sit inside a Card with `padded={false}`. */
export function ListRow({ icon, title, subtitle, onPress, right, tone, last, testID }: ListRowProps) {
  const styles = useStyles();
  const { c } = useTheme();
  const body = (pressed = false) => (
    <View style={[styles.row, pressed && { backgroundColor: c.surface2 }]}>
      <IconBadge name={icon} size={40} color={tone?.color} soft={tone?.soft} />
      <View style={[styles.rowText, !last && styles.rowDivider]}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          {subtitle ? (
            <AppText variant="label" color={c.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={c.textFaint} /> : null)}
      </View>
    </View>
  );
  if (!onPress) return body();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tapFeedback();
        onPress();
      }}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

// The browser's own focus outline; the wrapper draws Satark's focus ring instead.
const NO_OUTLINE: object = Platform.OS === 'web' ? { outlineStyle: 'none' } : {};

// react-native-web paints the "on" thumb teal unless told otherwise.
const WEB_THUMB: object = Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {};

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (next: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(next) => {
        tapFeedback();
        onChange(next);
      }}
      accessibilityLabel={label}
      trackColor={{ false: c.surface3, true: c.accent }}
      thumbColor="#FFFFFF"
      {...WEB_THUMB}
    />
  );
}

/** Pill for choices and quick actions. */
export function Chip({ label, selected, onPress, icon, testID }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; testID?: string }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={17} color={selected ? c.onFill : c.accentText} /> : null}
      <AppText variant="label" color={selected ? c.onFill : c.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
  /** Small count after the label. */
  count?: number;
}

/** iOS-style segmented control: one fixed-height track, the selection slides between equal segments. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  testID,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={styles.segmented} accessibilityRole="tablist" testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              tapFeedback();
              onChange(option.value);
            }}
            style={[styles.segment, selected && styles.segmentSelected]}>
            {option.icon ? <Ionicons name={option.icon} size={17} color={selected ? c.text : c.textMuted} /> : null}
            <AppText variant="label" color={selected ? c.text : c.textMuted} numberOfLines={1} style={selected ? styles.segmentLabelOn : undefined}>
              {option.label}
            </AppText>
            {option.count !== undefined && option.count > 0 ? (
              <View style={[styles.segmentCount, selected && { backgroundColor: c.accent }]}>
                <AppText variant="caption" color={selected ? c.onFill : c.textMuted} style={styles.segmentCountText}>
                  {option.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  icon?: IconName;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labelled text input sized for the elder's chosen text scale, with a clear focus ring. */
export function Field({ label, hint, icon, containerStyle, style, multiline, onFocus, onBlur, ...rest }: FieldProps) {
  const styles = useStyles();
  const { c } = useTheme();
  const scale = useSettings((s) => s.textScale);
  const [focused, setFocused] = useState(false);
  const fontSize = Math.round(typeScale.body.size * scale);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <AppText variant="label" color={c.textMuted}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.inputWrap, focused && styles.inputFocused, multiline && styles.inputWrapMultiline]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? c.accentText : c.textFaint} style={multiline ? styles.inputIconTop : undefined} /> : null}
        <TextInput
          placeholderTextColor={c.textFaint}
          multiline={multiline}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          style={[
            styles.input,
            { fontSize, lineHeight: Math.round(fontSize * 1.4), color: c.text },
            multiline && styles.inputMultiline,
            style,
          ]}
        />
      </View>
      {hint ? (
        <AppText variant="caption" color={c.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Calm empty state: a layered icon, a title and one helpful sentence. */
export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: React.ReactNode }) {
  const styles = useStyles();
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyHalo}>
        <IconBadge name={icon} size={64} color={c.accentText} soft={c.accentSoft} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      {body ? (
        <AppText variant="label" center color={c.textMuted}>
          {body}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

/** Small rounded label: status, score, "DEMO". */
export function Pill({ label, color, soft, icon }: { label: string; color: string; soft: string; icon?: IconName }) {
  const styles = useStyles();
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
      <AppText variant="caption" color={color} style={styles.pillText} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** Thin progress ring with content in the middle: readiness, risk, countdowns. */
export function Ring({
  size,
  stroke = 8,
  progress,
  color,
  track,
  children,
}: {
  size: number;
  stroke?: number;
  progress: number;
  color: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

/** Horizontal meter, e.g. a layer score or a scam type's share. */
export function Meter({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.surface3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

const useStyles = makeStyles(({ c, scheme }) => ({
  flex: { flex: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: -spacing.xs, paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    minHeight: TOUCH + 12,
  },
  rowText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.accent, borderColor: c.accent },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
  },
  segmentSelected: {
    backgroundColor: scheme === 'dark' ? c.surface3 : c.surface,
    boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
  },
  segmentLabelOn: { fontWeight: '700' },
  segmentCount: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface3 },
  segmentCountText: { fontWeight: '800', lineHeight: 16 },
  field: { gap: spacing.xs + 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.lg,
  },
  inputWrapMultiline: { alignItems: 'flex-start' },
  inputFocused: { borderColor: c.accent, boxShadow: `0 0 0 4px ${c.accentSoft}` },
  inputIconTop: { marginTop: spacing.md + 2 },
  // The focus ring is drawn on the wrapper; no browser outline on the input itself.
  input: { flex: 1, paddingVertical: spacing.md, ...NO_OUTLINE },
  inputMultiline: { minHeight: 150, textAlignVertical: 'top' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyHalo: { padding: 12, borderRadius: 40, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', flexShrink: 1, gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontWeight: '700', flexShrink: 1 },
}));
