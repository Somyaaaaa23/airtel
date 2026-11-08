import { useEffect, useMemo, useState } from "react";
import { blockText, joinList, noteText, pBlurb, pName, reasonText, unitLabel } from "../advisor/explain";
import { product } from "../engine/catalogue";
import { checkDependency, dependentsOf } from "../engine/eligibility";
import { computeQuote } from "../engine/quote";
import { defaultPlan } from "../engine/recommend";
import { perDay, smartPrice, unitOffer } from "../engine/pricing";
import { formatCountdown, heldUntil, holdPrice, quoteSignature } from "../services/priceHold";
import { quoteShareText, whatsappUrl } from "../services/share";
import { LeftOut } from "../components/leftout";
import { onGroupKeys } from "../a11y/keys";
import { Peers, SegmentHero, SegmentInsight, SmartPriceCard } from "../components/segment";
import type { LineItem, Plan, Profile, Recommendation } from "../engine/types";
import { inr, t, type Lang } from "../i18n/strings";

const PER_SITE = new Set(["per site", "per counter"]);
interface Row extends LineItem { on: boolean }

export interface QuoteResult { items: { productId: string; qty: number }[]; profile: Profile }

export function Quote({ lang, profile, rec, onKyc, onExpert }: {
  lang: Lang; profile: Profile; rec: Recommendation; onKyc: (q: QuoteResult) => void; onExpert: (q: QuoteResult) => void;
}) {
  const initialPlan = defaultPlan(rec, profile);
  const [planKey, setPlanKey] = useState<Plan["key"]>(initialPlan);
  const rowsFor = (key: Plan["key"]): Row[] => {
    const items = rec.plans.find((p) => p.key === key)!.items;
    return [
      ...items.map((i) => ({ ...i, on: true })),
      ...rec.addons.filter((a) => !items.some((i) => i.productId === a.productId)).map((a) => ({ ...a, on: false })),
    ];
  };
  const [rows, setRows] = useState<Row[]>(() => rowsFor(initialPlan));
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [period, setPeriod] = useState<"month" | "day">("month");
  const [now, setNow] = useState(() => Date.now());

  const active = rows.filter((r) => r.on);
  const activeIds = active.map((r) => r.productId);
  const quote = useMemo(() => computeQuote(active), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const sp = useMemo(() => smartPrice(active, profile), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const result: QuoteResult = { items: active.map(({ productId, qty }) => ({ productId, qty })), profile };
  const money = (n: number) => inr(period === "day" ? perDay(n) : n);
  const per = t(lang, period === "day" ? "perDay" : "perMonth");
  const sig = quoteSignature(result.items, profile);
  const [holdTick, setHoldTick] = useState(0);
  const until = useMemo(() => heldUntil(sig, now), [sig, holdTick, now]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const untilText = until ? new Date(until).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : undefined;
  const share = whatsappUrl(quoteShareText(lang, result.items, sp.monthly, sp.standard, untilText));

  const switchPlan = (key: Plan["key"]) => { setPlanKey(key); setRows(rowsFor(key)); setConfirmFor(null); };
  const setOn = (ids: string[], on: boolean) => setRows((rs) => rs.map((r) => (ids.includes(r.productId) ? { ...r, on } : r)));
  const toggle = (r: Row) => {
    if (r.on && dependentsOf(r.productId, activeIds).length) return setConfirmFor(r.productId);
    setOn([r.productId], !r.on);
  };
  const setQty = (id: string, qty: number) => setRows((rs) => rs.map((r) => (r.productId === id ? { ...r, qty: Math.min(50, Math.max(1, qty)) } : r)));

  const gstNeededBy = activeIds.filter((id) => product(id).requiresGstin);
  const TIER_ORDER: Plan["key"][] = ["starter", "recommended", "pro"];
  const planTotals = [...rec.plans].sort((a, b) => TIER_ORDER.indexOf(a.key) - TIER_ORDER.indexOf(b.key))
    .map((p) => { const x = smartPrice(p.items, profile); return { key: p.key, monthly: x.monthly, saving: x.savingPct, count: p.items.length }; });
  const traceRows: { id: string; kind: "in" | "opt" | "out"; why?: string }[] = [
    ...rows.map((r) => ({ id: r.productId, kind: r.optional ? ("opt" as const) : ("in" as const) })),
    ...rec.blocked.map((b) => ({ id: b.productId, kind: "out" as const, why: b.blocks.map((x) => blockText(x, lang)).join("; ") })),
  ];

  const renderRow = (r: Row) => {
    const p = product(r.productId);
    const dependents = confirmFor === r.productId ? dependentsOf(r.productId, activeIds) : [];
    const depBlock = !r.on ? checkDependency(r.productId, activeIds) : null;
    return (
      <div key={r.productId} className={`item ${r.on ? "" : "off"}`}>
        <input type="checkbox" className="check" id={`chk-${r.productId}`} checked={r.on} disabled={!!depBlock} onChange={() => toggle(r)} aria-describedby={`why-${r.productId}`} />
        <label className="body" htmlFor={`chk-${r.productId}`}>
          <span className="name">{p.name}</span>
          <span className="desc">{pBlurb(p.id, lang)}</span>
          <span className={`why ${r.optional ? "addon" : ""}`} id={`why-${r.productId}`}>{depBlock ? blockText(depBlock, lang) : reasonText(r.reason, lang)}</span>
        </label>
        <div className="price">
          <span className="num">{unitOffer(p.id, profile) < p.priceMax && <s className="was">{money(p.priceMax * r.qty)}</s>}{money(unitOffer(p.id, profile) * r.qty)}</span>
          <small className="num">{r.qty > 1 ? `${r.qty} × ${money(unitOffer(p.id, profile))}` : `${money(unitOffer(p.id, profile))} ${unitLabel(p.id, lang)}`}{period === "day" ? ` ${per}` : ""}</small>
          {PER_SITE.has(p.unit) ? (
            r.qty > 1 && <div className="fixedqty">{unitLabel(p.id, lang)}</div>
          ) : (
            <div className="stepper" aria-label={`${t(lang, "qty")} ${p.name}`}>
              <button onClick={() => setQty(p.id, r.qty - 1)} aria-label="−" disabled={r.qty <= 1}>−</button>
              <span>{r.qty}</span>
              <button onClick={() => setQty(p.id, r.qty + 1)} aria-label="+">+</button>
            </div>
          )}
        </div>
        {dependents.length > 0 && (
          <div className="confirm" role="alertdialog" aria-label={t(lang, "removeTitle", { product: p.name, list: "" })}>
            <span>{t(lang, "removeTitle", { product: p.name, list: joinList(dependents.map(pName), lang) })}</span>
            <div>
              <button onClick={() => setConfirmFor(null)}>{t(lang, "keep")}</button>
              <button className="danger" onClick={() => { setOn([r.productId, ...dependents], false); setConfirmFor(null); }}>{t(lang, "removeAll")}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <main className="scroll" lang={lang}>
        <SegmentHero segment={profile.segment} lang={lang} />
        <div className="seg-toggle" role="radiogroup" aria-label={t(lang, "qt_period")} onKeyDown={(e) => onGroupKeys(e, true)}>
          {(["month", "day"] as const).map((x) => (
            <button key={x} role="radio" aria-checked={period === x} onClick={() => setPeriod(x)}>{t(lang, x === "month" ? "qt_month" : "qt_day")}</button>
          ))}
        </div>
        {rec.plans.length > 1 && (
          <div className="tiers" role="tablist" onKeyDown={(e) => onGroupKeys(e, true)}>
            {planTotals.map((p) => (
              <button key={p.key} role="tab" className="tier" aria-selected={planKey === p.key} onClick={() => switchPlan(p.key)}>
                <span>{t(lang, p.key === "recommended" ? "plan_recommended" : p.key === "pro" ? "plan_pro" : "plan_starter")}</span>
                <b className="num">{money(p.monthly)}</b>
                <small>{t(lang, "tier_items", { n: p.count })} · −{p.saving}%</small>
              </button>
            ))}
          </div>
        )}
        <SmartPriceCard sp={sp} profile={profile} lang={lang} period={period} />
        <div className="quote-tools">
          {until ? (
            <p className="hold-on" role="status"><b className="num">{t(lang, "qt_held", { time: formatCountdown(until - now) })}</b><span className="fine">{t(lang, "qt_held_until", { date: untilText! })}</span></p>
          ) : (
            <button className="secondary" onClick={() => { holdPrice(sig); setNow(Date.now()); setHoldTick((x) => x + 1); }}>{t(lang, "qt_hold")}</button>
          )}
          <a className="secondary wa" href={share} target="_blank" rel="noopener noreferrer">{t(lang, "qt_share")}</a>
        </div>
        {initialPlan === "starter" && planKey === "starter" && profile.monthlySpend
          ? <div className="notice info">{t(lang, "budgetNote", { cur: inr(profile.monthlySpend) })}</div> : null}
        {rec.notes.map((n, i) => <div key={i} className="notice info">{noteText(n, lang)}</div>)}

        <section className="bill" aria-label={t(lang, "included")}>
          <h2>{t(lang, "included")}</h2>
          {rows.filter((r) => !r.optional).map(renderRow)}
          {rows.some((r) => r.optional) && <h2>{t(lang, "addons")}</h2>}
          {rows.filter((r) => r.optional).map(renderRow)}
        </section>

        <LeftOut rec={rec} lang={lang} />

        <div className="facts">
          <div className="fact"><span>{t(lang, "setup")}</span><b className="num">{sp.setupFull ? <>{sp.setupPayable < sp.setupFull && <s>{inr(sp.setupFull)}</s>} {inr(sp.setupPayable)}</> : t(lang, "noSetup")}</b></div>
          <div className="fact"><span>{t(lang, "contract", { n: quote.contractMonths })}</span><b>{t(lang, "goLive", { n: sp.goLiveDays })}</b></div>
        </div>
        {profile.monthlySpend ? <p className="fine" style={{ margin: 0 }}>{t(lang, "vsSpend", { cur: inr(profile.monthlySpend) })} {t(lang, "oneBill")}</p> : null}
        <SegmentInsight profile={profile} sp={sp} items={activeIds} lang={lang} />
        <Peers segment={profile.segment} lang={lang} />

        <section className="docs">
          <h3>{t(lang, "docsTitle")}</h3>
          <ol>
            <li>{gstNeededBy.length ? t(lang, "doc_gst") : t(lang, "doc_business_any")}</li>
            <li>{t(lang, "doc_id")}</li>
            <li>{t(lang, "doc_address")}</li>
          </ol>
          <p className="fine">{gstNeededBy.length ? t(lang, "doc_gst_why", { list: joinList(gstNeededBy.map(pName), lang) }) : t(lang, "doc_no_gst_note")}</p>
        </section>

        <details className="trace">
          <summary>{t(lang, "howChecked")}</summary>
          <p className="fine" style={{ margin: "6px 0 0" }}>{t(lang, "checkedLine", { n: traceRows.length })}</p>
          <table><tbody>
            {traceRows.map((r) => (
              <tr key={r.id}>
                <td>{pName(r.id)}{r.why ? <div className="fine">{r.why}</div> : null}</td>
                <td style={{ textAlign: "right" }}><span className={`tag ${r.kind}`}>{r.kind === "in" ? "✓" : r.kind === "opt" ? "✓ +" : "✕"}</span></td>
              </tr>
            ))}
          </tbody></table>
        </details>
      </main>
      <footer className="footer" lang={lang}>
        <div className="sum">
          <div>
            <div className="fine">{t(lang, "sp_your")} · <s className="num">{money(sp.standard)}</s></div>
            <div className="big num">{money(sp.monthly)}<small>{per}</small></div>
          </div>
          <div className="side">
            <div>{t(lang, "dueToday")}: <b className="num">{inr(sp.firstPayment)}</b></div>
            <div>{t(lang, "contract", { n: quote.contractMonths })}</div>
          </div>
        </div>
        <div className="row2">
          <button className="secondary" onClick={() => onExpert(result)}>{t(lang, "expert")}</button>
          <button className="primary" disabled={!active.length} onClick={() => onKyc(result)}>{t(lang, "continueKyc")}</button>
        </div>
      </footer>
    </>
  );
}
