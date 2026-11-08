import { useState } from "react";
import type { Order } from "../engine/orders";
import { computeQuote } from "../engine/quote";
import { inr, t, type Lang } from "../i18n/strings";
import type { QuoteResult } from "./Quote";

export type Paid = NonNullable<Order["payment"]>;
const UPI_RE = /^[\w.-]{2,}@[a-z]{2,}$/i;

/** First payment (setup + first month), mocked, with retry on failure (28 leads dropped after a failed first payment). */
export function Payment({ lang, quote, onPaid, onFailed }: { lang: Lang; quote: QuoteResult; onPaid: (p: Paid) => void; onFailed: () => void }) {
  const q = computeQuote(quote.items);
  const amount = q.setup + q.monthly;
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [upi, setUpi] = useState("");
  const [failNext, setFailNext] = useState(false);
  const [state, setState] = useState<"idle" | "paying" | "failed">("idle");
  const [attempts, setAttempts] = useState(0);
  const [err, setErr] = useState("");

  const pay = async () => {
    if (method === "upi" && !UPI_RE.test(upi)) return setErr(t(lang, "payUpiError"));
    setErr(""); setState("paying");
    const n = attempts + 1;
    setAttempts(n);
    await new Promise((r) => setTimeout(r, 1200));
    if (failNext) { setFailNext(false); setState("failed"); onFailed(); return; }
    onPaid({ ref: `PAY${Date.now().toString(36).toUpperCase().slice(-8)}`, method, amount, attempts: n });
  };

  return (
    <>
      <main className="scroll" lang={lang}>
        <section className="bill">
          <div className="recline"><span>{t(lang, "payLineSetup")}</span><span className="num">{inr(q.setup)}</span></div>
          <div className="recline"><span>{t(lang, "payLineMonth")}</span><span className="num">{inr(q.monthly)}</span></div>
          <div className="total"><span>{t(lang, "payTotal")}</span><b className="num">{inr(amount)}</b></div>
        </section>
        <div className="tabs" role="tablist">
          {(["upi", "card"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={method === m} onClick={() => setMethod(m)} disabled={state === "paying"}>{t(lang, m === "upi" ? "payUpi" : "payCard")}</button>
          ))}
        </div>
        {method === "upi" ? (
          <label className="field">
            <span className="pan-label">{t(lang, "payUpiLabel")}</span>
            <input className="input" value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder="name@bank" autoComplete="off" inputMode="email" />
            <span className="help">{t(lang, "payUpiHelp")}</span>
          </label>
        ) : <p className="fine">{t(lang, "payCardNote")}</p>}
        {err && <p className="err" role="alert">{err}</p>}
        {state === "failed" && <div className="notice blocked" role="alert">{t(lang, "payFailed", { other: t(lang, method === "upi" ? "payCard" : "payUpi") })}</div>}
        <label className="agree demo-toggle">
          <input type="checkbox" className="check" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />
          <span>{t(lang, "paySimFail")}</span>
        </label>
      </main>
      <footer className="footer" lang={lang}>
        <button className="primary" disabled={state === "paying"} onClick={() => void pay()}>
          {state === "paying" ? t(lang, "paying") : state === "failed" ? `${t(lang, "payRetry")} · ${inr(amount)}` : t(lang, "payNow", { amount: inr(amount) })}
        </button>
      </footer>
    </>
  );
}
