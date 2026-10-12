package expo.modules.satarknative

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * F1 - message scanner. Reads the sender and text of incoming SMS and WhatsApp
 * notifications. Android keeps this service bound for as long as the user
 * leaves notification access on, including across reboots, which is what makes
 * protection continuous.
 *
 * Nothing is analysed here: the text is handed to the shared TypeScript
 * pipeline, so the phone and the server always apply exactly the same rules.
 */
class SatarkNotificationListener : NotificationListenerService() {

  /** Recently seen messages, so an updated notification is not analysed twice. */
  private val seen = LinkedHashSet<String>()

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn ?: return
    val app = notification.packageName ?: return
    if (app == packageName || app !in WATCHED_APPS) return
    if (SatarkStore.isPaused(this)) return

    val flags = notification.notification.flags
    if (flags and Notification.FLAG_GROUP_SUMMARY != 0 || flags and Notification.FLAG_ONGOING_EVENT != 0) return

    val extras = notification.notification.extras ?: return
    val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()
    if (text.length < MIN_LENGTH) return

    val fingerprint = "$app|$sender|$text"
    synchronized(seen) {
      if (!seen.add(fingerprint)) return
      if (seen.size > MAX_SEEN) seen.remove(seen.first())
    }

    val postedAt = notification.postTime
    val payload = mapOf("app" to app, "sender" to sender, "text" to text, "postedAt" to postedAt.toDouble())

    // 1. The app is open: deliver straight to the running pipeline.
    if (SatarkEvents.emit(SatarkEvents.NOTIFICATION, payload)) return

    // 2. The app is closed: run the pipeline headlessly.
    // 3. If Android refuses to start it, keep the message until the app next opens.
    if (!startHeadlessTask(app, sender, text, postedAt)) {
      SatarkStore.addPending(this, app, sender, text, postedAt)
    }
  }

  private fun startHeadlessTask(app: String, sender: String, text: String, postedAt: Long): Boolean =
    try {
      val intent = Intent(this, NotificationTaskService::class.java)
        .putExtra("app", app)
        .putExtra("sender", sender)
        .putExtra("text", text)
        .putExtra("postedAt", postedAt.toDouble())
      startService(intent)
      true
    } catch (e: Exception) {
      false
    }

  companion object {
    private const val MIN_LENGTH = 8
    private const val MAX_SEEN = 60

    /** Messaging apps Satark reads. Every other app's notifications are ignored here, in native code. */
    val WATCHED_APPS = setOf(
      "com.whatsapp",
      "com.whatsapp.w4b",
      "com.google.android.apps.messaging",
      "com.samsung.android.messaging",
      "com.android.mms",
      "com.miui.mms",
      "com.oneplus.mms",
      "com.coloros.mms",
      "com.vivo.mms",
      "com.truecaller"
    )
  }
}
