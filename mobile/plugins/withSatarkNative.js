// @ts-check
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const PKG = 'expo.modules.satarknative';

/**
 * Declares the Android components of modules/satark-native in the generated
 * manifest. With Continuous Native Generation the android/ folder is rebuilt on
 * every `expo prebuild`, so everything the Kotlin code needs lives here.
 *
 * Least privilege: no SMS permission (notification access covers SMS), no
 * Accessibility Service, no call log, and a <queries> entry for exactly the two
 * remote-access apps Satark looks for instead of QUERY_ALL_PACKAGES.
 */

/** @param {any[]} list @param {string} name @param {any} entry */
function upsert(list, name, entry) {
  const index = list.findIndex((item) => item.$ && item.$['android:name'] === name);
  if (index >= 0) list[index] = entry;
  else list.push(entry);
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withSatarkNative = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);

    app.service = app.service ?? [];
    app.receiver = app.receiver ?? [];

    // F1: reads SMS and WhatsApp notification text. Android keeps this bound while access is granted.
    upsert(app.service, `${PKG}.SatarkNotificationListener`, {
      $: {
        'android:name': `${PKG}.SatarkNotificationListener`,
        'android:label': 'Satark message protection',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        { action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }] },
      ],
    });

    // F9: sees the caller's number before the phone rings.
    upsert(app.service, `${PKG}.SatarkScreeningService`, {
      $: {
        'android:name': `${PKG}.SatarkScreeningService`,
        'android:permission': 'android.permission.BIND_SCREENING_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.telecom.CallScreeningService' } }] }],
    });

    // Keeps the process alive around the clock, with a permanent "Satark is protecting you" notification.
    upsert(app.service, `${PKG}.ProtectionService`, {
      $: {
        'android:name': `${PKG}.ProtectionService`,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'Continuous on-device scam protection for incoming messages and calls',
          },
        },
      ],
    });

    // Runs the shared TypeScript detection pipeline when a message arrives and the app is closed.
    upsert(app.service, `${PKG}.NotificationTaskService`, {
      $: { 'android:name': `${PKG}.NotificationTaskService`, 'android:exported': 'false' },
    });

    // Restart protection after a reboot or an app update.
    upsert(app.receiver, `${PKG}.BootReceiver`, {
      $: { 'android:name': `${PKG}.BootReceiver`, 'android:exported': 'true' },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
          ],
        },
      ],
    });

    // R10: detect AnyDesk / TeamViewer QuickSupport without the all-packages permission.
    const queries = (manifest.queries = manifest.queries ?? [{}]);
    const first = queries[0];
    const packages = (first.package = first.package ?? []);
    for (const name of ['com.anydesk.anydeskandroid', 'com.teamviewer.quicksupport.market']) {
      if (!packages.some((/** @type {any} */ p) => p.$['android:name'] === name)) {
        packages.push({ $: { 'android:name': name } });
      }
    }

    return mod;
  });

module.exports = withSatarkNative;
