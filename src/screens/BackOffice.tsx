/**
 * Back office (staff view, English only): where the funnel leaks in smb_leads.csv, which part of this app answers
 * each leak, the activation propensity model, and the applications made in the owner app on this device.
 */
import { useState } from "react";
import bo from "../data/backoffice.json";
import { product } from "../engine/catalogue";
import { maskId } from "../engine/gstin";
import { addDays } from "../engine/kyc";
import { goLiveDay, planTasks, type Order } from "../engine/orders";
import { fmtDate, inr } from "../i18n/strings";
import { loadOrders } from "../services/orders";
import { CallNext, ConsentPanel, HeatTag, KycReview } from "./BackOfficeQueues";

const FIX_LABEL: Record<string, string> = {
  advisor: "Self-serve advisor: no visit needed",
  quote: "Plain-language quote in 2 minutes, with a budget plan",
  kyc: "Smart KYC tells owners exactly what to fix",
  tracker: "Order tracker: proactive updates, visit slot picked by owner",
  score: "Propensity score: call the likeliest leads first",
  otp: "OTP-verified mobile number",
  sim: "\"I just need a SIM\" fast path",
  esign: "OTP / Aadhaar e-sign: signatory needn't be present",
  payment: "UPI or card payment with retry",
};

/** Next best action for an application, from KYC state and propensity. */
function action(o: Order) {
  if (o.kycStatus === "review") return { text: "Clear KYC review today", tone: "opt" };
  if (o.kycStatus === "rejected") return { text: "Chase new document on WhatsApp", tone: "out" };
  if ((o.score ?? 0) >= 0.1) return { text: "Priority install crew; upsell backup line", tone: "in" };
  return { text: "Welcome call after go-live to protect NPS", tone: "in" };
}

