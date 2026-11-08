import { useState } from "react";
import { t, type Lang } from "../i18n/strings";
import { OTP_IS_MOCK, sendOtp, verifyOtp } from "../services/otp";

export function Welcome({ lang, setLang, onDone, onPrivacy, onSignedIn }: {
  lang: Lang; setLang: (l: Lang) => void; onDone: (phone: string, name: string) => void; onPrivacy: () => void;
  /** Keeps the app's phone and name current, so a demo started from the side panel still uses them. */
  onSignedIn: (phone: string, name: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr(t(lang, "phoneError"));
    setBusy(true);
    const r = await sendOtp(phone);
    setBusy(false);
    if (!r.ok) return setErr(t(lang, "otpSendError"));
    setErr(""); setStep("otp");
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setErr(t(lang, "otpError"));
    setBusy(true);
    const ok = await verifyOtp(phone, otp);
    setBusy(false);
    if (!ok) return setErr(t(lang, "ctOtpError"));
    setErr(""); setStep("name");
    onSignedIn(phone, "");
  };
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().split(/\s+/).join(" ").length < 3) return setErr(t(lang, "nameError"));
    onDone(phone, name.trim().replace(/\s+/g, " "));
  };

  return (
    <main className="welcome" lang={lang}>
      <div className="mark"><i aria-hidden="true">A</i>{t(lang, "appName")}</div>
      <h2 className="hero">{t(lang, "heroA")}<em>{t(lang, "heroB")}</em></h2>
      <p className="sub">{t(lang, "tagline")}</p>
      <div className="field">
        <span id="lang-l" style={{ fontWeight: 600, fontSize: 15 }}>{t(lang, "chooseLang")}</span>
        <div className="langpick" role="group" aria-labelledby="lang-l">
          <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
          <button aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हिन्दी</button>
        </div>
        <span className="help">{t(lang, "regionalSoon")}</span>
      </div>
      {step === "phone" && (
        <form className="field" onSubmit={send} noValidate>
          <label htmlFor="phone">{t(lang, "phoneLabel")}</label>
          <div className="prefix"><span>+91</span>
            <input id="phone" className="input num" inputMode="numeric" autoComplete="tel-national" maxLength={10}
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98XXXXXXXX" />
          </div>
          <span className="help">{t(lang, "phoneHelp")}</span>
          {err && <span className="err" role="alert">{err}</span>}
          <button className="primary" type="submit" disabled={busy} style={{ marginTop: 8 }}>{t(lang, "sendOtp")}</button>
        </form>
      )}
      {step === "otp" && (
        <form className="field" onSubmit={verify} noValidate>
          <label htmlFor="otp">{t(lang, "otpLabel")}</label>
          <input id="otp" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" style={{ letterSpacing: "0.4em" }} />
          <span className="help">+91 {phone}{OTP_IS_MOCK ? ` · ${t(lang, "otpHint")}` : ""}</span>
          {err && <span className="err" role="alert">{err}</span>}
          <button className="primary" type="submit" disabled={busy} style={{ marginTop: 8 }}>{t(lang, "verify")}</button>
        </form>
      )}
      {step === "name" && (
        <form className="field" onSubmit={go} noValidate>
          <label htmlFor="name">{t(lang, "nameLabel")}</label>
          <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); onSignedIn(phone, e.target.value.trim().replace(/\s+/g, " ")); }} />
          <span className="help">{t(lang, "nameHelp")}</span>
          {err && <span className="err" role="alert">{err}</span>}
          <button className="primary" type="submit" style={{ marginTop: 8 }}>{t(lang, "continueBtn")}</button>
        </form>
      )}
      <button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
    </main>
  );
}
