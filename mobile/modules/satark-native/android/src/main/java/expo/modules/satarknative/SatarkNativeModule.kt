package expo.modules.satarknative

import android.Manifest
import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JavaScript-facing API of Satark's Android layer. The TypeScript wrapper is
 * mobile/src/services/native.ts; keep the two in step.
 */
class SatarkNativeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var pendingRole: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("SatarkNative")

    Events(SatarkEvents.NOTIFICATION, SatarkEvents.CALL, SatarkEvents.OVERLAY_RESULT)

    OnCreate { SatarkEvents.attach(this@SatarkNativeModule) }
    OnDestroy { SatarkEvents.detach(this@SatarkNativeModule) }
    OnStartObserving { SatarkEvents.observing = true }
    OnStopObserving { SatarkEvents.observing = false }

    Function("getStatus") {
      val ctx = context
      mapOf(
        "notificationAccess" to NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.packageName),
        "callScreening" to holdsScreeningRole(ctx),
        "overlay" to Settings.canDrawOverlays(ctx),
        "batteryUnrestricted" to
          (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(ctx.packageName),
        "serviceRunning" to ProtectionService.running
      )
    }

    Function("openNotificationAccessSettings") {
      launch(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    Function("openOverlaySettings") {
      launch(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")))
    }

    Function("requestIgnoreBatteryOptimizations") {
      launch(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")))
    }

    // Asks to become the call-screening app, then for the phone permissions needed to end a call.
    AsyncFunction("requestCallScreeningRole") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val roles = activity.getSystemService(Context.ROLE_SERVICE) as RoleManager
      if (roles.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
        requestPhonePermissions(activity)
        promise.resolve(true)
        return@AsyncFunction
      }
      pendingRole?.resolve(false)
      pendingRole = promise
      activity.startActivityForResult(roles.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), REQUEST_ROLE)
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode == REQUEST_ROLE) {
        pendingRole?.resolve(payload.resultCode == Activity.RESULT_OK)
        pendingRole = null
        requestPhonePermissions(activity)
      }
    }

    Function("startProtectionService") { title: String, text: String ->
      val ctx = context
      SatarkStore.saveServiceText(ctx, title, text)
      SatarkStore.setProtecting(ctx, true)
      ProtectionService.start(ctx)
    }

    Function("stopProtectionService") {
      val ctx = context
      SatarkStore.setProtecting(ctx, false)
      ProtectionService.stop(ctx)
    }

    Function("setProtectionPaused") { paused: Boolean ->
      SatarkStore.setPaused(context, paused)
    }

    Function("syncReportedHashes") { hashes: List<String> ->
      SatarkStore.setReportedHashes(context, hashes)
    }

    Function("drainPendingNotifications") {
      SatarkStore.drainPending(context)
    }

    AsyncFunction("endCall") {
      CallOverlay.endCall(context)
    }

    Function("showCallOverlay") { title: String, body: String, safeLabel: String, seconds: Int ->
      CallOverlay.show(context, title, body, safeLabel, seconds)
    }

    Function("hideCallOverlay") {
      CallOverlay.hide(context)
    }
  }

  private fun holdsScreeningRole(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
    return (ctx.getSystemService(Context.ROLE_SERVICE) as RoleManager).isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
  }

  private fun requestPhonePermissions(activity: Activity) {
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.READ_PHONE_STATE, Manifest.permission.ANSWER_PHONE_CALLS),
      REQUEST_PHONE
    )
  }

  /** Open a system settings screen; these have no result we can read, so status is re-checked on return. */
  private fun launch(intent: Intent) {
    try {
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(intent)
      else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
      // Some manufacturers remove these screens; the caller re-reads status and stays "not granted".
    }
  }

  companion object {
    private const val REQUEST_ROLE = 19301
    private const val REQUEST_PHONE = 19302
  }
}