const pct = (v: number) => `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;

function Bars({ rows, max, unit = "", label }: { rows: { name: string; value: number; note?: string; hl?: boolean }[]; max: number; unit?: string; label: string }) {
  return (
    <div className="bars" role="list" aria-label={label}>
      {rows.map((r) => (
        <div key={r.name} className={`barrow ${r.hl ? "hl" : ""}`} role="listitem" title={`${r.name}: ${r.value.toLocaleString("en-IN")}${unit}${r.note ? ` · ${r.note}` : ""}`}>
          <span className="bname">{r.name}</span>
          <span className="btrack"><i style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} /></span>
          <span className="bval num">{r.value.toLocaleString("en-IN")}{unit}{r.note ? <small> {r.note}</small> : null}</span>
        </div>
      ))}
    </div>
  );
}

export function BackOffice({ onExit }: { onExit: () => void }) {
  const [orders, setOrders] = useState(loadOrders);
  const [showAllDrops, setShowAllDrops] = useState(false);
  const k = bo.kpis;
  const fixable = bo.drops.filter((d) => d.fixedBy).reduce((s, d) => s + d.count, 0);
  const totalDrops = bo.drops.reduce((s, d) => s + d.count, 0);
  const drops = showAllDrops ? bo.drops : bo.drops.slice(0, 8);

  return (
    <div className="bo">
      <header className="bo-head">
        <div>
          <span className="eyebrow">Accel Business · Back office</span>
          <h1>Udyam Digital pipeline</h1>
          <p className="fine">{bo.source}</p>
        </div>
        <button className="secondary" onClick={onExit}>← Owner app</button>
      </header>

      <section className="kpis" aria-label="Last quarter">
        {[
          ["Leads", k.leads.toLocaleString("en-IN"), "Apr–Jun 2026"],
          ["Activated", pct(k.activationRate), `${k.activated} businesses`],
          ["Lead → live", `${k.avgDaysToActivation} days`, "average, activated leads"],
          ["Chasing calls", String(k.avgFollowUps), "per activated customer"],
          ["Cost per activation", inr(k.costPerActivation), "sales + partner cost"],
          ["Monthly value", inr(k.avgMonthlyValue), `NPS ${k.avgNps} · churn ${pct(k.churn6m)}`],
        ].map(([l, v, s]) => (
          <div key={l} className="kpi"><span>{l}</span><b className="num">{v}</b><small>{s}</small></div>
        ))}
      </section>

      <div className="bo-grid">
        <CallNext />
        <KycReview orders={orders} onChange={() => setOrders(loadOrders())} />
        <section className="panel wide">
          <h2>Applications from the owner app</h2>
          <p className="fine">Orders placed on this device, scored at order time. Score = chance a lead like this activates (model below).</p>
          {orders.length === 0 ? (
            <p className="empty-note">No orders yet. Run a demo business through the advisor, quote and Smart KYC, then come back.</p>
          ) : (
            <div className="tablewrap">
              <table className="bo-table">
                <thead><tr><th>Order</th><th>Business</th><th>Plan</th><th>KYC</th><th>Live by</th><th>Score</th><th>Next action</th></tr></thead>
                <tbody>
                  {orders.map((o) => {
                    const a = action(o);
                    return (
                      <tr key={o.id}>
                        <td className="num">{o.id}</td>
                        <td><b>{o.businessName}</b><div className="fine">{o.city ?? ""}{o.pincode ? ` · ${o.pincode}` : ""} · {o.employees} staff</div></td>
                        <td>{inr(o.monthly)}/mo<div className="fine">{o.items.map((i) => product(i.productId).name).slice(0, 3).join(", ")}{o.items.length > 3 ? ` +${o.items.length - 3}` : ""}</div></td>
                        <td><span className={`tag ${o.kycStatus === "verified" ? "in" : o.kycStatus === "rejected" ? "out" : "opt"}`}>{o.kycStatus === "verified" ? "Verified" : o.kycStatus === "rejected" ? "Rejected" : "Review"}</span>
                          <div className="fine">{[o.gstVerified && "GST", o.udyamVerified && "Udyam"].filter(Boolean).join(" + ") || "—"}</div></td>
                        <td>{fmtDate(addDays(o.placedOn, goLiveDay(planTasks(o))), "en")}</td>
                        <td className="num"><HeatTag score={o.score} /> {o.score !== undefined ? pct(o.score * 100) : "—"}</td>
                        <td><span className={`tag ${a.tone}`}>{a.text}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Funnel</h2>
          <p className="fine">Leads reaching each stage; % of the stage before.</p>
          <Bars label="Funnel" max={bo.funnel[0].count} rows={bo.funnel.map((f, i) => ({
            name: f.stage, value: f.count, note: i ? pct((f.count / bo.funnel[i - 1].count) * 100) : undefined,
          }))} />
        </section>

        <section className="panel">
          <h2>Propensity model</h2>
          <p className="fine">
            Logistic regression on facts known when a lead arrives (channel, segment, size, GST/Udyam, current internet, spend).
            Trained on {bo.metrics.trainSize.toLocaleString("en-IN")} leads, tested on {bo.metrics.testSize.toLocaleString("en-IN")} held out.
          </p>
          <div className="facts">
            <div className="fact"><span>AUC on held-out leads</span><b className="num">{bo.metrics.auc}</b></div>
            <div className="fact"><span>Activations in the top 30% of scores</span><b className="num">{pct(bo.metrics.top30Capture)}</b></div>
          </div>
          <h3>Activation rate by score decile</h3>
          <p className="fine">Held-out leads, highest scores first. Average: {pct(bo.metrics.baseRate)}.</p>
          <Bars label="Activation rate by score decile" unit="%" max={Math.max(...bo.metrics.deciles.map((d) => d.activationRate))}
            rows={bo.metrics.deciles.map((d) => ({ name: `Decile ${d.decile}`, value: d.activationRate, hl: d.decile <= 3 }))} />
        </section>

        <section className="panel wide">
          <h2>Why leads drop, and what answers it</h2>
          <p className="fine">{pct((fixable / totalDrops) * 100)} of the {totalDrops.toLocaleString("en-IN")} lost leads dropped for a reason this journey addresses.</p>
          <div className="tablewrap">
            <table className="bo-table">
              <thead><tr><th>Drop reason</th><th className="r">Leads</th><th>Usually at</th><th>Answered by</th></tr></thead>
              <tbody>
                {drops.map((d) => (
                  <tr key={d.reason}>
                    <td>{d.reason}<span className="minibar" style={{ width: `${(d.count / bo.drops[0].count) * 100}%` }} aria-hidden="true" /></td>
                    <td className="r num">{d.count}</td>
                    <td className="fine">{d.stage}</td>
                    <td>{d.fixedBy ? <span className="tag in">{FIX_LABEL[d.fixedBy]}</span> : <span className="fine">Pricing / market</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bo.drops.length > 8 && <button className="textbtn" onClick={() => setShowAllDrops((v) => !v)}>{showAllDrops ? "Show fewer" : `Show all ${bo.drops.length} reasons`}</button>}
        </section>

        <section className="panel">
          <h2>What moves the score</h2>
          <div className="drivers">
            <div>
              <h3>Raises it</h3>
              <ul>{bo.drivers.up.map((d) => <li key={d.feature}><span className="tag in">+{d.weight.toFixed(2)}</span>{d.label}</li>)}</ul>
            </div>
            <div>
              <h3>Lowers it</h3>
              <ul>{bo.drivers.down.map((d) => <li key={d.feature}><span className="tag out">{d.weight.toFixed(2)}</span>{d.label}</li>)}</ul>
            </div>
          </div>
          <p className="fine">Weights on standardised features. Website and WhatsApp leads activate least, which is the gap the self-serve journey targets.</p>
        </section>

        <section className="panel">
          <h2>Channels</h2>
          <div className="tablewrap">
            <table className="bo-table">
              <thead><tr><th>Source</th><th className="r">Leads</th><th className="r">Activated</th><th className="r">Cost / activation</th></tr></thead>
              <tbody>
                {bo.channels.map((c) => (
                  <tr key={c.source}><td>{c.source}</td><td className="r num">{c.leads}</td><td className="r num">{pct(c.activationRate)}</td><td className="r num">{c.costPerActivation ? inr(c.costPerActivation) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ConsentPanel />
        <section className="panel">
          <h2>Back-test: held-out leads by score</h2>
          <p className="fine">Top 8 and bottom 4 scores, with what actually happened.</p>
          <div className="tablewrap">
            <table className="bo-table">
              <thead><tr><th>Lead</th><th>Business</th><th className="r">Score</th><th>Outcome</th></tr></thead>
              <tbody>
                {bo.sample.map((s) => (
                  <tr key={s.leadId}>
                    <td className="num">{s.leadId}</td>
                    <td>{s.business}<div className="fine">{s.type} · {s.city} · {s.source}</div></td>
                    <td className="r num">{pct(s.score)}</td>
                    <td>{s.outcome === "Activated" ? <span className="tag in">Activated</span> : <><span className="tag out">Dropped</span><div className="fine">{s.dropReason}</div></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="fine bo-foot">Identifiers in staff views are masked, e.g. {maskId("27QHJXK0658U1ZL")}. Orders are kept in this browser only for the prototype.</p>
    </div>
  );
}
