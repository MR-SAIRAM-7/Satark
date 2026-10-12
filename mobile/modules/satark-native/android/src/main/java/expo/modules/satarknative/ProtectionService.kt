package expo.modules.satarknative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Keeps Satark running 24/7. A foreground service with a permanent, silent
 * notification tells Android (and the aggressive battery managers on Xiaomi,
 * Realme, Vivo and Oppo phones) that this process is doing user-visible work
 * and must not be killed. It also lets the notification listener start the
 * headless JavaScript task while the app is in the background.
 */
class ProtectionService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = buildNotification()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      running = true
    } catch (e: Exception) {
      // Android refused a background start; the notification listener still works on its own.
      stopSelf()
    }
    // If the system kills the process, restart the service when memory allows.
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    super.onDestroy()
  }

  private fun buildNotification(): android.app.Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Protection status", NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      manager.createNotificationChannel(channel)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
    val open = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(SatarkStore.serviceTitle(this))
      .setContentText(SatarkStore.serviceText(this))
      .setContentIntent(open)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "satark-protection"
    private const val NOTIFICATION_ID = 1930

    @Volatile
    var running: Boolean = false
      private set

    fun start(context: Context) {
      try {
        ContextCompat.startForegroundService(context, Intent(context, ProtectionService::class.java))
      } catch (e: Exception) {
        // Not allowed from the background on this Android version; retried when the app opens.
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ProtectionService::class.java))
    }
  }
}

/** Brings protection back after a reboot or an app update, without the user opening the app. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (SatarkStore.isProtecting(context) && !SatarkStore.isPaused(context)) ProtectionService.start(context)
  }
}
