import Ionicons from '@expo/vector-icons/Ionicons';
import { STAGES, type Evidence, type Stage } from '@satark/shared';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useLocalized, useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';

export interface KillChainMeterProps {
  stage: Stage;
  evidence: readonly Evidence[];
  /** Colour of the reached stages: red for scam, saffron for suspicious. */
  tone: string;
  /** One line of five steps and the current stage's name, for pop-ups and cards. */
  compact?: boolean;
}

const ICONS = ['chatbubble-ellipses', 'person-circle', 'warning', 'eye-off', 'cash'] as const;

/**
 * The Scam Kill Chain meter (F3): five stages, each with the phrase that
 * proved it. It fills as the conversation escalates, so the elder and the
 * judges can watch the scam unfold.
 */
export function KillChainMeter({ stage, evidence, tone, compact }: KillChainMeterProps) {
  const localized = useLocalized();
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();

  if (compact) {
    const current = STAGES.find((s) => s.stage === stage);
    return (
      <View style={styles.compact} accessibilityLabel={`Kill Chain stage ${stage} of 5`}>
        <View style={styles.steps}>
          {STAGES.map((def, index) => {
            const reached = def.stage <= stage;
            return (
              <View key={def.stage} style={[styles.stepWrap, index < STAGES.length - 1 && styles.flex]}>
                <View style={[styles.step, { backgroundColor: reached ? tone : c.surface3 }]}>
                  <Ionicons name={ICONS[index] ?? 'ellipse'} size={15} color={reached ? '#FFFFFF' : c.textFaint} />
                </View>
                {index < STAGES.length - 1 ? <View style={[styles.link, { backgroundColor: def.stage < stage ? tone : c.surface3 }]} /> : null}
              </View>
            );
          })}
        </View>
        {current ? (
          <AppText variant="label" color={c.textMuted}>
            {t('verdict.stage', { n: stage })} · <AppText variant="label" color={c.text} style={styles.bold}>{localized(current.title)}</AppText>
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View accessibilityLabel={`Kill Chain stage ${stage} of 5`}>
      {STAGES.map((def, index) => {
        const reached = def.stage <= stage;
        const found = evidence.find((e) => e.stage === def.stage);
        // One sentence can prove two stages; show it once, under the later stage.
        const repeated = found && evidence.some((e) => e.stage > def.stage && e.quote === found.quote);
        return (
          <StageRow
            key={def.stage}
            index={index}
            title={localized(def.title)}
            quote={repeated ? undefined : found?.quote}
            reached={reached}
            tone={tone}
            last={index === STAGES.length - 1}
          />
        );
      })}
    </View>
  );
}

function StageRow({ index, title, quote, reached, tone, last }: { index: number; title: string; quote?: string; reached: boolean; tone: string; last: boolean }) {
  const styles = useStyles();
  const { c } = useTheme();
  const scale = useSharedValue(reached ? 1 : 0.86);
  useEffect(() => {
    scale.value = reached ? withSpring(1, { damping: 9 }) : withTiming(0.86);
  }, [reached, scale]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <Animated.View style={[styles.dot, { backgroundColor: reached ? tone : c.surface3 }, dotStyle]}>
          <Ionicons name={ICONS[index] ?? 'ellipse'} size={17} color={reached ? '#FFFFFF' : c.textFaint} />
        </Animated.View>
        {last ? null : <View style={[styles.connector, { backgroundColor: reached ? tone : c.surface3 }]} />}
      </View>
      <View style={styles.body}>
        <AppText variant={reached ? 'bodyStrong' : 'label'} color={reached ? c.text : c.textFaint}>
          {title}
        </AppText>
        {quote && reached ? (
          <View style={[styles.quote, { borderLeftColor: tone }]}>
            <AppText variant="label" color={c.textMuted} style={styles.quoteText}>
              “{quote}”
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  bold: { fontWeight: '700' },
  compact: { gap: spacing.sm },
  steps: { flexDirection: 'row', alignItems: 'center' },
  stepWrap: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  step: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  link: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 3 },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 34 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, flex: 1, minHeight: 10, marginVertical: 3, borderRadius: 1 },
  body: { flex: 1, paddingBottom: spacing.md, paddingTop: 5, gap: spacing.xs },
  quote: { borderLeftWidth: 3, borderRadius: radius.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: c.surface2 },
  quoteText: { fontStyle: 'italic' },
}));
