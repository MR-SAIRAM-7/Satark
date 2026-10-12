package expo.modules.satarknative

import java.lang.ref.WeakReference

/**
 * Bridge from Android services to the JavaScript module. Services run whether
 * or not the app's UI exists, so they ask here first: if JavaScript is
 * listening the event is delivered live, otherwise the caller falls back to
 * the headless task or the pending queue.
 */
object SatarkEvents {
  const val NOTIFICATION = "onNotification"
  const val CALL = "onCall"
  const val OVERLAY_RESULT = "onOverlayResult"

  private var module: WeakReference<SatarkNativeModule>? = null

  /** True while JavaScript has at least one listener attached. */
  @Volatile
  var observing: Boolean = false

  fun attach(instance: SatarkNativeModule) {
    module = WeakReference(instance)
  }

  fun detach(instance: SatarkNativeModule) {
    if (module?.get() === instance) {
      module = null
      observing = false
    }
  }

  /** Returns true if the event reached JavaScript. */
  fun emit(name: String, payload: Map<String, Any?>): Boolean {
    val target = module?.get() ?: return false
    if (!observing) return false
    return try {
      target.sendEvent(name, payload)
      true
    } catch (e: Exception) {
      false
    }
  }
}
