/** Company view: where the pipeline leaks, by segment, why, what it costs, and what each fix is worth. Staff-facing, English. */
import { useState } from "react";
import bo from "../data/backoffice.json";
import { product } from "../engine/catalogue";
import { diagnose, LEVERS, simulate, topLeaks, TRANSITIONS, type LeverId, type Seg } from "../engine/diagnose";
import { PLAYBOOKS } from "../engine/segments";
import type { Segment } from "../engine/types";

const NAME: Record<string, string> = { micro: "Micro retail", prof: "Professional offices", multi: "Multi-site", mfg: "Manufacturers" };
const ROUTE: Record<string, string> = { self: "Fully online", assisted: "Online + specialist call", rm: "Relationship manager", priority: "Priority install crew" };
const FRAME: Record<string, string> = { day: "₹ per day", staff: "₹ per staff member", site: "₹ per site", downtime: "Downtime cost" };
const LOSS = [
  { k: "process", label: "Our own process", tone: "var(--bad)" },
  { k: "reach", label: "Unreachable or not interested", tone: "var(--chart)" },
  { k: "choice", label: "Chose not to buy", tone: "var(--warn)" },
  { k: "network", label: "No network at site", tone: "var(--text)" },
] as const;
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const lakh = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} lakh` : inr(n));
const pct = (v: number) => `${Math.round(v * 10) / 10}%`;

function LossBar({ loss }: { loss: Record<string, number> }) {
  const total = Object.values(loss).reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="lossbar" role="img" aria-label="Why leads dropped">
        {LOSS.map((l) => <i key={l.k} style={{ flex: loss[l.k], background: l.tone }} title={`${l.label}: ${loss[l.k]}`} />)}
      </div>
      <ul className="legend">
        {LOSS.map((l) => <li key={l.k}><i style={{ background: l.tone }} /><b>{pct((loss[l.k] / total) * 100)}</b> {l.label} <span className="fine">({loss[l.k].toLocaleString("en-IN")})</span></li>)}
      </ul>
    </div>
  );
}

/** Share of leads (x) vs activation rate (y); bubble area = median monthly bundle. */
function Bubbles({ onPick, picked }: { onPick?: (k: Segment) => void; picked?: string }) {
  const W = 560, H = 300, P = 44;
  const x = (v: number) => P + (v / 60) * (W - P * 2);
  const y = (v: number) => H - P - (v / 15) * (H - P * 2);
  const maxB = Math.max(...bo.segments.map((s) => s.medianBundle));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bubbles" role="img" aria-label="Segments: share of leads against activation rate">
      {[0, 5, 10, 15].map((v) => <g key={v}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="grid" /><text x={P - 6} y={y(v) + 4} textAnchor="end">{v}%</text></g>)}
      {[0, 15, 30, 45, 60].map((v) => <text key={v} x={x(v)} y={H - P + 16} textAnchor="middle">{v}%</text>)}
      <text x={W - P} y={H - 4} textAnchor="end" className="axis">Share of all leads →</text>
      <text x={W - P} y={P - 14} textAnchor="end" className="axis">↑ Activation rate</text>
      {bo.segments.map((s) => {
        const r = 8 + 34 * Math.sqrt(s.medianBundle / maxB);
        // Label placement chosen per segment so nearby bubbles don't collide.
        const place = ({ micro: "left", multi: "below", prof: "right", mfg: "above" } as Record<string, string>)[s.key];
        const cx = x(s.share), cy = y(s.activationRate);
        const lx = place === "left" ? cx - r - 6 : place === "right" ? cx + r + 6 : cx;
        const ly = place === "below" ? cy + r + 14 : place === "above" ? cy - r - 20 : cy - 4;
        const anchor = place === "left" ? "end" : place === "right" ? "start" : "middle";
        return (
          <g key={s.key} className={`bub ${picked === s.key ? "on" : ""} ${s.key === "micro" ? "hot" : ""}`} onClick={() => onPick?.(s.key as Segment)} style={{ cursor: onPick ? "pointer" : undefined }}>
            <title>{`${NAME[s.key]}: ${pct(s.share)} of leads, ${pct(s.activationRate)} activate, median ${inr(s.medianBundle)}/month`}</title>
            <circle cx={cx} cy={cy} r={r} />
            <text x={lx} y={ly} textAnchor={anchor} className="blabel">{NAME[s.key]}</text>
            <text x={lx} y={ly + 14} textAnchor={anchor} className="bsub">{pct(s.share)} of leads · {pct(s.activationRate)} · {inr(s.medianBundle)}/mo</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Overview() {
  const o = bo.overall;
  const lost = Object.values(o.loss).reduce((a, b) => a + b, 0);
  return (
    <div className="bo-grid">
      <section className="panel wide headline">
        <span className="eyebrow">The real problem</span>
        <h2><em>{pct((o.loss.process / lost) * 100)}</em> of the businesses we lost were lost to our own process, not to price or rivals.</h2>
        <p className="fine">{bo.kpis.leads.toLocaleString("en-IN")} leads → {bo.kpis.activated} activations ({pct(bo.kpis.activationRate)}, Apr–Jun 2026). Where the other {lost.toLocaleString("en-IN")} went:</p>
        <LossBar loss={o.loss} />
      </section>
      <section className="panel">
        <h2>Where the volume is, the value isn't</h2>
        <p className="fine">Micro is {pct(bo.segments[0].share)} of leads but activates at {pct(bo.segments[0].activationRate)}, and costs {inr(bo.segments[0].costPerActivation)} to win a {inr(bo.segments[0].medianBundle)}/month customer.</p>
        <Bubbles />
      </section>
      <section className="panel">
        <h2>Funnel</h2>
        <div className="funnel">
          {bo.funnel.map((f, i) => (
            <div key={f.stage} className="frow">
              <span>{f.stage}</span>
              <i style={{ width: `${(f.count / bo.funnel[0].count) * 100}%` }} />
              <b className="num">{f.count.toLocaleString("en-IN")}</b>
              <small className="num">{i ? pct((f.count / bo.funnel[i - 1].count) * 100) : ""}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <h2>Segments at a glance</h2>
        <div className="tablewrap">
          <table className="bo-table">
            <thead><tr><th>Segment</th><th className="r">Leads</th><th className="r">Activate</th><th className="r">Median bill</th><th className="r">Cost / activation</th><th className="r">Payback</th><th className="r">Days to live</th><th className="r">6-mo churn</th><th>Playbook</th></tr></thead>
            <tbody>
              {bo.segments.map((s) => (
                <tr key={s.key}>
                  <td><b>{PLAYBOOKS[s.key as Segment].icon} {NAME[s.key]}</b></td>
                  <td className="r num">{pct(s.share)}</td>
                  <td className="r num">{pct(s.activationRate)}</td>
                  <td className="r num">{inr(s.medianBundle)}</td>
                  <td className="r num">{inr(s.costPerActivation)}</td>
                  <td className={`r num ${s.paybackMonths > 3 ? "neg" : ""}`}>{s.paybackMonths} mo</td>
                  <td className={`r num ${s.daysToLive > o.daysToLive + 1.5 ? "neg" : ""}`}>{s.daysToLive}</td>
                  <td className={`r num ${s.churn > o.churn + 3 ? "neg" : ""}`}>{pct(s.churn)}</td>
                  <td>{ROUTE[PLAYBOOKS[s.key as Segment].route]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StageCompare({ s }: { s: Seg }) {
  return (
    <div className="stagecmp">
      {TRANSITIONS.map((t, i) => {
        const gap = s.stageConv[i] - bo.overall.stageConv[i];
        return (
          <div key={t} className="scrow" title={`${t}: ${pct(s.stageConv[i])} vs ${pct(bo.overall.stageConv[i])} overall`}>
            <span>{t}</span>
            <span className="sctrack"><i style={{ width: `${s.stageConv[i]}%` }} /><b style={{ left: `${bo.overall.stageConv[i]}%` }} /></span>
            <span className="num">{pct(s.stageConv[i])} <small className={gap < -3 ? "neg" : gap > 3 ? "pos" : ""}>{gap > 0 ? "+" : ""}{Math.round(gap)}</small></span>
          </div>
        );
      })}
      <p className="fine">Bar = this segment; tick = all segments.</p>
    </div>
  );
}

export function Segments() {
  const [k, setK] = useState<Segment>("micro");
  const s = bo.segments.find((x) => x.key === k)!;
  const pb = PLAYBOOKS[k];
  const findings = diagnose(s);
  return (
    <div className="bo-grid">
      <div className="segpick wide">
        {bo.segments.map((x) => (
          <button key={x.key} className={`segbtn ${x.key === k ? "on" : ""}`} onClick={() => setK(x.key as Segment)}>
            <span className="ic" aria-hidden="true">{PLAYBOOKS[x.key as Segment].icon}</span>
            <b>{NAME[x.key]}</b>
            <span className="num">{pct(x.share)} of leads · {pct(x.activationRate)} activate</span>
          </button>
        ))}
      </div>
      <section className="panel wide">
        <h2>Why {NAME[k].toLowerCase()} is lacking</h2>
        <div className="findings">
          {findings.map((f) => (
            <article key={f.title} className={`finding ${f.severity}`}>
              <span className="sev">{f.severity === "high" ? "High" : "Medium"}</span>
              <h3>{f.title}</h3>
              <p>{f.detail}</p>
              <p className="fixline"><b>Fix:</b> {f.fix}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Numbers</h2>
        <div className="kpis mini">
          {[
            ["Median bill", inr(s.medianBundle)], ["Cost / activation", inr(s.costPerActivation)], ["Payback", `${s.paybackMonths} mo`],
            ["Days to live", String(s.daysToLive)], ["Bundle ÷ spend", `${s.bundleToSpend}×`], ["6-mo churn", pct(s.churn)],
            ["NPS", String(s.nps)], ["Has GSTIN", pct(s.gstinShare)],
          ].map(([l, v]) => <div key={l} className="kpi"><span>{l}</span><b className="num">{v}</b></div>)}
        </div>
        <h3>KYC clearance after quote</h3>
        <div className="kycsplit">
          <div><span>With GSTIN</span><i style={{ width: `${s.kycClear.gst}%` }} /><b className="num">{pct(s.kycClear.gst)}</b></div>
          <div><span>Without</span><i className="neg" style={{ width: `${Math.max(1, s.kycClear.noGst)}%` }} /><b className="num">{pct(s.kycClear.noGst)}</b></div>
        </div>
      </section>
      <section className="panel">
        <h2>Funnel vs all segments</h2>
        <StageCompare s={s} />
      </section>
      <section className="panel">
        <h2>Top drop reasons</h2>
        <div className="tablewrap">
          <table className="bo-table">
            <thead><tr><th>Reason</th><th className="r">Leads</th><th className="r">vs avg</th><th className="r">₹/mo at stake</th></tr></thead>
            <tbody>
              {s.reasons.slice(0, 8).map((r) => (
                <tr key={r.reason}>
                  <td>{r.reason}<div className="fine">{r.loss === "process" ? "Our process" : r.loss === "reach" ? "Reach" : r.loss === "network" ? "Network" : "Choice"} · at {r.stage}</div></td>
                  <td className="r num">{r.count}</td>
                  <td className={`r num ${r.lift >= 1.2 ? "neg" : r.lift <= 0.8 ? "pos" : ""}`}>{r.lift}×</td>
                  <td className="r num">{inr(r.atStake)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Playbook for this segment</h2>
        <ul className="playbook">
          <li><b>Route:</b> {ROUTE[pb.route]}</li>
          <li><b>Price framing:</b> {FRAME[pb.frame]}</li>
          <li><b>Offer:</b> {[pb.offer.setupWaive ? `${pb.offer.setupWaive * 100}% setup waived` : "", pb.offer.firstMonthOff ? `first month ${pb.offer.firstMonthOff * 100}% off` : "", pb.offer.launchMonths ? `launch price for ${pb.offer.launchMonths} months` : "", pb.offer.perSite ? `${pb.offer.perSite * 100}% per extra site (max ${pb.offer.perSiteCap * 100}%)` : ""].filter(Boolean).join(", ")}</li>
          {pb.installCut > 0 && <li><b>Install:</b> priority crew, {pb.installCut * 100}% faster</li>}
          <li><b>Most bought:</b> {s.topProducts.map((p) => `${product(p.id).name} (${pct(p.attach)})`).join(", ")}</li>
          <li><b>Best channel:</b> {[...s.sources].sort((a, b) => b.activationRate - a.activationRate)[0].source}; <b>worst reach:</b> {[...s.sources].sort((a, b) => a.contactRate - b.contactRate)[0].source} ({pct([...s.sources].sort((a, b) => a.contactRate - b.contactRate)[0].contactRate)} contacted)</li>
        </ul>
      </section>
    </div>
  );
}

/** Heat: each segment's conversion at each step vs all segments. */
export function LeakFinder() {
  const leaks = topLeaks(10);
  return (
    <div className="bo-grid">
      <section className="panel wide">
        <h2>Leak map</h2>
        <p className="fine">Conversion at each step. Red = below the all-segment rate, green = above; deeper colour = bigger gap. Hover a cell for the numbers.</p>
        <div className="heat" style={{ gridTemplateColumns: `140px repeat(${TRANSITIONS.length}, 1fr)` }}>
          <span />
          {TRANSITIONS.map((t) => <span key={t} className="hh">{t.replace(" → ", " →\n")}</span>)}
          {bo.segments.map((s) => (
            <div key={s.key} style={{ display: "contents" }}>
              <span className="hr">{NAME[s.key]}</span>
              {s.stageConv.map((v, i) => {
                const gap = v - bo.overall.stageConv[i];
                const a = Math.min(0.85, Math.abs(gap) / 16 + 0.08);
                return (
                  <span key={i} className={`hc ${a > 0.45 ? "dark" : ""}`} title={`${NAME[s.key]}, ${TRANSITIONS[i]}: ${pct(v)} (${gap > 0 ? "+" : ""}${Math.round(gap)} pts vs all)`}
                    style={{ background: `color-mix(in srgb, var(${gap < 0 ? "--bad" : "--ok"}) ${Math.round(a * 100)}%, transparent)` }}>
                    <b className="num">{pct(v)}</b><small className="num">{gap > 0 ? "+" : ""}{Math.round(gap)}</small>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <h2>Biggest leaks we can fix, in rupees</h2>
        <p className="fine">Monthly revenue these leads would have brought, at each segment's odds of activating from the step where they dropped.</p>
        <ol className="leaks">
          {leaks.map((l, i) => (
            <li key={l.seg.key + l.reason}>
              <span className="rank">{i + 1}</span>
              <div>
                <b>{NAME[l.seg.key]}: {l.reason}</b>
                <span className="fine">{l.count} leads at {l.stage} · {pct(l.p * 100)} would have activated</span>
              </div>
              <b className="num money">{inr(l.atStake)}<small>/mo</small></b>
              <span className="tag in">{l.fix}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function Simulator() {
  const [rates, setRates] = useState<Record<LeverId, number>>(() => Object.fromEntries(LEVERS.map((l) => [l.id, l.rate])) as Record<LeverId, number>);
  const impact = simulate(rates);
  const extra = impact.reduce((a, b) => a + b.extra, 0);
  const revenue = impact.reduce((a, b) => a + b.revenue, 0);
  const spend = bo.segments.reduce((a, s) => a + s.costPerActivation * s.activated, 0);
  const newCac = spend / (bo.kpis.activated + extra);
  return (
    <div className="sim-grid">
      <section className="panel">
        <h2>Levers</h2>
        <p className="fine">Share of each drop reason the journey recovers. Defaults are our assumptions; drag to test your own.</p>
        <div className="levers">
          {LEVERS.map((l) => (
            <label key={l.id} className="lever">
              <span>{l.name}<small>{l.reasons.join(" · ")}</small></span>
              <input type="range" min={0} max={100} step={5} value={Math.round(rates[l.id] * 100)} onChange={(e) => setRates((r) => ({ ...r, [l.id]: Number(e.target.value) / 100 }))} />
              <b className="num">{Math.round(rates[l.id] * 100)}%</b>
            </label>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Same quarter, same leads, with the new journey</h2>
        <div className="kpis mini sim-kpis">
          <div className="kpi"><span>Activations</span><b className="num">{bo.kpis.activated} → {Math.round(bo.kpis.activated + extra)}</b><small>+{Math.round(extra)}</small></div>
          <div className="kpi"><span>Activation rate</span><b className="num">{pct(bo.kpis.activationRate)} → {pct(((bo.kpis.activated + extra) / bo.kpis.leads) * 100)}</b></div>
          <div className="kpi"><span>Cost per activation</span><b className="num">{inr(bo.kpis.costPerActivation)} → {inr(newCac)}</b><small>same sales spend</small></div>
          <div className="kpi"><span>New monthly revenue</span><b className="num">{lakh(revenue)}</b><small>{lakh(revenue * 12)} a year</small></div>
        </div>
        <div className="tablewrap">
          <table className="bo-table">
            <thead><tr><th>Segment</th><th className="r">Activations</th><th className="r">Rate</th><th className="r">Cost / activation</th><th className="r">₹/mo added</th></tr></thead>
            <tbody>
              {impact.map((i) => (
                <tr key={i.segment}>
                  <td>{NAME[i.segment]}</td>
                  <td className="r num">{i.activations} → {Math.round(i.activations + i.extra)}</td>
                  <td className="r num">{pct(i.rate)} → <b className="pos">{pct(i.newRate)}</b></td>
                  <td className="r num">{inr(i.cac)} → {inr(i.newCac)}</td>
                  <td className="r num">{inr(i.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">Recovered leads activate at their segment's own odds from the step where they dropped; revenue uses the segment's median bundle.</p>
      </section>
    </div>
  );
}
