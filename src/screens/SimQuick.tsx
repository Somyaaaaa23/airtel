import { useState } from "react";
import { product } from "../engine/catalogue";
import type { Profile, Recommendation } from "../engine/types";
import { inr, t, type Lang } from "../i18n/strings";

const COUNTS = [1, 2, 3, 5, 10];

/** Fast path for owners who only want business SIMs (280 leads in the data dropped because they "only wanted a mobile plan"). */
export function SimQuick({ lang, onQuote }: { lang: Lang; onQuote: (p: Profile, r: Recommendation) => void }) {
  const [qty, setQty] = useState(2);
  const [plan, setPlan] = useState<"P07" | "P08">("P07");
  const go = () => {
    const profile: Profile = {
      segment: "micro", employees: qty, sites: 1, tier: 2, hasActiveGstin: false, needs: ["mobile_lines"], speedPref: "auto", lines: qty,
    };
    const item = { productId: plan, qty, reason: { kind: "asked" as const, need: "mobile_lines" as const }, optional: false };
    onQuote(profile, { plans: [{ key: "recommended", items: [item] }], addons: [], blocked: [], notes: [] });
  };
  return (
    <main className="scroll" lang={lang}>
      <section className="consent">
        <h3>{t(lang, "simCount")}</h3>
        <div className="chips">{COUNTS.map((n) => <button key={n} className="chip" aria-pressed={qty === n} onClick={() => setQty(n)}>{n}</button>)}</div>
      </section>
      <section className="consent">
        <h3>{t(lang, "simPlan")}</h3>
        <div className="paths">
          {(["P07", "P08"] as const).map((id) => (
            <button key={id} className={`path ${plan === id ? "primary-path" : ""}`} aria-pressed={plan === id} onClick={() => setPlan(id)}>
              <b>{product(id).name} · {inr(product(id).price)}{t(lang, "perMonth")}</b><span>{t(lang, id === "P07" ? "simP07" : "simP08")}</span>
            </button>
          ))}
        </div>
      </section>
      <button className="primary" onClick={go}>{t(lang, "simContinue")} · {inr(product(plan).price * qty)}{t(lang, "perMonth")}</button>
    </main>
  );
}
