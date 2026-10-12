import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, tapFeedback } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { hasBackend, hasDirectLlm } from '@/config/env';
import { runScenario, useDemo } from '@/features/demo/runner';
import { ROUNDS, SCENARIOS, type Scenario } from '@/features/demo/scenarios';
import { loadSampleHistory } from '@/features/demo/seed';
import { useT } from '@/i18n';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

function ScenarioCard({ scenario, last }: { scenario: Scenario; last: boolean }) {
  const styles = useStyles();
  const { c } = useTheme();
  const runningId = useDemo((s) => s.runningId);
  const step = useDemo((s) => s.step);
  const running = runningId === scenario.id;
  const blocked = Boolean(runningId) && !running;

  return (
    <Pressable
      testID={`demo-${scenario.id}`}
      accessibilityRole="button"
      accessibilityLabel={scenario.title}
      disabled={Boolean(runningId)}
      onPress={() => {
        tapFeedback();
        void runScenario(scenario);
      }}
      style={({ pressed }) => [styles.scenario, !last && styles.divider, pressed && { backgroundColor: c.surface2 }, blocked && styles.blocked]}>
      <View style={[styles.scenarioIcon, running && { backgroundColor: c.accent }]}>
        <Ionicons name={scenario.icon} size={22} color={running ? '#FFFFFF' : c.accentText} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{scenario.title}</AppText>
        <AppText variant="label" color={c.textMuted}>
          {scenario.description}
        </AppText>
        {running && scenario.steps.length > 1 ? (
          <View style={styles.steps}>
            {scenario.steps.map((_, i) => (
              <View key={i} style={[styles.stepDot, i < step && { backgroundColor: c.accent }]} />
            ))}
          </View>
        ) : null}
      </View>
      <View style={[styles.play, running && { backgroundColor: c.accentSoft }]}>
        {running ? <ActivityIndicator size="small" color={c.accentText} /> : <Ionicons name="play" size={18} color={c.onFill} />}
      </View>
    </Pressable>
  );
}

/**
 * Demo control room (F8). Every button feeds scripted events into the real
 * pipeline, so the engine, the Kill Chain meter, the voice and the alerts on
 * stage are the live product. Laid out in the order of the pitch.
 */
export default function DemoScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  // There is deliberately no "erase everything" here: one stray tap must never wipe a family's history.
  const loadHistory = async () => {
    setBusy(true);
    await loadSampleHistory();
    setBusy(false);
    showToast('Sample history loaded', 'safe');
  };

  const others = SCENARIOS.filter((s) => !s.round);
  const engine = hasBackend ? 'Satark server (layers 1-5)' : hasDirectLlm ? 'On-device layers 1-2 + Kill Chain, AI analyst direct' : 'On-device: layers 1-2, Kill Chain, community cache';

  return (
    <Screen back title={t('settings.demoRoom')} subtitle={t('settings.demoRoom.sub')}>
      <View style={styles.engine}>
        <Ionicons name="hardware-chip-outline" size={18} color={c.accentText} />
        <AppText variant="caption" color={c.accentText} style={styles.flex}>
          {engine}
        </AppText>
      </View>

      {ROUNDS.map(({ round, title, subtitle }) => (
        <View key={round} style={styles.group}>
          <SectionHeader title={title} />
          <AppText variant="label" color={c.textMuted} style={styles.groupSub}>
            {subtitle}
          </AppText>
          <Card padded={false} style={styles.cardClip}>
            {SCENARIOS.filter((s) => s.round === round).map((scenario, index, list) => (
              <ScenarioCard key={scenario.id} scenario={scenario} last={index === list.length - 1} />
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.group}>
        <SectionHeader title="More scenarios" />
        <Card padded={false} style={styles.cardClip}>
          {others.map((scenario, index) => (
            <ScenarioCard key={scenario.id} scenario={scenario} last={index === others.length - 1} />
          ))}
        </Card>
      </View>

      <View style={styles.group}>
        <SectionHeader title="Demo data" />
        <Button label="Load sample history" icon="time-outline" variant="secondary" loading={busy} onPress={loadHistory} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  engine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.accentSoft, alignSelf: 'flex-start' },
  group: { gap: spacing.sm },
  groupSub: { paddingHorizontal: spacing.xs },
  cardClip: { overflow: 'hidden' },
  scenario: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  blocked: { opacity: 0.45 },
  scenarioIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 4, marginTop: 6 },
  stepDot: { width: 18, height: 4, borderRadius: 2, backgroundColor: c.surface3 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
}));
