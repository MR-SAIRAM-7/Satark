package expo.modules.satarknative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import androidx.core.app.NotificationCompat

/**
 * F9 - call guard before ring. Android gives a screening service only a few
 * seconds to answer, possibly before the JavaScript runtime exists, so this is
 * pure Kotlin and reads only the local cache of community-reported numbers
 * (kept in sync from JS through `syncReportedHashes`). No network, no model.
 */
class SatarkScreeningService : CallScreeningService() {

  override fun onScreenCall(details: Call.Details) {
    val incoming = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
      details.callDirection == Call.Details.DIRECTION_INCOMING
    val number = details.handle?.schemeSpecificPart

    val reported = incoming &&
      !number.isNullOrBlank() &&
      !SatarkStore.isPaused(this) &&
      SatarkStore.isReported(this, number)

    respondToCall(
      details,
      CallResponse.Builder()
        .setDisallowCall(reported)
        .setRejectCall(reported)
        .setSkipCallLog(false)
        .setSkipNotification(false)
        .build()
    )

    if (reported && number != null) {
      notifyBlocked(number)
      SatarkEvents.emit(
        SatarkEvents.CALL,
        mapOf("number" to number, "state" to "blocked", "at" to System.currentTimeMillis().toDouble())
      )
    }
  }

  /** Tell the elder a call was stopped. Only a masked number is ever shown. */
  private fun notifyBlocked(number: String) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Blocked scam calls", NotificationManager.IMPORTANCE_HIGH)
      )
    }
    val digits = number.filter { it.isDigit() }
    val masked = if (digits.length >= 6) "${digits.take(4)}XXXX${digits.takeLast(2)}" else number
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Scam call blocked")
      .setContentText("$masked was stopped before your phone rang.")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .build()
    try {
      manager.notify(number.hashCode(), notification)
    } catch (e: SecurityException) {
      // Notification permission not granted: the call is still blocked.
    }
  }

  companion object {
    private const val CHANNEL_ID = "satark-blocked-calls"
  }
}
