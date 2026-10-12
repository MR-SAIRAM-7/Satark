package expo.modules.satarknative

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JavaScript task registered as "SatarkNotificationTask" (see
 * mobile/src/background.ts) with no UI, so a scam message is analysed and the
 * elder is warned even when the app has been swiped away.
 */
class NotificationTaskService : HeadlessJsTaskService() {

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      TASK_NAME,
      Arguments.fromBundle(extras),
      TIMEOUT_MS,
      true // also allowed while the app is in the foreground
    )
  }

  companion object {
    const val TASK_NAME = "SatarkNotificationTask"
    private const val TIMEOUT_MS = 30_000L
  }
}
