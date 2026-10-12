import Ionicons from '@expo/vector-icons/Ionicons';
import { STAGES, type Evidence, type Stage } from '@satark/shared';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useLocalized } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';

export interface KillChainMeterProps {
  stage: Stage;
  evidence: readonly Evidence[];
  /** Colour of the reached stages: red for scam, amber for suspicious. */
  tone: string;
  /** Light text and track, for use on a coloured background. */
  onDark?: boolean;
  compact?: boolean;
}

const ICONS = ['chatbubble-ellipses', 'person-circle', 'warning', 'eye-off', 'cash'] as const;

/**
 * The Scam Kill Chain meter (F3): five stages, each with the phrase that
 * proved it. It fills as the conversation escalates, so the elder and the
 * judges can watch the scam unfold.
 */
export function KillChainMeter({ stage, evidence, tone, onDark, compact }: KillChainMeterProps) {
  const localized = useLocalized();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(stage / 5, { damping: 16, stiffness: 90 });
  }, [stage, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const track = onDark ? 'rgba(255,255,255,0.28)' : colors.border;
  const text = onDark ? colors.textOnDark : colors.text;
  const muted = onDark ? 'rgba(255,255,255,0.78)' : colors.textMuted;

  return (
    <View style={styles.root} accessibilityLabel={`Kill Chain stage ${stage} of 5`}>
      <View style={[styles.track, { backgroundColor: track }]}>
        <Animated.View style={[styles.fill, { backgroundColor: onDark ? colors.textOnDark : tone }, fillStyle]} />
      </View>

      <View style={styles.stages}>
        {STAGES.map((def, index) => {
          const reached = def.stage <= stage;
          const found = evidence.find((e) => e.stage === def.stage);
          // One sentence can prove two stages; show it once, under the later stage.
          const repeated = found && evidence.some((e) => e.stage > def.stage && e.quote === found.quote);
          const proof = repeated ? undefined : found;
          return (
            <StageRow
              key={def.stage}
              index={index}
              title={localized(def.title)}
              quote={compact ? undefined : proof?.quote}
              reached={reached}
              proven={Boolean(proof)}
              tone={tone}
              text={text}
              muted={muted}
              onDark={onDark}
              last={index === STAGES.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}

interface StageRowProps {
  index: number;
  title: string;
  quote?: string;
  reached: boolean;
  proven: boolean;
  tone: string;
  text: string;
  muted: string;
  onDark?: boolean;
  last: boolean;
}

function StageRow({ index, title, quote, reached, proven, tone, text, muted, onDark, last }: StageRowProps) {
  const scale = useSharedValue(reached ? 1 : 0.86);
  useEffect(() => {
    scale.value = reached ? withSpring(1, { damping: 9 }) : withTiming(0.86);
  }, [reached, scale]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const active = onDark ? colors.textOnDark : tone;
  const idle = onDark ? 'rgba(255,255,255,0.22)' : colors.surfaceAlt;
  const iconColor = reached ? (onDark ? tone : colors.textOnDark) : onDark ? 'rgba(255,255,255,0.7)' : colors.textFaint;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <Animated.View style={[styles.dot, { backgroundColor: reached ? active : idle }, dotStyle]}>
          <Ionicons name={ICONS[index] ?? 'ellipse'} size={18} color={iconColor} />
        </Animated.View>
        {last ? null : <View style={[styles.connector, { backgroundColor: reached ? active : idle }]} />}
      </View>
      <View style={styles.body}>
        <AppText variant={reached ? 'bodyStrong' : 'label'} color={reached ? text : muted}>
          {index + 1}. {title}
        </AppText>
        {quote && proven ? (
          <View style={[styles.quote, { borderLeftColor: active, backgroundColor: onDark ? 'rgba(0,0,0,0.18)' : colors.surfaceAlt }]}>
            <AppText variant="label" color={text} style={styles.quoteText}>
              “{quote}”
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  stages: { gap: 0 },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 36 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 3, flex: 1, minHeight: 10, marginVertical: 2, borderRadius: 2 },
  body: { flex: 1, paddingBottom: spacing.md, paddingTop: 5, gap: spacing.xs },
  quote: { borderLeftWidth: 3, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  quoteText: { fontStyle: 'italic', fontWeight: '500' },
});
