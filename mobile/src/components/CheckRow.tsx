import Ionicons from '@expo/vector-icons/Ionicons';
import { maskPhone, SCAM_TYPES } from '@satark/shared';
import { router } from 'expo-router';
import { View } from 'react-native';

import { useLocalized, useT, type StringKey } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';
import type { CheckRecord } from '@/types';
import { timeAgo } from '@/utils/time';

import { AppText } from './ui/AppText';
import { Card } from './ui/Card';

export const SOURCE_ICON: Record<CheckRecord['source'], keyof typeof Ionicons.glyphMap> = {
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

/** One analysed message in a list: verdict, who sent it, the first line, and the risk score. */
export function CheckRow({ check }: { check: CheckRecord }) {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c, verdict: looks } = useTheme();
  const { verdict, scam_type, score } = check.response;
  const look = looks[verdict];
  const title = verdict === 'safe' ? t('verdict.safe') : localized(SCAM_TYPES[scam_type].label);
  const sender = check.sender ? maskPhone(check.sender) : t(`source.${check.source}` as StringKey);

  return (
    <Card
      onPress={() => router.push({ pathname: '/verdict/[id]', params: { id: check.id } })}
      accessibilityLabel={`${title}. ${sender}`}
      style={styles.card}>
      <View style={[styles.icon, { backgroundColor: look.soft }]}>
        <Ionicons name={look.icon} size={24} color={look.text} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <AppText variant="caption" color={c.textFaint}>
            {timeAgo(check.createdAt, t)}
          </AppText>
        </View>
        <AppText variant="label" color={c.textMuted} numberOfLines={2}>
          {check.text}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name={SOURCE_ICON[check.source]} size={14} color={c.textFaint} />
          <AppText variant="caption" color={c.textFaint} numberOfLines={1} style={styles.sender}>
            {sender}
          </AppText>
          {verdict !== 'safe' ? (
            <View style={[styles.score, { backgroundColor: look.soft }]}>
              <AppText variant="caption" color={look.text} style={styles.scoreText}>
                {t('verdict.riskShort', { score })}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md + 2 },
  icon: { width: 46, height: 46, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  sender: { flex: 1 },
  score: { paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.pill },
  scoreText: { fontWeight: '800' },
}));
