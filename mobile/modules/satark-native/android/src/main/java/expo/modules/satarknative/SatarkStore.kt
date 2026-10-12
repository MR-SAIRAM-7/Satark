package expo.modules.satarknative

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/**
 * Native-side state, kept in SharedPreferences so the services can work before
 * (or without) the JavaScript runtime: the reported-number cache for pre-ring
 * blocking, the pause switch, and messages captured while JS was not running.
 */
object SatarkStore {
  private const val PREFS = "satark_native"
  private const val KEY_HASHES = "reported_hashes"
  private const val KEY_PAUSED = "paused"
  private const val KEY_PROTECTING = "protecting"
  private const val KEY_PENDING = "pending_notifications"
  private const val KEY_SERVICE_TITLE = "service_title"
  private const val KEY_SERVICE_TEXT = "service_text"
  private const val MAX_PENDING = 30

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // --- Reported numbers -----------------------------------------------------

  fun setReportedHashes(context: Context, hashes: List<String>) {
    prefs(context).edit().putStringSet(KEY_HASHES, hashes.toSet()).apply()
  }

  fun isReported(context: Context, number: String): Boolean {
    val hashes = prefs(context).getStringSet(KEY_HASHES, emptySet()) ?: return false
    return hashes.contains(hashPhone(number))
  }

  /**
   * Must match `normalizeIndianMobile` / `hashIndicator` in the TypeScript code:
   * Indian mobiles become +91XXXXXXXXXX, then SHA-256("satark:phone:<number>").
   */
  fun normalize(number: String): String {
    var digits = number.filter { it.isDigit() }
    if (digits.length == 12 && digits.startsWith("91")) digits = digits.substring(2)
    if (digits.length == 11 && digits.startsWith("0")) digits = digits.substring(1)
    return if (digits.length == 10 && digits[0] in '6'..'9') "+91$digits" else "+$digits"
  }

  fun hashPhone(number: String): String {
    val input = "satark:phone:${normalize(number).lowercase()}"
    val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
    return bytes.joinToString("") { "%02x".format(it) }
  }

  // --- Switches -------------------------------------------------------------

  fun isPaused(context: Context): Boolean = prefs(context).getBoolean(KEY_PAUSED, false)

  fun setPaused(context: Context, paused: Boolean) {
    prefs(context).edit().putBoolean(KEY_PAUSED, paused).apply()
  }

  /** Whether the user has protection switched on, so it can be restored after a reboot. */
  fun isProtecting(context: Context): Boolean = prefs(context).getBoolean(KEY_PROTECTING, false)

  fun setProtecting(context: Context, protecting: Boolean) {
    prefs(context).edit().putBoolean(KEY_PROTECTING, protecting).apply()
  }

  fun saveServiceText(context: Context, title: String, text: String) {
    prefs(context).edit().putString(KEY_SERVICE_TITLE, title).putString(KEY_SERVICE_TEXT, text).apply()
  }

  fun serviceTitle(context: Context): String =
    prefs(context).getString(KEY_SERVICE_TITLE, null) ?: "Satark is protecting you"

  fun serviceText(context: Context): String =
    prefs(context).getString(KEY_SERVICE_TEXT, null) ?: "Watching messages and calls for scams"

  // --- Messages captured while JavaScript was not running --------------------

  @Synchronized
  fun addPending(context: Context, app: String, sender: String, text: String, postedAt: Long) {
    val queue = readPending(context)
    queue.put(
      JSONObject().put("app", app).put("sender", sender).put("text", text).put("postedAt", postedAt)
    )
    val trimmed = JSONArray()
    val start = maxOf(0, queue.length() - MAX_PENDING)
    for (i in start until queue.length()) trimmed.put(queue.get(i))
    prefs(context).edit().putString(KEY_PENDING, trimmed.toString()).apply()
  }

  @Synchronized
  fun drainPending(context: Context): List<Map<String, Any>> {
    val queue = readPending(context)
    prefs(context).edit().remove(KEY_PENDING).apply()
    val out = ArrayList<Map<String, Any>>(queue.length())
    for (i in 0 until queue.length()) {
      val item = queue.optJSONObject(i) ?: continue
      out.add(
        mapOf(
          "app" to item.optString("app"),
          "sender" to item.optString("sender"),
          "text" to item.optString("text"),
          "postedAt" to item.optLong("postedAt").toDouble()
        )
      )
    }
    return out
  }

  private fun readPending(context: Context): JSONArray =
    try {
      JSONArray(prefs(context).getString(KEY_PENDING, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }
}
