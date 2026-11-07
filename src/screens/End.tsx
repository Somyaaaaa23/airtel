import { joinList, pName } from "../advisor/explain";
import { product } from "../engine/catalogue";
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

export function KycNext({ lang, quote, onBack }: { lang: Lang; quote: QuoteResult; onBack: () => void }) {
  const gstBy = quote.items.map((i) => i.productId).filter((id) => product(id).requiresGstin);
  return (
    <main className="endcard" lang={lang}>
      <div className="badge"><IconCheck /></div>
      <h2>{t(lang, "kycNextTitle")}</h2>
      <p>{t(lang, "kycNextBody")}</p>
      <section className="docs">
        <h3>{t(lang, "docsTitle")}</h3>
        <ol>
          <li>{gstBy.length ? t(lang, "doc_gst") : t(lang, "doc_business_any")}</li>
          <li>{t(lang, "doc_id")}</li>
          <li>{t(lang, "doc_address")}</li>
        </ol>
        <p className="fine">{gstBy.length ? t(lang, "doc_gst_why", { list: joinList(gstBy.map(pName), lang) }) : t(lang, "doc_no_gst_note")}</p>
      </section>
      <button className="secondary" onClick={onBack}>{t(lang, "backToQuote")}</button>
    </main>
  );
}
