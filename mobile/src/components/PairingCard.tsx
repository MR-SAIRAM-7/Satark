import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { hasBackend } from '@/config/env';
import { linkFamily, newPairingCode, PAIRING_MINUTES } from '@/features/family/sync';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Ring } from './ui/primitives';

const TOTAL_MS = PAIRING_MINUTES * 60_000;

/** Milliseconds left until `expiresAt`, ticking every second until it runs out. */
function useTimeLeft(expiresAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) clearInterval(timer);
    };
    const first = setTimeout(tick, 0); // a new code shows its full time at once
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt]);
  return expiresAt - now;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * The elder's side of pairing: a one-time code made on request, shown large,
 * with a live countdown. It stops working after five minutes or once used.
 */
export function PairingCode() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const code = useSettings((s) => s.pairingCode);
  const expiresAt = useSettings((s) => s.pairingExpiresAt);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const left = useTimeLeft(expiresAt);
  const live = Boolean(code) && left > 0;

  const make = async () => {
    setBusy(true);
    setFailed(false);
    const fresh = await newPairingCode();
    setFailed(!fresh);
    setBusy(false);
  };

  return (
    <View style={styles.card}>
      {live ? (
        <Animated.View key={code} entering={ZoomIn.duration(260)} style={styles.center}>
          <AppText variant="overline" color={c.textMuted}>
            {t('pair.yourCode')}
          </AppText>
          <View style={styles.digits} accessibilityLabel={code.split('').join(' ')}>
            {code.split('').map((digit, index) => (
              <View key={index} style={[styles.digit, index === 3 && styles.digitGap]}>
                <AppText variant="numeral" color={c.text}>
                  {digit}
                </AppText>
              </View>
            ))}
          </View>
          <View style={styles.timer}>
            <Ring size={34} stroke={4} progress={left / TOTAL_MS} color={left < 60_000 ? c.warn : c.accent} />
            <AppText variant="bodyStrong" color={left < 60_000 ? c.warnText : c.text} accessibilityLiveRegion="polite">
              {t('pair.validFor', { time: clock(left) })}
            </AppText>
          </View>
          <AppText variant="label" color={c.textMuted} center>
            {t('pair.howTo')}
          </AppText>
          <Button label={t('pair.new')} icon="refresh" variant="ghost" size="sm" loading={busy} onPress={make} />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.center}>
          <View style={styles.icon}>
            <Ionicons name={code ? 'time-outline' : 'link'} size={30} color={c.accentText} />
          </View>
          <AppText variant="heading" center>
            {code ? t('pair.expired') : t('pair.title')}
          </AppText>
          <AppText variant="label" color={c.textMuted} center>
            {t('pair.body', { min: PAIRING_MINUTES })}
          </AppText>
          <Button testID="pair-generate" label={code ? t('pair.new') : t('pair.generate')} icon="key" size="lg" loading={busy} onPress={make} style={styles.wide} />
          {failed ? (
            <AppText variant="caption" color={c.warnText} center>
              {t('pair.offline')}
            </AppText>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}

/** The family side: type the code from the elder's phone. */
export function PairingEntry({ onLinked }: { onLinked?: (name: string) => void }) {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const showToast = useUi((s) => s.showToast);
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<string | null>(null);

  const link = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    const result = await linkFamily(code);
    setBusy(false);
    if (result === 'invalid') showToast(t('family.linkFailed'), 'warn');
    else if (!result) showToast(t('pair.offline'), 'warn');
    else {
      setLinked(result.name);
      showToast(t('family.linked', { name: result.name }), 'safe');
      onLinked?.(result.name);
    }
  };

  if (!hasBackend) {
    return (
      <View style={[styles.card, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={28} color={c.textMuted} />
        <AppText variant="label" color={c.textMuted} center>
          {t('pair.needsServer')}
        </AppText>
      </View>
    );
  }

  if (linked !== null) {
    return (
      <Animated.View entering={ZoomIn.duration(260)} style={[styles.card, styles.center]}>
        <View style={[styles.icon, { backgroundColor: c.safeSoft }]}>
          <Ionicons name="checkmark-circle" size={32} color={c.safeText} />
        </View>
        <AppText variant="heading" center>
          {t('family.linked', { name: linked })}
        </AppText>
      </Animated.View>
    );
  }

  return (
    <View style={styles.card}>
      <AppText variant="overline" color={c.textMuted} center>
        {t('onb.family.code')}
      </AppText>
      <Pressable onPress={() => input.current?.focus()} style={styles.digits} accessibilityLabel={t('onb.family.code')}>
        {Array.from({ length: 6 }, (_, index) => (
          <View key={index} style={[styles.digit, index === 3 && styles.digitGap, index === code.length && styles.digitActive]}>
            <AppText variant="numeral" color={c.text}>
              {code[index] ?? ''}
            </AppText>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        testID="pair-input"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={styles.hiddenInput}
        accessibilityLabel={t('onb.family.code')}
      />
      <AppText variant="caption" color={c.textMuted} center>
        {t('onb.family.code.hint')}
      </AppText>
      <Button testID="pair-link" label={t('pair.link')} icon="link" size="lg" loading={busy} disabled={code.length !== 6} onPress={link} />
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  card: { gap: spacing.md, padding: spacing.lg + 4, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  center: { alignItems: 'center', gap: spacing.md },
  wide: { alignSelf: 'stretch' },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  digit: {
    width: 40,
    height: 54,
    borderRadius: 14,
    backgroundColor: c.surface2,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitGap: { marginLeft: 8 },
  digitActive: { borderColor: c.accent },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
}));
