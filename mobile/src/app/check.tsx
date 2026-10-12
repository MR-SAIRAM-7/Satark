import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, Field, SectionHeader, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { SAMPLES } from '@/data/samples';
import { processIncoming } from '@/features/detection/pipeline';
import { useLocalized, useT } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme/tokens';

/** "Is this safe?" (F1, F7): paste, share or scan anything and get a verdict. */
export default function CheckScreen() {
  const t = useT();
  const localized = useLocalized();
  const styles = useStyles();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ shared?: string; qr?: string }>();

  const [text, setText] = useState(params.shared ?? params.qr ?? '');
  const [sender, setSender] = useState('');
  const [expecting, setExpecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (input: string, from: string, source: 'paste' | 'share' | 'qr', expectingToReceive = expecting) => {
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      const check = await processIncoming({ source, text: input, sender: from.trim() || null }, { userInitiated: true, context: { expectingToReceive } });
      if (check) router.replace({ pathname: '/verdict/[id]', params: { id: check.id } });
    } finally {
      setBusy(false);
    }
  };

  // Text shared from another app, or a QR payload from the scanner, is checked straight away.
  useEffect(() => {
    const { shared, qr } = params;
    if (!shared && !qr) return;
    const timer = setTimeout(() => (shared ? run(shared, '', 'share') : run(qr ?? '', '', 'qr', true)), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.shared, params.qr]);

  const paste = async () => {
    const clip = await Clipboard.getStringAsync().catch(() => '');
    if (clip) setText(clip);
  };

  return (
    <Screen
      back
      title={t('check.title')}
      subtitle={params.shared ? t('check.shared') : t('check.sub')}
      footer={
        <Button
          testID="check-now"
          label={busy ? t('check.checking') : t('check.button')}
          icon="shield-checkmark"
          size="lg"
          loading={busy}
          disabled={!text.trim()}
          onPress={() => run(text, sender, 'paste')}
        />
      }>
      <Field testID="check-input" value={text} onChangeText={setText} placeholder={t('check.placeholder')} multiline autoFocus={!params.shared && !params.qr} />

      <View style={styles.actions}>
        <Chip label={t('check.paste')} icon="clipboard-outline" onPress={paste} />
        <Chip label={t('check.scan')} icon="qr-code-outline" onPress={() => router.push('/scan')} />
        {text ? <Chip label={t('check.clear')} icon="close" onPress={() => setText('')} /> : null}
      </View>

      <Field label={t('check.sender')} value={sender} onChangeText={setSender} placeholder={t('check.sender.placeholder')} autoCapitalize="none" icon="person-outline" />

      <Card style={styles.expecting}>
        <AppText variant="body" style={styles.flex}>
          {t('check.expecting')}
        </AppText>
        <Toggle value={expecting} onChange={setExpecting} label={t('check.expecting')} />
      </Card>

      <SectionHeader title={t('check.examples')} />
      {/* flexGrow 0: a horizontal list must not stretch to fill the screen's height. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll} contentContainerStyle={styles.examples}>
        {SAMPLES.map((sample) => (
          <Chip
            key={sample.id}
            label={localized(sample.title)}
            icon={sample.isScam ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            onPress={() => {
              setText(sample.text);
              setSender(sample.sender);
            }}
          />
        ))}
      </ScrollView>
      <AppText variant="caption" color={c.textFaint}>
        {t('settings.privacy.body')}
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  expecting: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  examplesScroll: { flexGrow: 0 },
  examples: { gap: spacing.sm, paddingVertical: 2, alignItems: 'center' },
}));
