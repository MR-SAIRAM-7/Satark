import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useProtection } from '@/hooks/useProtection';
import { useT, type StringKey } from '@/i18n';
import { SatarkNative } from '@/services/native';
import { initNotifications } from '@/services/notifications';
import { speak } from '@/services/voice';
import { colors, radius, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Button, type IconName } from './ui/Button';
import { Card } from './ui/Card';
import { IconBadge } from './ui/primitives';

type PermissionId = 'notif' | 'calls' | 'overlay' | 'battery' | 'alerts';

interface PermissionDef {
  id: PermissionId;
  icon: IconName;
  /** Needs the Kotlin module, so it is unavailable in Expo Go and on the web. */
  native: boolean;
}

const PERMISSIONS: PermissionDef[] = [
  { id: 'notif', icon: 'chatbubbles', native: true },
  { id: 'calls', icon: 'call', native: true },
  { id: 'overlay', icon: 'warning', native: true },
  { id: 'battery', icon: 'battery-charging', native: true },
  { id: 'alerts', icon: 'notifications', native: false },
];

/**
 * Consent for each permission, one at a time, each explained in the user's own
 * language and read aloud (DPDP Act: informed consent). Least privilege: no SMS
 * permission, no Accessibility Service, no call log.
 */
export function PermissionsList() {
  const t = useT();
  const { status, nativeAvailable, refresh } = useProtection();
  const [alertsGranted, setAlertsGranted] = useState(false);

  const granted: Record<PermissionId, boolean> = {
    notif: status.notificationAccess,
    calls: status.callScreening,
    overlay: status.overlay,
    battery: status.batteryUnrestricted,
    alerts: alertsGranted,
  };

  const request = async (id: PermissionId) => {
    speak(t(`onb.perm.${id}.body` as StringKey));
    switch (id) {
      case 'notif':
        SatarkNative.openNotificationAccessSettings();
        break;
      case 'calls':
        await SatarkNative.requestCallScreeningRole();
        break;
      case 'overlay':
        SatarkNative.openOverlaySettings();
        break;
      case 'battery':
        SatarkNative.requestIgnoreBatteryOptimizations();
        break;
      case 'alerts':
        setAlertsGranted(await initNotifications());
        break;
    }
    refresh();
  };

  return (
    <View style={styles.list}>
      {PERMISSIONS.map((p) => {
        const isGranted = granted[p.id];
        const unavailable = p.native && !nativeAvailable;
        return (
          <Card key={p.id} style={styles.card} tone={isGranted ? { main: colors.safe, soft: colors.safeSoft } : undefined}>
            <View style={styles.top}>
              <IconBadge
                name={p.icon}
                color={isGranted ? colors.safe : colors.brandBright}
                soft={isGranted ? colors.surface : colors.brandSoft}
              />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{t(`onb.perm.${p.id}.title` as StringKey)}</AppText>
                <AppText variant="label" color={colors.textMuted}>
                  {t(`onb.perm.${p.id}.body` as StringKey)}
                </AppText>
              </View>
            </View>
            {isGranted ? (
              <View style={styles.granted}>
                <Ionicons name="checkmark-circle" size={22} color={colors.safe} />
                <AppText variant="label" color={colors.safeDeep}>
                  {t('onb.perm.allowed')}
                </AppText>
              </View>
            ) : unavailable ? (
              <View style={styles.unavailable}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.textMuted} />
                <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
                  {t('onb.perm.needsApp')}
                </AppText>
              </View>
            ) : (
              <Button label={t('onb.perm.allow')} variant="secondary" onPress={() => request(p.id)} />
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  granted: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
