// One-time codes for SMS providers that only send messages (textbee). Codes are random, stored only as a salted
// hash, expire, allow a few attempts, and can't be re-sent too quickly. In memory: restarting the server clears them.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function createCodeStore({ ttlMs = 5 * 60_000, maxAttempts = 5, resendMs = 30_000, now = () => Date.now() } = {}) {
  const codes = new Map();
  const hash = (salt, code) => createHash("sha256").update(salt + code).digest();

  /** New code for this phone, or how long to wait if one was sent moments ago. */
  function issue(phone) {
    const t = now();
    const prev = codes.get(phone);
    if (prev && t - prev.sentAt < resendMs) return { ok: false, retryInMs: resendMs - (t - prev.sentAt) };
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const salt = randomBytes(16).toString("hex");
    codes.set(phone, { salt, hash: hash(salt, code), expiresAt: t + ttlMs, attempts: 0, sentAt: t });
    return { ok: true, code };
  }

  /** True once for the right code within its time and attempt limits; the code is then used up. */
  function check(phone, code) {
    const e = codes.get(phone);
    if (!e || !/^\d{6}$/.test(String(code))) return false;
    if (now() > e.expiresAt || e.attempts >= maxAttempts) { codes.delete(phone); return false; }
    e.attempts++;
    const ok = timingSafeEqual(e.hash, hash(e.salt, String(code)));
    if (ok) codes.delete(phone);
    return ok;
  }

  /** Forget a code (for example when sending failed), so the owner can try again straight away. */
  const forget = (phone) => codes.delete(phone);
  return { issue, check, forget };
}
