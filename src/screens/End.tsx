import { computeQuote } from "../engine/quote";
import { IconCheck } from "../components/ui";
import { inr, t, type Lang } from "../i18n/strings";
import type { QuoteResult } from "./Quote";

/** Call-back confirmation. Works from any step; shows the quoted price when there is one. */
export function Expert({ lang, phone, quote, onBack }: { lang: Lang; phone: string; quote?: QuoteResult; onBack: () => void }) {
  const q = quote ? computeQuote(quote.items) : null;
  return (
    <main className="endcard" lang={lang}>
      <div className="badge"><IconCheck /></div>
      <h2>{t(lang, "expertTitle")}</h2>
      <p>{q ? t(lang, "expertBody") : t(lang, "ex_body_noquote")}</p>
      <p className="num">+91 {phone.slice(0, 2)}••••••{phone.slice(-2)}{q ? ` · ${inr(q.monthly)}${t(lang, "perMonth")}` : ""}</p>
      <button className="primary" onClick={onBack}>{t(lang, "ex_back")}</button>
    </main>
  );
}
