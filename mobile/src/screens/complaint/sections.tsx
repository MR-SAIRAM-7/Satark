import Ionicons from '@expo/vector-icons/Ionicons';
import { FIR_STAGES } from '@satark/shared';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Toggle } from '@/components/ui/primitives';
import { advanceDemo, saveAcknowledgement } from '@/features/complaint/tracker';
import { useT } from '@/i18n';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Complaint, WhatsAppMessage } from '@/types';
import { clockTime, dayAndTime } from '@/utils/time';

/** FIR tracker: the seven stages, which are done, and what comes next. */
export function Tracker({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const demoMode = useSettings((s) => s.demoMode);
  const [ack, setAck] = useState('');
  const [busy, setBusy] = useState(false);
  const done = new Map(complaint.timeline.map((e) => [e.stage, e]));
  const next = FIR_STAGES.find((s) => !done.has(s));

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.section}>
      <AppText variant="heading">{t('fir.title')}</AppText>

      <View>
        {FIR_STAGES.map((stage, index) => {
          const event = done.get(stage);
          const isNext = stage === next;
          return (
            <View key={stage} style={styles.stage}>
              <View style={styles.rail}>
                <View style={[styles.dot, event && styles.dotDone, isNext && styles.dotNext]}>
                  {event ? <Ionicons name="checkmark" size={16} color={colors.textOnDark} /> : null}
                </View>
                {index < FIR_STAGES.length - 1 ? <View style={[styles.line, event && styles.lineDone]} /> : null}
              </View>
              <View style={styles.stageBody}>
                <AppText variant={event || isNext ? 'bodyStrong' : 'body'} color={event ? colors.text : isNext ? colors.brandBright : colors.textFaint}>
                  {t(`fir.stage.${stage}`)}
                </AppText>
                {event ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    {dayAndTime(event.at)}
                    {stage === 'acknowledged' && complaint.ackNumber ? ` · ${complaint.ackNumber}` : ''}
                    {stage === 'zero_fir' && complaint.firNumber ? ` · ${complaint.firNumber}` : ''}
                  </AppText>
                ) : isNext ? (
                  <AppText variant="caption" color={colors.brandBright}>
                    {t('fir.next')}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {complaint.ackNumber ? null : (
        <View style={styles.ack}>
          <Field label={t('kit.ack')} placeholder={t('kit.ack.placeholder')} value={ack} onChangeText={setAck} autoCapitalize="characters" containerStyle={styles.flex} />
          <Button label={t('common.save')} disabled={!ack.trim() || busy} onPress={() => run(() => saveAcknowledgement(complaint.id, ack))} />
        </View>
      )}

      {demoMode && next ? (
        <Button testID="fir-advance" label={t('fir.advance')} icon="play-forward" variant="secondary" loading={busy} onPress={() => run(() => advanceDemo(complaint.id))} />
      ) : null}

      <AppText variant="caption" color={colors.textMuted}>
        {t('fir.noAutoSubmit')}
      </AppText>
    </Card>
  );
}

const STATUS_ICON: Record<WhatsAppMessage['status'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  queued: { icon: 'time-outline', color: colors.textFaint },
  sent: { icon: 'checkmark', color: colors.textFaint },
  delivered: { icon: 'checkmark-done', color: colors.brandBright },
  failed: { icon: 'alert-circle', color: colors.danger },
  demo: { icon: 'checkmark-done', color: colors.brandBright },
};

/** What Satark has sent on WhatsApp (through Twilio) for this complaint. */
export function WhatsAppLog({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const guardian = useSettings((s) => s.guardian);
  const demoMode = useSettings((s) => s.demoMode);
  const patch = useComplaints((s) => s.patch);

  return (
    <Card style={styles.section}>
      <View style={styles.waHeader}>
        <Ionicons name="logo-whatsapp" size={28} color={colors.whatsapp} />
        <View style={styles.flex}>
          <AppText variant="heading">{t('fir.updates')}</AppText>
          <AppText variant="label" color={colors.textMuted}>
            {guardian ? t('fir.updates.sub', { name: guardian.name }) : t('fir.updates.solo')}
          </AppText>
        </View>
        <Toggle value={complaint.updatesEnabled} onChange={(updatesEnabled) => patch(complaint.id, { updatesEnabled })} label={t('fir.updates')} />
      </View>

      {complaint.whatsapp.length === 0 ? (
        <AppText variant="label" color={colors.textFaint}>
          {t('fir.wa.empty')}
        </AppText>
      ) : (
        <View style={styles.chat}>
          {complaint.whatsapp.map((message) => {
            const status = STATUS_ICON[message.status];
            return (
              <View key={message.id} style={styles.bubble}>
                <AppText variant="caption" color={colors.whatsapp} style={styles.bubbleTo}>
                  → {message.to === 'guardian' ? (guardian?.name ?? t('role.guardian')) : t('role.elder')}
                  {demoMode || message.status === 'demo' ? ' · DEMO' : ''}
                </AppText>
                {message.attachment ? (
                  <View style={styles.attachment}>
                    <Ionicons name="document" size={20} color={colors.danger} />
                    <AppText variant="label" style={styles.flex} numberOfLines={1}>
                      {message.attachment}
                    </AppText>
                  </View>
                ) : null}
                <AppText variant="label">{message.body}</AppText>
                <View style={styles.bubbleMeta}>
                  <AppText variant="caption" color={colors.textFaint}>
                    {clockTime(message.at)}
                  </AppText>
                  <Ionicons name={status.icon} size={16} color={status.color} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

/** Collapsible block of prepared text with a copy button: one per portal field. */
export function CopyBlock({ title, subtitle, text, startOpen }: { title: string; subtitle?: string; text: string; startOpen?: boolean }) {
  const t = useT();
  const showToast = useUi((s) => s.showToast);
  const [open, setOpen] = useState(Boolean(startOpen));

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    showToast(t('common.copied'), 'safe');
  };

  return (
    <Card style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.copyHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="label" color={colors.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <>
          <View style={styles.pre}>
            <AppText variant="label" selectable style={styles.preText}>
              {text}
            </AppText>
          </View>
          <Button label={t('common.copy')} icon="copy" variant="secondary" onPress={copy} />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.md },
  stage: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.safe, borderColor: colors.safe },
  dotNext: { borderColor: colors.brandBright, borderWidth: 3 },
  line: { width: 3, flex: 1, minHeight: 14, backgroundColor: colors.border, borderRadius: 2 },
  lineDone: { backgroundColor: colors.safe },
  stageBody: { flex: 1, paddingBottom: spacing.md, paddingTop: 1 },
  ack: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  waHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chat: { gap: spacing.sm, backgroundColor: '#ECE5DD', borderRadius: radius.md, padding: spacing.md },
  bubble: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: colors.surface, borderRadius: radius.md, borderTopLeftRadius: 4, padding: spacing.md, gap: spacing.xs },
  bubbleTo: { fontWeight: '800' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm },
  copyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pre: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md },
  preText: { fontWeight: '400' },
});
