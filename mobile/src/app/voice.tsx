import Ionicons from '@expo/vector-icons/Ionicons';
import { LANGUAGES, voiceLineFor, type LangCode } from '@satark/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { tapFeedback } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow, Pill, SectionHeader, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { env, hasBackend } from '@/config/env';
import { useT } from '@/i18n';
import { useServerStatus } from '@/services/health';
import { deviceVoiceFor, speak, type VoiceEngine } from '@/services/voice';
import { useSettings } from '@/store/settings';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

/**
 * Voice warnings in every Indian language Satark speaks. Each tile plays the
 * scam warning in that language and says which voice spoke it, so a family
 * can check before the day it matters.
 */
export default function VoiceScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const voiceEnabled = useSettings((s) => s.voiceEnabled);
  const update = useSettings((s) => s.update);
  const { status } = useServerStatus();
  const [installed, setInstalled] = useState<Partial<Record<LangCode, boolean>>>({});
  const [playing, setPlaying] = useState<LangCode | null>(null);
  const [result, setResult] = useState<Partial<Record<LangCode, VoiceEngine>>>({});

  // Which languages this phone (or browser) has its own voice for.
  useEffect(() => {
    let alive = true;
    void Promise.all(LANGUAGES.map(async (l) => [l.code, Boolean(await deviceVoiceFor(l.code))] as const)).then((pairs) => {
      if (alive) setInstalled(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Sarvam speaks through the server; without one, through the app's own key if it has one.
  const cloud = (status.state === 'online' && status.voice) || (!hasBackend && Boolean(env.sarvam.apiKey));

  const test = async (lang: LangCode) => {
    tapFeedback();
    setPlaying(lang);
    const engine = await speak(voiceLineFor('scam', 'digital_arrest', lang), { lang, force: true, budgetMs: 6000 });
    setResult((r) => ({ ...r, [lang]: engine }));
    setPlaying(null);
  };

  const engineLabel = (engine: VoiceEngine) => t(engine === 'cloud' ? 'voice.used.cloud' : engine === 'device' ? 'voice.used.device' : 'voice.used.none');

  return (
    <Screen back title={t('voice.title')} subtitle={t('voice.sub')}>
      <Card padded={false}>
        <ListRow
          icon="volume-high"
          title={t('settings.voice')}
          subtitle={t('settings.voice.sub')}
          right={<Toggle value={voiceEnabled} onChange={(next) => update({ voiceEnabled: next })} label={t('settings.voice')} />}
          last
        />
      </Card>

      <View style={[styles.engine, { backgroundColor: cloud ? c.safeSoft : c.accentSoft }]}>
        <Ionicons name={cloud ? 'sparkles' : 'phone-portrait-outline'} size={22} color={cloud ? c.safeText : c.accentText} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={cloud ? c.safeText : c.accentText}>
            {t(cloud ? 'voice.engine.cloud' : 'voice.engine.device')}
          </AppText>
          <AppText variant="label" color={c.textMuted}>
            {t(cloud ? 'voice.engine.cloud.sub' : 'voice.engine.device.sub')}
          </AppText>
        </View>
      </View>

      <SectionHeader title={t('voice.languages')} />
      <View style={styles.grid}>
        {LANGUAGES.map((l) => {
          const busy = playing === l.code;
          const used = result[l.code];
          const ready = cloud || installed[l.code];
          return (
            <Pressable
              key={l.code}
              testID={`voice-${l.code}`}
              accessibilityRole="button"
              accessibilityLabel={`${t('settings.voice.test')}: ${l.english}`}
              onPress={() => test(l.code)}
              disabled={Boolean(playing)}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
              <View style={styles.tileTop}>
                <View style={styles.flex}>
                  <AppText variant="heading">
                    {l.native}
                  </AppText>
                  <AppText variant="caption" color={c.textMuted}>
                    {l.english}
                  </AppText>
                </View>
                <View style={[styles.play, { backgroundColor: ready ? c.accent : c.surface3 }]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="play" size={17} color={ready ? '#FFFFFF' : c.textMuted} />}
                </View>
              </View>
              <View style={styles.tileBottom}>
                {used ? (
                  <Pill
                    label={engineLabel(used)}
                    color={used === 'none' ? c.warnText : c.safeText}
                    soft={used === 'none' ? c.warnSoft : c.safeSoft}
                    icon={used === 'none' ? 'alert-circle' : 'checkmark-circle'}
                  />
                ) : (
                  <Pill
                    label={cloud ? t('voice.has.cloud') : installed[l.code] ? t('voice.has.device') : installed[l.code] === false ? t('voice.has.none') : '…'}
                    color={ready ? c.textMuted : c.warnText}
                    soft={c.surface2}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb-outline" size={18} color={c.textMuted} />
        <AppText variant="caption" color={c.textMuted} style={styles.flex}>
          {t('voice.tip')}
        </AppText>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  engine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    gap: spacing.sm + 2,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  tilePressed: { backgroundColor: c.surface2, transform: [{ scale: 0.97 }] },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tileBottom: { flexDirection: 'row', alignItems: 'center' },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surface2 },
}));
