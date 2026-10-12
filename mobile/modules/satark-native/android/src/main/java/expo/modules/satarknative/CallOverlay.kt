package expo.modules.satarknative

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.telecom.TelecomManager
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat

/**
 * F10 - the countdown shown on top of the phone app during a scam call.
 *
 * No call is ever cut silently: the elder sees a full-screen red warning with
 * a visible countdown, and one tap on "It's safe" cancels it. A wrongly cut
 * call can be returned; life savings cannot.
 */
object CallOverlay {
  private val handler = Handler(Looper.getMainLooper())
  private var view: View? = null
  private var tick: Runnable? = null

  fun show(context: Context, title: String, body: String, safeLabel: String, seconds: Int) {
    handler.post {
      hideNow(context)
      if (!Settings.canDrawOverlays(context)) return@post

      val appContext = context.applicationContext
      val density = appContext.resources.displayMetrics.density
      fun dp(value: Int) = (value * density).toInt()

      val root = LinearLayout(appContext).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#C81E1E"))
        setPadding(dp(28), dp(48), dp(28), dp(48))
      }

      fun label(text: String, sizeSp: Float, bold: Boolean) = TextView(appContext).apply {
        this.text = text
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        gravity = Gravity.CENTER
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(8), 0, dp(8))
      }

      val counter = label(seconds.toString(), 96f, true)
      val safeButton = Button(appContext).apply {
        text = safeLabel
        setAllCaps(false)
        setTextColor(Color.parseColor("#8C0F0F"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        setTypeface(typeface, Typeface.BOLD)
        background = GradientDrawable().apply {
          setColor(Color.WHITE)
          cornerRadius = dp(18).toFloat()
        }
        setPadding(dp(24), dp(20), dp(24), dp(20))
        setOnClickListener { finish(appContext, cut = false) }
      }

      root.addView(label(title, 40f, true))
      root.addView(label(body, 22f, false))
      root.addView(counter)
      root.addView(
        safeButton,
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
          .apply { topMargin = dp(24) }
      )

      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      }
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        type,
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        PixelFormat.OPAQUE
      )

      try {
        windowManager(appContext).addView(root, params)
        view = root
      } catch (e: Exception) {
        return@post
      }

      var remaining = seconds
      val runnable = object : Runnable {
        override fun run() {
          remaining -= 1
          if (remaining <= 0) {
            finish(appContext, cut = true)
          } else {
            counter.text = remaining.toString()
            handler.postDelayed(this, 1000)
          }
        }
      }
      tick = runnable
      handler.postDelayed(runnable, 1000)
    }
  }

  fun hide(context: Context) {
    handler.post { hideNow(context) }
  }

  /** The countdown ended or the elder tapped "It's safe". Reports the outcome to JavaScript. */
  private fun finish(context: Context, cut: Boolean) {
    hideNow(context)
    val ended = cut && endCall(context)
    SatarkEvents.emit(SatarkEvents.OVERLAY_RESULT, mapOf("cut" to cut, "ended" to ended))
  }

  private fun hideNow(context: Context) {
    tick?.let { handler.removeCallbacks(it) }
    tick = null
    view?.let {
      try {
        windowManager(context.applicationContext).removeView(it)
      } catch (e: Exception) {
        // Already removed.
      }
    }
    view = null
  }

  private fun windowManager(context: Context) =
    context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  /**
   * End the current call. `TelecomManager.endCall()` has been deprecated since
   * Android 10 but still works on many phones; when it does not, the app falls
   * back to telling the elder to press the red button. The guaranteed path is
   * becoming the default phone app (InCallService), which is on the roadmap.
   */
  @SuppressLint("MissingPermission")
  @Suppress("DEPRECATION")
  fun endCall(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
    val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ANSWER_PHONE_CALLS) ==
      PackageManager.PERMISSION_GRANTED
    if (!granted) return false
    return try {
      (context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager).endCall()
    } catch (e: Exception) {
      false
    }
  }
}
