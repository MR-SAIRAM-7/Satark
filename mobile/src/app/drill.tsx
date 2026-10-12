import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Ring } from '@/components/ui/primitives';
import { goBack, Screen } from '@/components/ui/Screen';
import { DRILL_IDS, sampleById, type Sample } from '@/data/samples';
import { useLocalized, useT } from '@/i18n';
import { api } from '@/services/api';
import { speak } from '@/services/voice';
import { useDrills } from '@/store/activity';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

/**
 * Scam drills, the "scam vaccine" (F20): safe practice on real scam scripts.
 * Each answer is explained and spoken, and feeds the guardian's readiness score.
 */
export default function DrillScreen() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c } = useTheme();
  const record = useDrills((s) => s.record);
  const drills = useMemo(() => DRILL_IDS.map(sampleById).filter((s): s is Sample => Boolean(s)), []);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const drill = drills[index];
  const finished = index >= drills.length;

  useEffect(() => {
    if (finished) void speak(`${t('drill.done')}. ${t('drill.score', { n: score, total: drills.length })}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished || !drill) {
    return (
      <Screen
        back
        footer={
          <>
            <Button
              label={t('drill.again')}
              icon="refresh"
              size="lg"
              onPress={() => {
                setIndex(0);
                setScore(0);
                setAnswer(null);
              }}
            />
            <Button label={t('common.done')} variant="ghost" onPress={goBack} />
          </>
        }>
        <Animated.View entering={ZoomIn.duration(320)} style={styles.result}>
          <Ring size={168} stroke={12} progress={drills.length ? score / drills.length : 0} color={c.safe}>
            <AppText variant="hero">{`${score}/${drills.length}`}</AppText>
          </Ring>
          <AppText variant="display" center>
            {t('drill.done')}
          </AppText>
          <AppText variant="heading" center color={c.textMuted}>
            {t('drill.score', { n: score, total: drills.length })}
          </AppText>
        </Animated.View>
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
    void api.drillResult(drill.id, right);
    void speak(`${t(right ? 'drill.correct' : 'drill.wrong')} ${localized(drill.lesson)}`);
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
          <Button testID="drill-next" label={t('common.next')} trailingIcon="arrow-forward" size="lg" onPress={next} />
        )
      }>
      <View style={styles.progress}>
        {drills.map((d, i) => (
          <View key={d.id} style={[styles.segment, i < index && styles.segmentDone, i === index && styles.segmentNow]} />
        ))}
      </View>

      <Animated.View key={drill.id} entering={FadeInDown.duration(300)} style={styles.step}>
        <View style={styles.from}>
          <View style={[styles.avatar, { backgroundColor: drill.source === 'whatsapp' ? c.whatsapp : c.accent }]}>
            <Ionicons name={drill.source === 'whatsapp' ? 'logo-whatsapp' : 'chatbox'} size={18} color="#FFFFFF" />
          </View>
          <AppText variant="bodyStrong">{drill.sender}</AppText>
        </View>
        <View style={styles.bubble}>
          <AppText variant="body">{drill.text}</AppText>
        </View>

        {answer !== null ? (
          <Animated.View entering={ZoomIn.duration(240)} style={[styles.feedback, { backgroundColor: correct ? c.safeSoft : c.dangerSoft }]}>
            <View style={styles.from}>
              <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={28} color={correct ? c.safeText : c.dangerText} />
              <AppText variant="heading" color={correct ? c.safeText : c.dangerText} style={styles.flex}>
                {t(correct ? 'drill.correct' : 'drill.wrong')} · {t(drill.isScam ? 'drill.scam' : 'drill.safe')}
              </AppText>
            </View>
            <AppText variant="body">{localized(drill.lesson)}</AppText>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  choices: { flexDirection: 'row', gap: spacing.md },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: c.surface3 },
  segmentDone: { backgroundColor: c.safe },
  segmentNow: { backgroundColor: c.accent },
  step: { gap: spacing.md },
  from: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bubble: { padding: spacing.lg, borderRadius: radius.lg, borderTopLeftRadius: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  feedback: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg },
  result: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
}));
