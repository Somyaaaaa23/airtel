// OTP server for real sign-in codes. No dependencies (Node 20+).
// Providers:
//   textbee (free): your Android phone sends the SMS through the textbee app. This server makes and checks the codes.
//   twilio (paid):  Twilio Verify makes, sends and checks the codes.
// Settings go in .env (copy server/.env.example). Run: npm run otp   then in another terminal: npm run dev
// Secrets stay on this server; the browser only ever talks to http://localhost:8787.
import { createServer } from "node:http";
import { createCodeStore } from "./otp-codes.mjs";

const env = process.env;
const PROVIDER = (env.OTP_PROVIDER || (env.TEXTBEE_API_KEY ? "textbee" : "twilio")).toLowerCase();
const PORT = env.PORT || 8787;
const origins = (env.ALLOW_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim()).filter(Boolean);
const validPhone = (p) => /^\+91[6-9]\d{9}$/.test(p);
const mask = (p) => `${p.slice(0, 5)}••••${p.slice(-2)}`;

function textbeeProvider() {
  const { TEXTBEE_API_KEY: KEY, TEXTBEE_DEVICE_ID: DEVICE, TEXTBEE_BASE_URL: BASE = "https://api.textbee.dev" } = env;
  if (!KEY) throw new Error("Set TEXTBEE_API_KEY (textbee dashboard → API key). TEXTBEE_DEVICE_ID is optional.");
  const store = createCodeStore();
  return {
    label: `textbee${DEVICE ? " (device set)" : " (default device)"}`,
    async send(phone) {
      const issued = store.issue(phone);
      if (!issued.ok) return { ok: false, error: "wait", retryInMs: issued.retryInMs };
      const res = await fetch(`${BASE}/api/v1/gateway/send-sms`, {
        method: "POST",
        headers: { "x-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [phone],
          message: `${issued.code} is your Udyam Digital sign-in code. It expires in 5 minutes. Don't share it with anyone.`,
          ...(DEVICE ? { deviceId: DEVICE } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      const ok = res.ok && body?.data?.success !== false && body?.data?.failureCount !== 1;
      if (!ok) { store.forget(phone); return { ok: false, error: body?.message || body?.error || `textbee HTTP ${res.status}` }; }
      return { ok: true };
    },
    async verify(phone, code) { return store.check(phone, String(code)); },
  };
}

function twilioProvider() {
  const { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN, TWILIO_API_KEY: KEY, TWILIO_API_SECRET: SECRET, TWILIO_VERIFY_SID: VERIFY } = env;
  const user = KEY && SECRET ? KEY : SID;
  const pass = KEY && SECRET ? SECRET : TOKEN;
  if (!user || !pass || !VERIFY) throw new Error("Set TWILIO_VERIFY_SID and either TWILIO_API_KEY + TWILIO_API_SECRET or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.");
  const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  const call = (path, form) => fetch(`https://verify.twilio.com/v2/Services/${VERIFY}/${path}`, {
    method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form),
  }).then((r) => r.json());
  return {
    label: `twilio (${KEY && SECRET ? "API key" : "Account SID + Auth Token"})`,
    async send(phone) {
      const r = await call("Verifications", { To: phone, Channel: "sms" });
      // Trial accounts: 21608 = the number isn't a Verified Caller ID yet.
      return r.status === "pending" ? { ok: true } : { ok: false, error: r.message, code: r.code };
    },
    async verify(phone, code) { return (await call("VerificationCheck", { To: phone, Code: String(code) })).status === "approved"; },
  };
}

let provider;
try { provider = PROVIDER === "textbee" ? textbeeProvider() : twilioProvider(); }
catch (e) { console.error(`Missing settings for ${PROVIDER}: ${e.message} See server/.env.example.`); process.exit(1); }

createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && origins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();
  const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method !== "POST") return send(404, { ok: false });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let phone, code;
  try { ({ phone, code } = JSON.parse(raw || "{}")); } catch { return send(400, { ok: false, error: "bad json" }); }
  if (!validPhone(phone)) return send(400, { ok: false, error: "phone" });
  try {
    if (req.url === "/otp/send") {
      const r = await provider.send(phone);
      console.log(`send ${mask(phone)}: ${r.ok ? "sent" : `failed ${r.code ?? ""} ${r.error ?? ""}`}`);
      return send(200, r);
    }
    if (req.url === "/otp/verify") {
      const ok = await provider.verify(phone, code);
      console.log(`verify ${mask(phone)}: ${ok ? "approved" : "rejected"}`);
      return send(200, { ok });
    }
    send(404, { ok: false });
  } catch (e) {
    console.error("Provider request failed:", e);
    send(502, { ok: false, error: String(e) });
  }
}).listen(PORT, () => console.log(`OTP server on http://localhost:${PORT} using ${provider.label}; allowing ${origins.join(", ")}`));
