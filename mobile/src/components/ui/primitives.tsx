import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useSettings } from '@/store/settings';
import { colors, radius, spacing, TOUCH, type as typeScale } from '@/theme/tokens';

import { AppText } from './AppText';
import { tapFeedback, type IconName } from './Button';

/** Small heading above a group of cards, with an optional action on the right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <AppText variant="label" color={colors.brandBright}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Round, tinted icon: the visual anchor of a row or card. */
export function IconBadge({ name, color = colors.brandBright, soft = colors.brandSoft, size = 48 }: { name: IconName; color?: string; soft?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={Math.round(size * 0.5)} color={color} />
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
}

/** A settings-style row. Rows sit inside a Card with `padded={false}`. */
export function ListRow({ icon, title, subtitle, onPress, right, tone, last }: ListRowProps) {
  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <IconBadge name={icon} size={42} color={tone?.color} soft={tone?.soft} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="label" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textFaint} /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: colors.border, true: colors.brandBright }}
      thumbColor={colors.surface}
    />
  );
}

/** Pill for filters and choices. */
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.textOnDark : colors.brand} /> : null}
      <AppText variant="label" color={selected ? colors.textOnDark : colors.brand}>
        {label}
      </AppText>
    </Pressable>
  );
}

export interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labelled text input sized for the elder's chosen text scale. */
export function Field({ label, hint, containerStyle, style, multiline, ...rest }: FieldProps) {
  const scale = useSettings((s) => s.textScale);
  const fontSize = Math.round(typeScale.body.size * scale);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <AppText variant="label" color={colors.textMuted}>{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        accessibilityLabel={label}
        {...rest}
        style={[
          styles.input,
          { fontSize, lineHeight: Math.round(fontSize * 1.4) },
          multiline && styles.inputMultiline,
          style,
        ]}
      />
      {hint ? <AppText variant="caption" color={colors.textMuted}>{hint}</AppText> : null}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <IconBadge name={icon} size={72} color={colors.textFaint} soft={colors.surfaceAlt} />
      <AppText variant="heading" center color={colors.textMuted}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="label" center color={colors.textFaint}>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: TOUCH + 8,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  field: { gap: spacing.xs },
  input: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  inputMultiline: { minHeight: 150, textAlignVertical: 'top' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
});
