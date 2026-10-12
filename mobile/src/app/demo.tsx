import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconBadge, SectionHeader } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { hasBackend, hasDirectLlm } from '@/config/env';
import { runScenario, useDemo } from '@/features/demo/runner';
import { ROUNDS, SCENARIOS, type Scenario } from '@/features/demo/scenarios';
import { loadSampleHistory, resetDemoData } from '@/features/demo/seed';
import { useT } from '@/i18n';
import { useUi } from '@/store/ui';
import { colors, radius, spacing } from '@/theme/tokens';

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const runningId = useDemo((s) => s.runningId);
  const step = useDemo((s) => s.step);
  const running = runningId === scenario.id;

  return (
    <Card style={styles.scenario}>
      <IconBadge name={scenario.icon} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{scenario.title}</AppText>
        <AppText variant="label" color={colors.textMuted}>
          {scenario.description}
        </AppText>
        {running && scenario.steps.length > 1 ? (
          <AppText variant="caption" color={colors.brandBright}>
            {step} / {scenario.steps.length}
          </AppText>
        ) : null}
      </View>
      <Button
        testID={`demo-${scenario.id}`}
        label=""
        icon={running ? 'hourglass' : 'play'}
        loading={running}
        disabled={Boolean(runningId) && !running}
        onPress={() => runScenario(scenario)}
        style={styles.play}
      />
    </Card>
  );
}

/**
 * Demo control room (F8). Every button feeds scripted events into the real
 * pipeline, so the engine, the Kill Chain meter, the voice and the alerts on
 * stage are the live product. Laid out in the order of the pitch.
 */
export default function DemoScreen() {
  const t = useT();
  const showToast = useUi((s) => s.showToast);
  const [busy, setBusy] = useState<'history' | 'reset' | null>(null);

  const withBusy = async (kind: 'history' | 'reset', fn: () => Promise<void>, message: string) => {
    setBusy(kind);
    await fn();
    setBusy(null);
    showToast(message, 'safe');
  };

  const others = SCENARIOS.filter((s) => !s.round);
  const engine = hasBackend ? 'Satark server (layers 1-5)' : hasDirectLlm ? 'On-device layers 1-2 + Kill Chain, AI analyst direct' : 'On-device: layers 1-2, Kill Chain, community cache';

  return (
    <Screen back title={t('settings.demoRoom')} subtitle={t('settings.demoRoom.sub')}>
      <View style={styles.engine}>
        <Ionicons name="hardware-chip" size={18} color={colors.brand} />
        <AppText variant="caption" color={colors.brand} style={styles.flex}>
          {engine}
        </AppText>
      </View>

      {ROUNDS.map(({ round, title, subtitle }) => (
        <View key={round} style={styles.group}>
          <SectionHeader title={title} />
          <AppText variant="label" color={colors.textMuted}>
            {subtitle}
          </AppText>
          {SCENARIOS.filter((s) => s.round === round).map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </View>
      ))}

      <View style={styles.group}>
        <SectionHeader title="More scenarios" />
        {others.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </View>

      <View style={styles.group}>
        <SectionHeader title="Demo data" />
        <Button
          label="Load sample history"
          icon="time"
          variant="secondary"
          loading={busy === 'history'}
          onPress={() => withBusy('history', loadSampleHistory, 'Sample history loaded')}
        />
        <Button
          testID="demo-reset"
          label="Reset demo data"
          icon="refresh"
          variant="secondary"
          loading={busy === 'reset'}
          onPress={() => withBusy('reset', resetDemoData, 'Demo data reset')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  engine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  group: { gap: spacing.sm },
  scenario: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  play: { width: 56, paddingHorizontal: 0, borderRadius: 28 },
});
