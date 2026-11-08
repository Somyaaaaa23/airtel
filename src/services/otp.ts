/**
 * OTP for sign-in and for e-signing the contract.
 * Mock by default (any 6 digits). To use Twilio Verify, run server/otp-twilio.mjs with your Twilio keys and start the app
 * with VITE_OTP_API=http://localhost:8787. Twilio secrets stay on that server; they must never ship in the browser bundle.
 */
const API = import.meta.env.VITE_OTP_API as string | undefined;
export const OTP_IS_MOCK = !API;

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? ((await res.json()) as { ok: boolean; error?: string }) : { ok: false, error: `HTTP ${res.status}` };
}

/** Sends a code to +91 phone. */
export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (OTP_IS_MOCK) return { ok: true };
  try { return await post("/otp/send", { phone: `+91${phone}` }); } catch { return { ok: false, error: "network" }; }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  if (OTP_IS_MOCK) return true;
  try { return (await post("/otp/verify", { phone: `+91${phone}`, code })).ok; } catch { return false; }
}
