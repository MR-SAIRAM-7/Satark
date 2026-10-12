import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

/** QR scanner for the UPI checker (F5). The payload is checked before any payment app opens. */
export default function ScanScreen() {
  const t = useT();
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
        <EmptyState icon="qr-code" title={t('check.scan.title')} body={t('check.scan.unavailable')} />
      </Screen>
    );
  }

  if (!permission?.granted) {
    return (
      <Screen back title={t('check.scan.title')}>
        <EmptyState icon="camera" title={t('check.scan.title')} body={t('check.scan.permission')} />
        <Button label={t('onb.perm.allow')} icon="camera" size="lg" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen back title={t('check.scan.title')} scroll={false}>
      <View style={styles.frame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
        <View style={styles.target} />
      </View>
      <AppText variant="body" center color={colors.textMuted}>
        {t('check.scan.hint')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    maxHeight: 440,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  target: { width: 220, height: 220, borderRadius: radius.lg, borderWidth: 4, borderColor: colors.textOnDark },
});
