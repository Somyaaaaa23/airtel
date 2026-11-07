import { useState } from "react";
import { t, type Lang } from "../i18n/strings";

export function Welcome({ lang, setLang, onDone }: { lang: Lang; setLang: (l: Lang) => void; onDone: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");

  const sendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr(t(lang, "phoneError"));
    setErr(""); setOtpSent(true);
  };
  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setErr(t(lang, "otpError"));
    onDone(phone);
  };

  return (
    <main className="welcome" lang={lang}>
      <div className="mark"><i aria-hidden="true">A</i>{t(lang, "appName")}</div>
      <h2 className="hero">{t(lang, "tagline")}</h2>
      <div className="field">
        <span id="lang-l" style={{ fontWeight: 600, fontSize: 15 }}>{t(lang, "chooseLang")}</span>
        <div className="langpick" role="group" aria-labelledby="lang-l">
          <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
          <button aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हिन्दी</button>
        </div>
        <span className="help">{t(lang, "regionalSoon")}</span>
      </div>
      {!otpSent ? (
        <form className="field" onSubmit={sendOtp} noValidate>
          <label htmlFor="phone">{t(lang, "phoneLabel")}</label>
          <div className="prefix"><span>+91</span>
            <input id="phone" className="input num" inputMode="numeric" autoComplete="tel-national" maxLength={10}
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98XXXXXXXX" />
          </div>
          <span className="help">{t(lang, "phoneHelp")}</span>
          {err && <span className="err" role="alert">{err}</span>}
          <button className="primary" type="submit" style={{ marginTop: 8 }}>{t(lang, "sendOtp")}</button>
        </form>
      ) : (
        <form className="field" onSubmit={verify} noValidate>
          <label htmlFor="otp">{t(lang, "otpLabel")}</label>
          <input id="otp" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" style={{ letterSpacing: "0.4em" }} />
          <span className="help">+91 {phone} · {t(lang, "otpHint")}</span>
          {err && <span className="err" role="alert">{err}</span>}
          <button className="primary" type="submit" style={{ marginTop: 8 }}>{t(lang, "verify")}</button>
        </form>
      )}
    </main>
  );
}
