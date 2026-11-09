import { useState } from "react";
import type { Order } from "../engine/orders";
import { computeQuote } from "../engine/quote";
import { smartPrice } from "../engine/pricing";
import { fmtDate, inr, t, type Lang } from "../i18n/strings";
import { sendOtp, verifyOtp } from "../services/otp";
import type { QuoteResult } from "./Quote";

export type Signed = NonNullable<Order["contract"]>;

/** Key terms in plain words, signed by OTP or Aadhaar e-sign so the signatory needn't meet anyone (53 leads dropped for that). */
export function Contract({ lang, quote, phone, signatory, business, today, onSigned }: {
  lang: Lang; quote: QuoteResult; phone: string; signatory: string; business: string; today: string; onSigned: (s: Signed) => void;
}) {
  const q = computeQuote(quote.items);
  const sp = smartPrice(quote.items, quote.profile);
  const [agree, setAgree] = useState(false);
  const [method, setMethod] = useState<"otp" | "aadhaar" | null>(null);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [signed, setSigned] = useState<Signed | null>(null);
  const masked = `${phone.slice(0, 2)}••••••${phone.slice(-2)}`;

  const start = async (m: "otp" | "aadhaar") => {
    setMethod(m); setErr("");
    if (m === "aadhaar") return setSigned({ signedAt: today, method: "aadhaar", signatory });
    const r = await sendOtp(phone);
    if (!r.ok) setErr(t(lang, "otpSendError"));
  };
  const sign = async () => {
    if (!(await verifyOtp(phone, otp))) return setErr(t(lang, "ctOtpError"));
    setSigned({ signedAt: today, method: "otp", signatory });
  };

  return (
    <>
      <main className="scroll" lang={lang}>
        <p className="lead">{t(lang, "ctIntro")}</p>
        <section className="bill">
          <h2>{t(lang, "ctPlan")}</h2>
          {q.lines.map((l) => (
            <div key={l.product.id} className="recline"><span className="n">{l.product.name}{l.qty > 1 ? ` × ${l.qty}` : ""}</span><span className="num">{inr(l.monthly)}</span></div>
          ))}
          <div className="total"><span>{t(lang, "sp_your")} <s className="num fine">{inr(sp.standard)}</s></span><b className="num">{inr(sp.monthly)}</b></div>
        </section>
        <section className="consent">
          <h3>{t(lang, "ctTerms")}</h3>
          <ol className="terms">
            <li>{t(lang, "ct_t1", { n: q.contractMonths })}</li>
            <li>{sp.setupPayable ? t(lang, "ct_t2", { setup: inr(sp.setupPayable) }) : t(lang, "ct_t2_none")}</li>
            {sp.launch && <li>{t(lang, "of_launch", { amount: inr(sp.launch.monthly), n: sp.launch.months })}</li>}
            {sp.firstMonth < sp.monthly && !sp.launch && <li>{t(lang, "of_first", { amount: inr(sp.firstMonth) })}</li>}
            <li>{t(lang, "ct_t3")}</li>
            <li>{t(lang, "ct_t4")}</li>
            <li>{t(lang, "ct_t5")}</li>
          </ol>
          <p><b>{t(lang, "ctSignatory", { business, name: signatory })}</b></p>
          <label className="agree">
            <input type="checkbox" className="check" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={!!signed} />
            <span>{t(lang, "ctAgree")}</span>
          </label>
        </section>

        {signed ? (
          <div className="notice signed">{t(lang, "ctSigned", { name: signed.signatory, date: fmtDate(signed.signedAt, lang), method: signed.method === "otp" ? "OTP" : t(lang, "ctSignAadhaar") })}</div>
        ) : (
          <section className="consent">
            <div className="row2 equal">
              <button className="secondary" disabled={!agree} aria-pressed={method === "otp"} onClick={() => start("otp")}>{t(lang, "ctSignOtp")}</button>
              <button className="secondary" disabled={!agree} aria-pressed={method === "aadhaar"} onClick={() => start("aadhaar")}>{t(lang, "ctSignAadhaar")}</button>
            </div>
            {method === "aadhaar" && <p className="fine">{t(lang, "ctAadhaarNote")}</p>}
            {method === "otp" && (
              <form className="field" onSubmit={(e) => { e.preventDefault(); void sign(); }}>
                <span className="help">{t(lang, "ctOtpSent", { phone: masked })}</span>
                <label className="vh" htmlFor="sign-otp">{t(lang, "ctOtpLabel")}</label>
                <input id="sign-otp" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" style={{ letterSpacing: "0.4em" }} />
                <button className="primary" type="submit" disabled={otp.length !== 6}>{t(lang, "ctSign")}</button>
              </form>
            )}
            {err && <p className="err" role="alert">{err}</p>}
          </section>
        )}
      </main>
      <footer className="footer" lang={lang}>
        <button className="primary" disabled={!signed} onClick={() => signed && onSigned(signed)}>{t(lang, "toPayment")}</button>
      </footer>
    </>
  );
}
