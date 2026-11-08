// Minimal OTP server for Twilio Verify. No dependencies (Node 18+).
// Run:  TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_VERIFY_SID=VA... node server/otp-twilio.mjs
// Then: VITE_OTP_API=http://localhost:8787 npm run dev
import { createServer } from "node:http";

const { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN, TWILIO_VERIFY_SID: VERIFY, PORT = 8787, ALLOW_ORIGIN = "http://localhost:5173" } = process.env;
if (!SID || !TOKEN || !VERIFY) {
  console.error("Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SID.");
  process.exit(1);
}
const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
const twilio = (path, form) =>
  fetch(`https://verify.twilio.com/v2/Services/${VERIFY}/${path}`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  }).then((r) => r.json());
const validPhone = (p) => /^\+91[6-9]\d{9}$/.test(p);

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method !== "POST") return send(404, { ok: false });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const { phone, code } = JSON.parse(raw || "{}");
  if (!validPhone(phone)) return send(400, { ok: false, error: "phone" });
  try {
    if (req.url === "/otp/send") {
      const r = await twilio("Verifications", { To: phone, Channel: "sms" });
      return send(200, { ok: r.status === "pending", error: r.message });
    }
    if (req.url === "/otp/verify") {
      const r = await twilio("VerificationCheck", { To: phone, Code: String(code) });
      return send(200, { ok: r.status === "approved" });
    }
    send(404, { ok: false });
  } catch (e) {
    send(502, { ok: false, error: String(e) });
  }
}).listen(PORT, () => console.log(`OTP server on http://localhost:${PORT}`));
