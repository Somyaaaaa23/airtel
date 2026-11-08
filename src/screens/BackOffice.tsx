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
import { LeakFinder, Overview, Segments, Simulator } from "./CommandCentre";

type Tab = "overview" | "segments" | "leaks" | "simulator" | "ops" | "model";
const TABS: { id: Tab; label: string; sub: string; icon: string }[] = [
  { id: "overview", label: "Overview", sub: "The quarter at a glance and where leads are lost", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { id: "segments", label: "Segments", sub: "Why each segment lags, and what its playbook does about it", icon: "M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z" },
  { id: "leaks", label: "Leak finder", sub: "The biggest fixable leaks, in ₹ per month", icon: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" },
  { id: "simulator", label: "Simulator", sub: "What happens to activations and cost if we fix each leak", icon: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" },
  { id: "ops", label: "Operations", sub: "Call list, KYC reviews, applications and consent", icon: "M4 5h16v14H4zM4 10h16M9 5v14" },
  { id: "model", label: "Lead scoring", sub: "The propensity model, its back-test and why leads drop", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

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

export function BackOffice({ admin, onSignOut }: { admin: string; onSignOut: () => void }) {
  const [orders, setOrders] = useState(loadOrders);
  const [showAllDrops, setShowAllDrops] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const openLeads = orders.filter((o) => o.kycStatus === "review").length;
  const k = bo.kpis;
  const fixable = bo.drops.filter((d) => d.fixedBy).reduce((s, d) => s + d.count, 0);
  const totalDrops = bo.drops.reduce((s, d) => s + d.count, 0);
  const drops = showAllDrops ? bo.drops : bo.drops.slice(0, 8);
  const current = TABS.find((x) => x.id === tab)!;

  return (
    <div className="bo bo-layout">
      <aside className="bo-side">
        <div className="mark"><i aria-hidden="true">U</i><span>Udyam Digital<small>Command centre</small></span></div>
        <nav className="bo-nav" aria-label="Command centre">
          {TABS.map((x) => (
            <button key={x.id} aria-current={tab === x.id ? "page" : undefined} onClick={() => { setTab(x.id); window.scrollTo(0, 0); }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={x.icon} /></svg>
              <span>{x.label}</span>
              {x.id === "ops" && openLeads ? <span className="badge-n">{openLeads}</span> : null}
            </button>
          ))}
        </nav>
        <div className="bo-who">
          <span className="fine">Signed in as</span>
          <b>{admin}</b>
          <button className="secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>

      <div className="bo-main">
      <header className="bo-head">
        <div>
          <span className="eyebrow">Accel Business · Command centre</span>
          <h1>{current.label}</h1>
          <p className="fine">{current.sub}</p>
        </div>
      </header>

      {tab === "overview" && <section className="kpis" aria-label="Last quarter">
        {[
          ["Leads", k.leads.toLocaleString("en-IN"), "Apr–Jun 2026"],
          ["Activated", pct(k.activationRate), `${k.activated} businesses`],
          ["Lead → live", `${k.avgDaysToActivation} days`, "average, activated leads"],
          ["Chasing calls", String(k.avgFollowUps), "per activated customer"],
          ["Cost per activation", inr(k.costPerActivation), "sales + partner cost"],
          ["Monthly value", inr(k.avgMonthlyValue), `NPS ${k.avgNps} · churn ${pct(k.churn6m)}`],
        ].map(([l, v, sub]) => (
          <div key={l} className="kpi"><span>{l}</span><b className="num">{v}</b><small>{sub}</small></div>
        ))}
      </section>}

      {tab === "overview" && <Overview />}
      {tab === "segments" && <Segments />}
      {tab === "leaks" && <LeakFinder />}
      {tab === "simulator" && <Simulator />}

      {tab === "ops" && <div className="bo-grid">
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
        <ConsentPanel />
      </div>}

      {tab === "model" && <div className="bo-grid">

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
      </div>}
      <p className="fine bo-foot">Data source: {bo.source}. Identifiers in staff views are masked, e.g. {maskId("27QHJXK0658U1ZL")}. Orders are kept in this browser only for the prototype.</p>
      </div>
    </div>
  );
}
