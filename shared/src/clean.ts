/**
 * Layer 1 - Clean-up. Undoes the disguises scammers use to slip past filters,
 * before any rule, model or LLM sees the text. Pure and synchronous (< 1 ms).
 */

export interface CleanFlags {
  /** Invisible characters were hidden inside words, or Unicode "tag" text was present. */
  hiddenChars: boolean;
  /** Look-alike letters from other scripts were mapped back to Latin. */
  lookalikes: boolean;
  /** Letters spaced out to dodge keyword filters ("S B I") were joined. */
  spacedLetters: boolean;
  /** Leetspeak ("acc0unt", "0TP") was reversed. */
  leetspeak: boolean;
  /** Invisible Unicode tag text was present: a known way to smuggle AI instructions. */
  smuggledText: boolean;
}

export interface CleanResult {
  original: string;
  /** Normalised text, original casing. Used for quotes shown to the user. */
  text: string;
  /** Lower-cased `text`. Used for matching. */
  norm: string;
  flags: CleanFlags;
  /** True if any disguise was found: genuine senders never do this. */
  disguised: boolean;
}

// Zero-width spaces, bidi controls, soft hyphen, word joiners, BOM.
const INVISIBLE = '\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180E\\u200B\\u200E\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u206F\\uFEFF';
// ZWNJ/ZWJ and variation selectors are legitimate in Indic scripts and emoji,
// so they only count as a disguise when wedged between Latin letters or digits.
const JOINERS = '\\u200C\\u200D\\uFE00-\\uFE0F';
const INVISIBLE_RE = new RegExp(`[${INVISIBLE}]`, 'g');
const HIDDEN_IN_WORD_RE = new RegExp(`(?<=[A-Za-z0-9])[${INVISIBLE}${JOINERS}]+(?=[A-Za-z0-9])`, 'g');
// Unicode tag block: invisible ASCII look-alikes used to smuggle prompt injections.
const TAG_CHARS_RE = /\uDB40[\uDC00-\uDC7F]/g;

/** Cyrillic and Greek letters that render like Latin ones. */
const LOOKALIKES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's', һ: 'h',
  ԁ: 'd', ԛ: 'q', ԝ: 'w', к: 'k', м: 'm', т: 't', н: 'h', в: 'b', г: 'r', п: 'n',
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X',
  У: 'Y', Ѕ: 'S', І: 'I', Ј: 'J',
  α: 'a', ο: 'o', ν: 'v', ρ: 'p', ι: 'i', κ: 'k', τ: 't', υ: 'u',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P',
  Τ: 'T', Υ: 'Y', Χ: 'X',
  ı: 'i', ɑ: 'a', ɡ: 'g', ǀ: 'l', ӏ: 'l', Ӏ: 'I',
};
const LOOKALIKE_CLASS = `[${Object.keys(LOOKALIKES).join('')}]`;
const HAS_LOOKALIKE_RE = new RegExp(LOOKALIKE_CLASS);
const LOOKALIKE_RE = new RegExp(LOOKALIKE_CLASS, 'g');

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i',
};
const HAS_LEET_RE = /[013457@$!]/;

/**
 * Words scammers disguise. A spaced or leet token is only rewritten when it
 * decodes to one of these, so amounts, OTPs, IFSC codes, UTRs and people's
 * initials are never touched.
 */
const DISGUISE_TARGETS = new Set([
  'account', 'bank', 'blocked', 'block', 'kyc', 'otp', 'pin', 'password', 'verify',
  'verification', 'update', 'urgent', 'suspend', 'suspended', 'police', 'arrest', 'warrant',
  'aadhaar', 'aadhar', 'pan', 'customs', 'parcel', 'courier', 'lottery', 'prize', 'winner',
  'reward', 'rewards', 'refund', 'cashback', 'click', 'link', 'free', 'loan', 'credit',
  'debit', 'card', 'payment', 'pay', 'transfer', 'upi', 'sbi', 'hdfc', 'icici', 'axis',
  'paytm', 'electricity', 'disconnect', 'disconnected', 'install', 'download', 'apk',
  'investment', 'profit', 'returns', 'trading', 'crypto', 'bitcoin', 'cbi', 'court',
  'legal', 'notice', 'fine', 'challan', 'sim', 'expire', 'expired', 'limited', 'offer',
  'secret', 'confidential', 'immediately', 'today', 'support', 'customer', 'care', 'helpline',
  'netbanking', 'login', 'secure', 'security', 'alert', 'dear', 'money', 'laundering', 'rbi',
  'trai', 'fedex', 'yono', 'atm', 'cvv', 'anydesk', 'teamviewer',
]);

function reverseLeet(text: string): { text: string; changed: boolean } {
  let changed = false;
  const out = text.replace(/[A-Za-z013457@$!]{3,}/g, (token) => {
    if (!HAS_LEET_RE.test(token) || !/[A-Za-z]/.test(token)) return token;
    let decoded = '';
    for (const ch of token) decoded += LEET[ch] ?? ch;
    if (!DISGUISE_TARGETS.has(decoded.toLowerCase())) return token;
    changed = true;
    // Keep the writer's casing: "0TP" -> "OTP", "acc0unt" -> "account".
    const letters = token.replace(/[^A-Za-z]/g, '');
    return letters === letters.toUpperCase() ? decoded.toUpperCase() : decoded;
  });
  return { text: out, changed };
}

/** "S B I", "K.Y.C", "O-T-P" -> "SBI", "KYC", "OTP". Needs 3+ single letters. */
function joinSpacedLetters(text: string): { text: string; changed: boolean } {
  let changed = false;
  const out = text.replace(
    /(?<![A-Za-z])(?:[A-Za-z][ .\-_*|]){2,}[A-Za-z](?![A-Za-z])/g,
    (run) => {
      const joined = run.replace(/[ .\-_*|]/g, '');
      if (!DISGUISE_TARGETS.has(joined.toLowerCase())) return run;
      changed = true;
      return joined;
    },
  );
  return { text: out, changed };
}

export function clean(input: string): CleanResult {
  const original = input ?? '';
  let text = original.normalize('NFKC');

  const hadTagChars = TAG_CHARS_RE.test(text);
  TAG_CHARS_RE.lastIndex = 0;
  const hadHiddenInWord = HIDDEN_IN_WORD_RE.test(text);
  HIDDEN_IN_WORD_RE.lastIndex = 0;
  text = text.replace(TAG_CHARS_RE, '').replace(HIDDEN_IN_WORD_RE, '').replace(INVISIBLE_RE, '');

  let lookalikes = false;
  text = text.replace(/\S+/g, (word) => {
    if (!HAS_LOOKALIKE_RE.test(word)) return word;
    const mapped = word.replace(LOOKALIKE_RE, (ch) => LOOKALIKES[ch] ?? ch);
    // A disguise decodes to plain ASCII; a real Greek or Cyrillic word does not.
    if (/[^\x00-\x7F]/.test(mapped)) return word;
    lookalikes = true;
    return mapped;
  });

  const spaced = joinSpacedLetters(text);
  const leet = reverseLeet(spaced.text);
  text = leet.text.replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  const flags: CleanFlags = {
    hiddenChars: hadTagChars || hadHiddenInWord,
    lookalikes,
    spacedLetters: spaced.changed,
    leetspeak: leet.changed,
    smuggledText: hadTagChars,
  };

  return {
    original,
    text,
    norm: text.toLowerCase(),
    flags,
    disguised: flags.hiddenChars || lookalikes || spaced.changed || leet.changed,
  };
}
