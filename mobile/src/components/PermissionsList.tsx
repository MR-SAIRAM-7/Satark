import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';

import { useProtection } from '@/hooks/useProtection';
import { useT, type StringKey } from '@/i18n';
import { SatarkNative } from '@/services/native';
import { initNotifications } from '@/services/notifications';
import { speak } from '@/services/voice';
import { makeStyles, radius, spacing, useTheme } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Button, type IconName } from './ui/Button';
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
  const styles = useStyles();
  const { c } = useTheme();
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
    void speak(t(`onb.perm.${id}.body` as StringKey));
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
          <View key={p.id} style={[styles.card, isGranted && styles.cardGranted]}>
            <IconBadge name={p.icon} size={44} color={isGranted ? c.safeText : c.accentText} soft={isGranted ? c.safeSoft : c.accentSoft} />
            <View style={styles.body}>
              <AppText variant="bodyStrong">{t(`onb.perm.${p.id}.title` as StringKey)}</AppText>
              <AppText variant="label" color={c.textMuted}>
                {t(`onb.perm.${p.id}.body` as StringKey)}
              </AppText>
              {isGranted ? (
                <View style={styles.status}>
                  <Ionicons name="checkmark-circle" size={18} color={c.safeText} />
                  <AppText variant="label" color={c.safeText} style={styles.bold}>
                    {t('onb.perm.allowed')}
                  </AppText>
                </View>
              ) : unavailable ? (
                <View style={styles.status}>
                  <Ionicons name="phone-portrait-outline" size={16} color={c.textMuted} />
                  <AppText variant="caption" color={c.textMuted} style={styles.flex}>
                    {t('onb.perm.needsApp')}
                  </AppText>
                </View>
              ) : (
                <Button label={t('onb.perm.allow')} variant="tonal" size="sm" onPress={() => request(p.id)} style={styles.allow} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  list: { gap: spacing.sm + 2 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  cardGranted: { borderColor: c.safe + '55' },
  body: { flex: 1, gap: spacing.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  allow: { alignSelf: 'flex-start', marginTop: spacing.xs },
}));
