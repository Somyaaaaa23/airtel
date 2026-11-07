import { useMemo, useState } from "react";
import { blockText, joinList, noteText, pBlurb, pName, reasonText, unitLabel } from "../advisor/explain";
import { product } from "../engine/catalogue";
import { checkDependency, dependentsOf } from "../engine/eligibility";
import { computeQuote } from "../engine/quote";
import type { LineItem, Plan, Profile, Recommendation } from "../engine/types";
import { inr, t, type Lang } from "../i18n/strings";

const PER_SITE = new Set(["per site", "per counter"]);
interface Row extends LineItem { on: boolean }

export interface QuoteResult { items: { productId: string; qty: number }[]; profile: Profile }

export function Quote({ lang, profile, rec, onKyc, onExpert }: {
  lang: Lang; profile: Profile; rec: Recommendation; onKyc: (q: QuoteResult) => void; onExpert: (q: QuoteResult) => void;
}) {
  const [planKey, setPlanKey] = useState<Plan["key"]>("recommended");
  const rowsFor = (key: Plan["key"]): Row[] => [
    ...rec.plans.find((p) => p.key === key)!.items.map((i) => ({ ...i, on: true })),
    ...rec.addons.map((a) => ({ ...a, on: false })),
  ];
  const [rows, setRows] = useState<Row[]>(() => rowsFor("recommended"));
  const [confirmFor, setConfirmFor] = useState<string | null>(null);

  const active = rows.filter((r) => r.on);
  const activeIds = active.map((r) => r.productId);
  const quote = useMemo(() => computeQuote(active), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const result: QuoteResult = { items: active.map(({ productId, qty }) => ({ productId, qty })), profile };

  const switchPlan = (key: Plan["key"]) => { setPlanKey(key); setRows(rowsFor(key)); setConfirmFor(null); };
  const setOn = (ids: string[], on: boolean) => setRows((rs) => rs.map((r) => (ids.includes(r.productId) ? { ...r, on } : r)));
  const toggle = (r: Row) => {
    if (r.on && dependentsOf(r.productId, activeIds).length) return setConfirmFor(r.productId);
    setOn([r.productId], !r.on);
  };
  const setQty = (id: string, qty: number) => setRows((rs) => rs.map((r) => (r.productId === id ? { ...r, qty: Math.min(50, Math.max(1, qty)) } : r)));

  const gstNeededBy = activeIds.filter((id) => product(id).requiresGstin);
  const planTotals = rec.plans.map((p) => ({ key: p.key, monthly: computeQuote(p.items).monthly }));
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
          <span className="num">{inr(p.price * r.qty)}</span>
          <small className="num">{r.qty > 1 ? `${r.qty} × ${inr(p.price)}` : `${inr(p.price)} ${unitLabel(p.id, lang)}`}</small>
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
        {rec.plans.length > 1 && (
          <div className="tabs" role="tablist">
            {planTotals.map((p) => (
              <button key={p.key} role="tab" aria-selected={planKey === p.key} onClick={() => switchPlan(p.key)}>
                {t(lang, p.key === "recommended" ? "plan_recommended" : "plan_starter")}
                <small>{inr(p.monthly)}{t(lang, "perMonth")}</small>
              </button>
            ))}
          </div>
        )}
        {rec.notes.map((n, i) => <div key={i} className="notice info">{noteText(n, lang)}</div>)}

        <section className="bill" aria-label={t(lang, "included")}>
          <h2>{t(lang, "included")}</h2>
          {rows.filter((r) => !r.optional).map(renderRow)}
          {rows.some((r) => r.optional) && <h2>{t(lang, "addons")}</h2>}
          {rows.filter((r) => r.optional).map(renderRow)}
        </section>

        {rec.blocked.length > 0 && (
          <div className="notice blocked">
            <strong>{t(lang, "notIncluded")}</strong>
            <ul>{rec.blocked.map((b) => <li key={b.productId}>{pName(b.productId)}: {b.blocks.map((x) => blockText(x, lang)).join("; ")}{b.alternative ? `. ${t(lang, "insteadAdded", { product: pName(b.alternative) })}` : ""}</li>)}</ul>
            {rec.blocked.some((b) => b.blocks.some((x) => x.code === "gstin")) && <span>{t(lang, "gstTip")}</span>}
          </div>
        )}

        <div className="facts">
          <div className="fact"><span>{t(lang, "setup")}</span><b className="num">{quote.setup ? inr(quote.setup) : t(lang, "noSetup")}</b></div>
          <div className="fact"><span>{t(lang, "contract", { n: quote.contractMonths })}</span><b>{t(lang, "goLive", { n: quote.goLiveDays })}</b></div>
        </div>
        {profile.monthlySpend ? <p className="fine" style={{ margin: 0 }}>{t(lang, "vsSpend", { cur: inr(profile.monthlySpend) })} {t(lang, "oneBill")}</p> : null}

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
            <div className="fine">{t(lang, "monthly")}</div>
            <div className="big num">{inr(quote.monthly)}<small>{t(lang, "perMonth")}</small></div>
          </div>
          <div className="side">
            <div>{quote.setup ? `+ ${inr(quote.setup)} ${t(lang, "setup").toLowerCase()}` : t(lang, "noSetup")}</div>
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
