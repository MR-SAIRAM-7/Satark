import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/DemoBanner';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { goBack } from '@/components/ui/Screen';
import { buildScript } from '@/features/complaint/content';
import { advanceStage } from '@/features/complaint/tracker';
import { useT } from '@/i18n';
import { selectComplaint, useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { colors, MAX_CONTENT_WIDTH, radius, spacing } from '@/theme/tokens';

/**
 * Practice dialer (F8). In demo mode every call to 1930 or a bank lands here
 * instead of the phone app, so nothing reaches a real helpline. When opened
 * from a complaint it shows the script card and marks the tracker.
 */
export default function MockDialer() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string; name?: string; complaintId?: string }>();
  const complaint = useComplaints(selectComplaint(params.complaintId));
  const lang = useSettings((s) => s.lang);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const ring = setTimeout(() => {
      setConnected(true);
      if (params.complaintId && params.number === '1930') advanceStage(params.complaintId, 'helpline_1930');
    }, 1800);
    return () => clearTimeout(ring);
  }, [params.complaintId, params.number]);

  useEffect(() => {
    if (!connected) return;
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [connected]);

  const script = complaint ? buildScript(complaint, lang) : [];
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <DemoBanner />
      <View style={styles.content}>
        <View style={styles.note}>
          <Ionicons name="flask" size={16} color={colors.warnBright} />
          <AppText variant="label" color={colors.warnBright}>
            {t('mock.dialer.note')}
          </AppText>
        </View>

        <View style={styles.avatar}>
          <Ionicons name="call" size={44} color={colors.textOnDark} />
        </View>
        <AppText variant="title" color={colors.textOnDark} center>
          {params.name ?? t('mock.dialer.title')}
        </AppText>
        <AppText variant="display" color={colors.textOnDark} center>
          {params.number}
        </AppText>
        <AppText variant="heading" color={connected ? '#7CE0A6' : 'rgba(255,255,255,0.7)'} center>
          {connected ? `${t('mock.dialer.connected')} · ${clock}` : t('mock.dialer.calling')}
        </AppText>

        {script.length > 0 ? (
          <View style={styles.script}>
            <AppText variant="bodyStrong" color={colors.textOnDark}>
              {t('kit.script')}
            </AppText>
            {script.map((line, index) => (
              <AppText key={line} variant="label" color="rgba(255,255,255,0.92)">
                {index + 1}. {line}
              </AppText>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button testID="dialer-end" label={t('mock.dialer.end')} icon="call" variant="danger" size="lg" onPress={goBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDeep },
  content: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: 'rgba(245,158,11,0.16)', marginBottom: spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  script: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.1)' },
  footer: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.xl },
});
