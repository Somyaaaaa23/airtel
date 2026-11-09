/**
 * OTP for sign-in and for e-signing the contract.
 * Mock by default (any 6 digits). For real SMS codes run server/otp-server.mjs (`npm run otp`, textbee free or Twilio)
 * and start the app with VITE_OTP_API=http://localhost:8787. Provider keys stay on that server, never in the browser bundle.
 */
const API = import.meta.env.VITE_OTP_API as string | undefined;
export const OTP_IS_MOCK = !API;

type Reply = { ok: boolean; error?: string; code?: number; retryInMs?: number };
async function post(path: string, body: unknown): Promise<Reply> {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? ((await res.json()) as Reply) : { ok: false, error: `HTTP ${res.status}` };
}

/** Why a code couldn't be sent, in terms the sign-in screen can explain. */
export type SendFailure = "unverified" | "wait" | "network" | "other";
/** Twilio error 21608: on a trial account the number must first be added as a Verified Caller ID. */
export const sendFailure = (r: Reply): SendFailure =>
  r.code === 21608 ? "unverified" : r.error === "wait" ? "wait" : r.error === "network" ? "network" : "other";

/** Sends a code to +91 phone. */
export async function sendOtp(phone: string): Promise<{ ok: boolean; failure?: SendFailure }> {
  if (OTP_IS_MOCK) return { ok: true };
  try {
    const r = await post("/otp/send", { phone: `+91${phone}` });
    return r.ok ? { ok: true } : { ok: false, failure: sendFailure(r) };
  } catch {
    return { ok: false, failure: "network" };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  if (OTP_IS_MOCK) return true;
  try { return (await post("/otp/verify", { phone: `+91${phone}`, code })).ok; } catch { return false; }
}
