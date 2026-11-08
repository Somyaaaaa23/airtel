import { computeQuote } from "../engine/quote";
import { IconCheck } from "../components/ui";
import { inr, t, type Lang } from "../i18n/strings";
import type { QuoteResult } from "./Quote";

export function Expert({ lang, phone, quote, onBack }: { lang: Lang; phone: string; quote: QuoteResult; onBack: () => void }) {
  const q = computeQuote(quote.items);
  return (
    <main className="endcard" lang={lang}>
      <div className="badge"><IconCheck /></div>
      <h2>{t(lang, "expertTitle")}</h2>
      <p>{t(lang, "expertBody")}</p>
      <p className="num">+91 {phone.slice(0, 2)}••••••{phone.slice(-2)} · {inr(q.monthly)}{t(lang, "perMonth")}</p>
      <button className="secondary" onClick={onBack}>{t(lang, "backToQuote")}</button>
    </main>
  );
}
