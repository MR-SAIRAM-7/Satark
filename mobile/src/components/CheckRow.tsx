import Ionicons from '@expo/vector-icons/Ionicons';
import { maskPhone, SCAM_TYPES } from '@satark/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useLocalized, useT, type StringKey } from '@/i18n';
import { colors, radius, spacing, verdictPalette } from '@/theme/tokens';
import type { CheckRecord } from '@/types';
import { timeAgo } from '@/utils/time';

import { AppText } from './ui/AppText';
import { Card } from './ui/Card';

const SOURCE_ICON: Record<CheckRecord['source'], keyof typeof Ionicons.glyphMap> = {
  sms: 'chatbox',
  whatsapp: 'logo-whatsapp',
  share: 'share-social',
  paste: 'clipboard',
  forward: 'arrow-redo',
  call: 'call',
  transcript: 'mic',
  link: 'link',
  qr: 'qr-code',
};

/** One analysed message in a list: verdict colour, who sent it, and the first line. */
export function CheckRow({ check }: { check: CheckRecord }) {
  const t = useT();
  const localized = useLocalized();
  const { verdict, scam_type, score } = check.response;
  const palette = verdictPalette[verdict];
  const title = verdict === 'safe' ? t('verdict.safe') : localized(SCAM_TYPES[scam_type].label);
  const sender = check.sender ? maskPhone(check.sender) : t(`source.${check.source}` as StringKey);

  return (
    <Card
      onPress={() => router.push({ pathname: '/verdict/[id]', params: { id: check.id } })}
      accessibilityLabel={`${title}. ${sender}`}
      style={styles.card}>
      <View style={[styles.icon, { backgroundColor: palette.soft }]}>
        <Ionicons name={palette.icon} size={26} color={palette.main} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <AppText variant="bodyStrong" color={palette.deep} numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <AppText variant="caption" color={colors.textFaint}>
            {timeAgo(check.createdAt, t)}
          </AppText>
        </View>
        <AppText variant="label" color={colors.textMuted} numberOfLines={2}>
          {check.text}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name={SOURCE_ICON[check.source]} size={14} color={colors.textFaint} />
          <AppText variant="caption" color={colors.textFaint} numberOfLines={1} style={styles.sender}>
            {sender}
          </AppText>
          {verdict !== 'safe' ? (
            <View style={[styles.score, { backgroundColor: palette.soft }]}>
              <AppText variant="caption" color={palette.deep} style={styles.scoreText}>
                {score}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  sender: { flex: 1 },
  score: { paddingHorizontal: spacing.sm, borderRadius: radius.pill },
  scoreText: { fontWeight: '800' },
});
