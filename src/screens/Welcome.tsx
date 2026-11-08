/** Business-owner sign-in: mobile number, one-time code, name. Demo scenarios sit beside it, never in the way. */
import { useEffect, useState } from "react";
import { DemoPanel } from "../components/demos";
import { OtpInput } from "../components/OtpInput";
import { IconBack, IconSpark, LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";
import { OTP_IS_MOCK, sendOtp, verifyOtp } from "../services/otp";

const RESEND_AFTER = 30;

export function Welcome({ lang, setLang, onDone, onPrivacy, onSignedIn, onBack, onTryDemo, onOpenDemos }: {
  lang: Lang; setLang: (l: Lang) => void; onDone: (phone: string, name: string) => void; onPrivacy: () => void;
  /** Keeps the app's phone and name current, so a demo started from the side panel still uses them. */
  onSignedIn: (phone: string, name: string) => void;
  onBack: () => void; onTryDemo: (text: string) => void; onOpenDemos: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr(t(lang, "phoneError"));
    setBusy(true);
    const r = await sendOtp(phone);
    setBusy(false);
    if (!r.ok) return setErr(t(lang, "otpSendError"));
    setErr(""); setStep("otp"); setWait(RESEND_AFTER);
  };
  const resend = async () => {
    setOtp(""); setErr("");
    await send();
    setNote(t(lang, "au_resent"));
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setErr(t(lang, "otpError"));
    setBusy(true);
    const ok = await verifyOtp(phone, otp);
    setBusy(false);
    if (!ok) return setErr(t(lang, "ctOtpError"));
    setErr(""); setNote(""); setStep("name");
    onSignedIn(phone, "");
  };
  const finish = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().split(/\s+/).join(" ").length < 3) return setErr(t(lang, "nameError"));
    onDone(phone, name.trim().replace(/\s+/g, " "));
  };
  const toPhone = () => { setStep("phone"); setOtp(""); setErr(""); setNote(""); };
  const n = step === "phone" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="site" lang={lang}>
      <header className="topnav">
        <button className="iconbtn" onClick={step === "otp" ? toPhone : onBack} aria-label={t(lang, "back")}><IconBack /></button>
        <span className="spacer" />
        <LangToggle lang={lang} setLang={setLang} />
      </header>

      <main className="auth-layout">
        <div className="auth-main">
          <section className="auth-card" aria-labelledby="auth-t">
            <div className="auth-steps" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</div>
            <span className="auth-step">{t(lang, "au_step", { n })}</span>
            {OTP_IS_MOCK && step !== "name" && <p className="demo-banner" role="note">{t(lang, "au_demo")}</p>}

            {step === "phone" && (
              <>
                <h1 id="auth-t">{t(lang, "au_title")}</h1>
                <p className="lede">{t(lang, "au_sub")}</p>
                <form onSubmit={send} noValidate>
                  <div className="field">
                    <label htmlFor="phone">{t(lang, "phoneLabel")}</label>
                    <div className={`prefix ${err ? "invalid" : ""}`}><span aria-hidden="true">+91</span>
                      <input id="phone" className="input num" inputMode="numeric" autoComplete="tel-national" maxLength={10} autoFocus
                        aria-invalid={!!err} aria-describedby="phone-help"
                        value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="98XXXXXXXX" />
                    </div>
                    {err ? <span className="err" role="alert">{err}</span> : <span id="phone-help" className="help">{t(lang, "phoneHelp")}</span>}
                  </div>
                  <button className="primary" type="submit" disabled={busy}>{busy ? <><span className="spinner" />{t(lang, "au_sending")}</> : t(lang, "sendOtp")}</button>
                </form>
              </>
            )}

            {step === "otp" && (
              <>
                <h1 id="auth-t">{t(lang, "au_otp_title")}</h1>
                <p className="lede num">{t(lang, "au_otp_sent", { phone: `${phone.slice(0, 5)} ${phone.slice(5)}` })}</p>
                <form onSubmit={verify} noValidate>
                  <div className="field">
                    <OtpInput value={otp} onChange={(v) => { setOtp(v); setErr(""); }} invalid={!!err} autoFocus
                      label={t(lang, "otpLabel")} labelFor={(i) => t(lang, "au_digit", { n: i })} />
                    {err && <span className="err" role="alert">{err}</span>}
                    {note && !err && <span className="help" role="status">{note}</span>}
                  </div>
                  <button className="primary" type="submit" disabled={busy}>{busy ? <><span className="spinner" />{t(lang, "au_verifying")}</> : t(lang, "au_verify")}</button>
                </form>
                <div className="auth-row">
                  <button className="textbtn" onClick={toPhone}>{t(lang, "au_change")}</button>
                  {wait > 0 ? <span className="num">{t(lang, "au_resend_in", { s: wait })}</span>
                    : <button className="textbtn" onClick={resend} disabled={busy}>{t(lang, "au_resend")}</button>}
                </div>
              </>
            )}

            {step === "name" && (
              <>
                <h1 id="auth-t">{t(lang, "au_name_title")}</h1>
                <form onSubmit={finish} noValidate>
                  <div className="field">
                    <label htmlFor="name">{t(lang, "nameLabel")}</label>
                    <input id="name" className="input" autoComplete="name" autoFocus value={name} aria-invalid={!!err}
                      onChange={(e) => { setName(e.target.value); setErr(""); onSignedIn(phone, e.target.value.trim().replace(/\s+/g, " ")); }} />
                    {err ? <span className="err" role="alert">{err}</span> : <span className="help">{t(lang, "nameHelp")}</span>}
                  </div>
                  <button className="primary" type="submit">{t(lang, "continueBtn")}</button>
                </form>
              </>
            )}

            <div className="auth-foot"><button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button></div>
          </section>
          <button className="secondary demo-open" onClick={onOpenDemos}><IconSpark />{t(lang, "dm_title")}</button>
        </div>
        <DemoPanel lang={lang} onTry={onTryDemo} onViewAll={onOpenDemos} />
      </main>
    </div>
  );
}
