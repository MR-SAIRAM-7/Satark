import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

/** QR scanner for the UPI checker (F5). The payload is checked before any payment app opens. */
export default function ScanScreen() {
  const t = useT();
  const styles = useStyles();
  const { c } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const onScanned = ({ data }: { data: string }) => {
    if (handled.current || !data) return;
    handled.current = true;
    router.replace({ pathname: '/check', params: { qr: data } });
  };

  if (Platform.OS === 'web') {
    return (
      <Screen back title={t('check.scan.title')}>
        <EmptyState
          icon="qr-code-outline"
          title={t('check.scan.title')}
          body={t('check.scan.unavailable')}
          action={<Button label={t('check.title')} icon="clipboard-outline" variant="tonal" onPress={() => router.replace('/check')} />}
        />
      </Screen>
    );
  }

  if (!permission?.granted) {
    return (
      <Screen back title={t('check.scan.title')}>
        <EmptyState icon="camera-outline" title={t('check.scan.title')} body={t('check.scan.permission')} />
        <Button label={t('onb.perm.allow')} icon="camera" size="lg" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen back title={t('check.scan.title')} scroll={false}>
      <View style={styles.frame}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />
        <View style={styles.target}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
      </View>
      <AppText variant="body" center color={c.textMuted}>
        {t('check.scan.hint')}
      </AppText>
    </Screen>
  );
}

const CORNER = 34;
const useStyles = makeStyles(({ c }) => ({
  frame: {
    flex: 1,
    maxHeight: 460,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: c.ink[1],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  target: { width: 230, height: 230 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
}));
