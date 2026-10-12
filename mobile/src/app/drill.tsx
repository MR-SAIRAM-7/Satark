import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { goBack, Screen } from '@/components/ui/Screen';
import { DRILL_IDS, sampleById, type Sample } from '@/data/samples';
import { useLocalized, useT } from '@/i18n';
import { speak } from '@/services/voice';
import { useDrills } from '@/store/activity';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Scam drills, the "scam vaccine" (F20): safe practice on real scam scripts.
 * Each answer is explained and spoken, and feeds the guardian's readiness score.
 */
export default function DrillScreen() {
  const t = useT();
  const localized = useLocalized();
  const record = useDrills((s) => s.record);
  const drills = useMemo(() => DRILL_IDS.map(sampleById).filter((s): s is Sample => Boolean(s)), []);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const drill = drills[index];
  const finished = index >= drills.length;

  useEffect(() => {
    if (finished) speak(`${t('drill.done')}. ${t('drill.score', { n: score, total: drills.length })}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished || !drill) {
    return (
      <Screen back title={t('learn.drills')} footer={
        <>
          <Button label={t('drill.again')} icon="refresh" size="lg" onPress={() => { setIndex(0); setScore(0); setAnswer(null); }} />
          <Button label={t('common.done')} variant="ghost" onPress={goBack} />
        </>
      }>
        <View style={styles.result}>
          <View style={styles.trophy}>
            <Ionicons name="ribbon" size={72} color={colors.warnBright} />
          </View>
          <AppText variant="display" center>
            {t('drill.done')}
          </AppText>
          <AppText variant="title" center color={colors.safe}>
            {t('drill.score', { n: score, total: drills.length })}
          </AppText>
        </View>
      </Screen>
    );
  }

  const correct = answer !== null && answer === drill.isScam;

  const choose = (saysScam: boolean) => {
    if (answer !== null) return;
    const right = saysScam === drill.isScam;
    setAnswer(saysScam);
    if (right) setScore((s) => s + 1);
    record(drill.id, right);
    speak(`${t(right ? 'drill.correct' : 'drill.wrong')} ${localized(drill.lesson)}`);
  };

  const next = () => {
    setAnswer(null);
    setIndex((i) => i + 1);
  };

  return (
    <Screen
      back
      title={t('drill.question')}
      subtitle={t('drill.progress', { n: index + 1, total: drills.length })}
      footer={
        answer === null ? (
          <View style={styles.choices}>
            <Button testID="drill-scam" label={t('drill.scam')} icon="alert-circle" variant="danger" size="lg" style={styles.flex} onPress={() => choose(true)} />
            <Button testID="drill-safe" label={t('drill.safe')} icon="shield-checkmark" variant="success" size="lg" style={styles.flex} onPress={() => choose(false)} />
          </View>
        ) : (
          <Button testID="drill-next" label={t('common.next')} icon="arrow-forward" size="lg" onPress={next} />
        )
      }>
      <View style={styles.progress}>
        {drills.map((d, i) => (
          <View key={d.id} style={[styles.segment, i < index && styles.segmentDone, i === index && styles.segmentNow]} />
        ))}
      </View>

      <View key={drill.id} style={styles.step}>
        <Card style={styles.message}>
          <View style={styles.from}>
            <Ionicons name={drill.source === 'whatsapp' ? 'logo-whatsapp' : 'chatbox'} size={20} color={colors.textMuted} />
            <AppText variant="label" color={colors.textMuted}>
              {drill.sender}
            </AppText>
          </View>
          <AppText variant="body">{drill.text}</AppText>
        </Card>

        {answer !== null ? (
          <Card tone={correct ? { main: colors.safe, soft: colors.safeSoft } : { main: colors.danger, soft: colors.dangerSoft }} style={styles.feedback}>
            <View style={styles.from}>
              <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={30} color={correct ? colors.safe : colors.danger} />
              <AppText variant="heading" color={correct ? colors.safeDeep : colors.dangerDeep}>
                {t(correct ? 'drill.correct' : 'drill.wrong')} · {t(drill.isScam ? 'drill.scam' : 'drill.safe')}
              </AppText>
            </View>
            <AppText variant="body">{localized(drill.lesson)}</AppText>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  choices: { flexDirection: 'row', gap: spacing.md },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.safe },
  segmentNow: { backgroundColor: colors.brandBright },
  step: { gap: spacing.lg },
  message: { gap: spacing.md },
  from: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedback: { gap: spacing.sm },
  result: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  trophy: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.warnSoft, alignItems: 'center', justifyContent: 'center' },
});
