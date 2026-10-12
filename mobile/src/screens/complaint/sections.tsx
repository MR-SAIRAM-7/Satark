import Ionicons from '@expo/vector-icons/Ionicons';
import { FIR_STAGES } from '@satark/shared';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Toggle } from '@/components/ui/primitives';
import { advanceDemo, saveAcknowledgement } from '@/features/complaint/tracker';
import { useT } from '@/i18n';
import { useComplaints } from '@/store/complaints';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme, type Palette } from '@/theme/tokens';
import type { Complaint, WhatsAppMessage } from '@/types';
import { clockTime, dayAndTime } from '@/utils/time';

/** FIR tracker: the seven stages, which are done, and what comes next. */
export function Tracker({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
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
      <View style={styles.headerRow}>
        <AppText variant="heading" style={styles.flex}>
          {t('fir.title')}
        </AppText>
        <AppText variant="label" color={c.textMuted}>
          {done.size}/{FIR_STAGES.length}
        </AppText>
      </View>

      <View>
        {FIR_STAGES.map((stage, index) => {
          const event = done.get(stage);
          const isNext = stage === next;
          return (
            <View key={stage} style={styles.stage}>
              <View style={styles.rail}>
                <View style={[styles.dot, event && styles.dotDone, isNext && styles.dotNext]}>
                  {event ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : isNext ? <View style={styles.dotNextCore} /> : null}
                </View>
                {index < FIR_STAGES.length - 1 ? <View style={[styles.line, event && styles.lineDone]} /> : null}
              </View>
              <View style={styles.stageBody}>
                <AppText variant={event || isNext ? 'bodyStrong' : 'body'} color={event ? c.text : isNext ? c.accentText : c.textFaint}>
                  {t(`fir.stage.${stage}`)}
                </AppText>
                {event ? (
                  <AppText variant="caption" color={c.textMuted}>
                    {dayAndTime(event.at)}
                    {stage === 'acknowledged' && complaint.ackNumber ? ` · ${complaint.ackNumber}` : ''}
                    {stage === 'zero_fir' && complaint.firNumber ? ` · ${complaint.firNumber}` : ''}
                  </AppText>
                ) : isNext ? (
                  <AppText variant="caption" color={c.accentText}>
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
        <Button testID="fir-advance" label={t('fir.advance')} icon="play-forward" variant="tonal" loading={busy} onPress={() => run(() => advanceDemo(complaint.id))} />
      ) : null}

      <View style={styles.note}>
        <Ionicons name="lock-closed" size={16} color={c.textMuted} />
        <AppText variant="caption" color={c.textMuted} style={styles.flex}>
          {t('fir.noAutoSubmit')}
        </AppText>
      </View>
    </Card>
  );
}

function statusIcon(c: Palette, status: WhatsAppMessage['status']): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (status) {
    case 'queued':
      return { icon: 'time-outline', color: c.textFaint };
    case 'sent':
      return { icon: 'checkmark', color: c.textFaint };
    case 'delivered':
    case 'demo':
      return { icon: 'checkmark-done', color: '#34B7F1' };
    case 'failed':
      return { icon: 'alert-circle', color: c.dangerText };
  }
}

/** What Satark has sent on WhatsApp (through Twilio) for this complaint. */
export function WhatsAppLog({ complaint }: { complaint: Complaint }) {
  const t = useT();
  const styles = useStyles();
  const { c, scheme } = useTheme();
  const guardian = useSettings((s) => s.guardian);
  const demoMode = useSettings((s) => s.demoMode);
  const patch = useComplaints((s) => s.patch);

  return (
    <Card style={styles.section}>
      <View style={styles.waHeader}>
        <View style={[styles.waIcon, { backgroundColor: c.whatsapp }]}>
          <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{t('fir.updates')}</AppText>
          <AppText variant="label" color={c.textMuted}>
            {guardian ? t('fir.updates.sub', { name: guardian.name }) : t('fir.updates.solo')}
          </AppText>
        </View>
        <Toggle value={complaint.updatesEnabled} onChange={(updatesEnabled) => patch(complaint.id, { updatesEnabled })} label={t('fir.updates')} />
      </View>

      {complaint.whatsapp.length === 0 ? (
        <AppText variant="label" color={c.textFaint}>
          {t('fir.wa.empty')}
        </AppText>
      ) : (
        <View style={[styles.chat, { backgroundColor: scheme === 'dark' ? '#0B141A' : '#EFE7DD' }]}>
          {complaint.whatsapp.map((message) => {
            const status = statusIcon(c, message.status);
            return (
              <View key={message.id} style={[styles.bubble, { backgroundColor: scheme === 'dark' ? '#1F2C34' : '#FFFFFF' }]}>
                <AppText variant="caption" color={scheme === 'dark' ? '#53BDEB' : c.whatsapp} style={styles.bubbleTo}>
                  → {message.to === 'guardian' ? (guardian?.name ?? t('role.guardian')) : t('role.elder')}
                  {demoMode || message.status === 'demo' ? ' · DEMO' : ''}
                </AppText>
                {message.attachment ? (
                  <View style={styles.attachment}>
                    <Ionicons name="document" size={20} color={c.dangerText} />
                    <AppText variant="label" style={styles.flex} numberOfLines={1}>
                      {message.attachment}
                    </AppText>
                  </View>
                ) : null}
                <AppText variant="label">{message.body}</AppText>
                <View style={styles.bubbleMeta}>
                  <AppText variant="caption" color={c.textFaint}>
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
  const styles = useStyles();
  const { c } = useTheme();
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
            <AppText variant="label" color={c.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.chevron}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.textMuted} />
        </View>
      </Pressable>
      {open ? (
        <>
          <View style={styles.pre}>
            <AppText variant="label" selectable style={styles.preText}>
              {text}
            </AppText>
          </View>
          <Button label={t('common.copy')} icon="copy-outline" variant="tonal" onPress={copy} />
        </>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  section: { gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stage: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 26 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: c.safe, borderColor: c.safe },
  dotNext: { borderColor: c.accent },
  dotNextCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  line: { width: 2, flex: 1, minHeight: 14, backgroundColor: c.border, borderRadius: 1 },
  lineDone: { backgroundColor: c.safe },
  stageBody: { flex: 1, paddingBottom: spacing.md, paddingTop: 1 },
  ack: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surface2 },
  waHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chat: { gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md },
  bubble: { alignSelf: 'flex-start', maxWidth: '92%', borderRadius: radius.md, borderTopLeftRadius: 4, padding: spacing.md, gap: spacing.xs },
  bubbleTo: { fontWeight: '800' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.surface2, borderRadius: radius.sm, padding: spacing.sm },
  copyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chevron: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
  pre: { backgroundColor: c.surface2, borderRadius: radius.sm, padding: spacing.md },
  preText: { fontWeight: '400' },
}));
