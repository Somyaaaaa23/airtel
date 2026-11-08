/** Back-office work queues: who to call next, KYC files waiting for a human, and the consent log. */
import { useState } from "react";
import bo from "../data/backoffice.json";
import type { DocKind } from "../engine/kyc";
import type { Order } from "../engine/orders";
import { fmtDate, inr } from "../i18n/strings";
import { consentLog } from "../services/consent";
import { loadLeads, setLeadStatus, type AppLead } from "../services/leads";
import { saveOrder } from "../services/orders";

export type Heat = "Hot" | "Warm" | "Cold";
/** Hot = top 30% of propensity scores on held-out leads, Warm = next 30%. */
const heat = (score?: number): Heat =>
  score === undefined ? "Cold" : score * 100 >= bo.thresholds.hot ? "Hot" : score * 100 >= bo.thresholds.warm ? "Warm" : "Cold";
const HEAT_TONE: Record<Heat, string> = { Hot: "out", Warm: "opt", Cold: "in" };
export const HeatTag = ({ score }: { score?: number }) => <span className={`tag heat ${HEAT_TONE[heat(score)]}`}>{heat(score)}</span>;
const pct = (v: number) => `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
const maskPhone = (p: string) => `${p.slice(0, 2)}••••••${p.slice(-2)}`;
const STAGE: Record<AppLead["stage"], string> = { quote: "Quote", kyc: "KYC", contract: "Contract", payment: "Payment" };

export function CallNext() {
  const [leads, setLeads] = useState(loadLeads);
  const open = leads.filter((l) => l.status === "open").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const mark = (id: string) => { setLeadStatus(id, "called"); setLeads(loadLeads()); };
  return (
    <section className="panel wide">
      <h2>Call next</h2>
      <p className="fine">Leads the self-serve journey couldn't close, highest propensity first. Hot = top 30% of scores, Warm = next 30%.</p>
      <h3>From the owner app ({open.length} open)</h3>
      {open.length === 0 ? <p className="empty-note">No open leads. They appear when an owner asks for an expert, gets stuck at KYC, or a first payment fails.</p> : (
        <div className="tablewrap">
          <table className="bo-table">
            <thead><tr><th>Heat</th><th>Business</th><th>Stopped at</th><th>Why</th><th className="r">Plan</th><th>Mobile</th><th /></tr></thead>
            <tbody>
              {open.map((l) => (
                <tr key={l.id}>
                  <td><HeatTag score={l.score} /><div className="fine num">{l.score !== undefined ? pct(l.score * 100) : ""}</div></td>
                  <td><b>{l.business}</b><div className="fine">{l.name ?? ""}{l.city ? ` · ${l.city}` : ""}</div></td>
                  <td>{STAGE[l.stage]}</td>
                  <td>{l.reason}</td>
                  <td className="r num">{l.monthly ? `${inr(l.monthly)}/mo` : "—"}</td>
                  <td className="num">{maskPhone(l.phone)}</td>
                  <td><button className="textbtn" onClick={() => mark(l.id)}>Mark called</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Win-back from last quarter</h3>
      <p className="fine">Top 15 of {bo.winBackPool.toLocaleString("en-IN")} dropped leads whose reason a call can fix (unreachable, no time for a visit, slow or confusing quote, paperwork).</p>
      <div className="tablewrap">
        <table className="bo-table">
          <thead><tr><th>Heat</th><th>Lead</th><th>Business</th><th>Contact</th><th>Dropped because</th><th className="r">Score</th></tr></thead>
          <tbody>
            {bo.callNext.map((c) => (
              <tr key={c.leadId}>
                <td><span className={`tag heat ${HEAT_TONE[c.label as Heat]}`}>{c.label}</span></td>
                <td className="num">{c.leadId}</td>
                <td><b>{c.business}</b><div className="fine">{c.type} · {c.city}</div></td>
                <td>{c.contact}<div className="fine">{c.language} · {c.source}</div></td>
                <td>{c.reason}<div className="fine">at {c.stage}</div></td>
                <td className="r num">{pct(c.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const DOC_NAME: Record<DocKind, string> = { gst: "GST certificate", udyam: "Udyam certificate", id: "Signatory ID", address: "Address proof" };
const FIELD_ORDER = ["gstin", "udyamNumber", "tradeName", "legalName", "name", "business", "billedTo", "designation", "constitution", "address", "city", "state", "idNumber", "validTill", "billDate"];
const FIELD_LABEL: Record<string, string> = {
  gstin: "GSTIN", udyamNumber: "Udyam no.", tradeName: "Trade name", legalName: "Legal name", name: "Name", business: "For business",
  billedTo: "Billed to", designation: "Designation", constitution: "Constitution", address: "Address", city: "City", state: "State",
  idNumber: "ID no.", validTill: "Valid till", billDate: "Bill date",
};
const CHECK_LABEL: Partial<Record<string, string>> = {
  signatory: "Signatory isn't a partner or director: needs an authorisation letter",
  pan_format: "Business PAN given instead of GST/Udyam: confirm with the tax department",
  gstin_registry: "GSTIN not active (plan doesn't need GST)",
};
const REJECT_REASONS = ["Authorisation letter from partners/directors missing", "Document photo unclear; upload again", "Details edited by the owner don't match the document"];

/** Flagged KYC files side by side, with approve / reject for a human. Identifiers stay masked. */
export function KycReview({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const queue = orders.filter((o) => o.kycStatus === "review" || (o.kyc?.edited.length && o.kycStatus !== "rejected" && !o.kyc.reviewNote));
  const [reason, setReason] = useState<Record<string, string>>({});
  const decide = (o: Order, approve: boolean) => {
    saveOrder({
      ...o, kycStatus: approve ? "verified" : "rejected",
      kyc: o.kyc && { ...o.kyc, reviewNote: approve ? "Approved by KYC team" : reason[o.id] ?? REJECT_REASONS[0] },
    });
    onChange();
  };
  return (
    <section className="panel wide">
      <h2>KYC review queue</h2>
      <p className="fine">Orders that passed the automatic checks with a note, or where the owner corrected OCR fields. Document photos aren't kept; reviewers see the extracted fields.</p>
      {queue.length === 0 ? <p className="empty-note">Nothing to review. Try specimen K05, K10 or K11-style signatories (not a partner or director), or edit a field before continuing.</p> : queue.map((o) => (
        <article key={o.id} className="review">
          <header>
            <b>{o.businessName}</b><span className="fine num"> · {o.id} · signed by {o.signatory}</span>
          </header>
          <ul className="review-flags">
            {o.kyc?.checks.filter((c) => c.status !== "pass").map((c, i) => <li key={i}><span className="tag opt">!</span>{CHECK_LABEL[c.code] ?? c.code.replace(/_/g, " ")}{c.params?.name ? ` (${c.params.name})` : ""}</li>)}
            {o.kyc?.edited.map((f) => <li key={f}><span className="tag opt">✎</span>Owner edited {DOC_NAME[f.split(".")[0] as DocKind]}: {FIELD_LABEL[f.split(".")[1]] ?? f}</li>)}
          </ul>
          <div className="side-by-side">
            {(Object.entries(o.kyc?.docs ?? {}) as [DocKind, Record<string, string>][]).map(([kind, fields]) => (
              <div key={kind} className="docbox">
                <h4>{DOC_NAME[kind]}</h4>
                <dl className="fields">
                  {FIELD_ORDER.filter((f) => fields[f]).map((f) => (
                    <div key={f}><dt>{FIELD_LABEL[f]}</dt><dd className={o.kyc?.edited.includes(`${kind}.${f}`) ? "edited-field" : undefined}>{fields[f]}</dd></div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="review-actions">
            <select className="input small" value={reason[o.id] ?? REJECT_REASONS[0]} onChange={(e) => setReason((r) => ({ ...r, [o.id]: e.target.value }))} aria-label="Reason if rejected">
              {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <button className="secondary" onClick={() => decide(o, false)}>Reject</button>
            <button className="primary" onClick={() => decide(o, true)}>Approve</button>
          </div>
        </article>
      ))}
    </section>
  );
}

export function ConsentPanel() {
  const log = consentLog();
  const phones = new Set(log.map((e) => e.phone)).size;
  return (
    <section className="panel">
      <h2>Consent log</h2>
      <p className="fine">Every consent and withdrawal, per purpose, with notice version. {phones} owner{phones === 1 ? "" : "s"} on this device.</p>
      {log.length === 0 ? <p className="empty-note">No consents recorded yet.</p> : (
        <div className="tablewrap">
          <table className="bo-table">
            <thead><tr><th>When</th><th>Mobile</th><th>Purpose</th><th>Choice</th></tr></thead>
            <tbody>
              {log.slice(0, 12).map((e, i) => (
                <tr key={i}><td className="num">{fmtDate(e.at.slice(0, 10), "en")} {e.at.slice(11, 16)}</td><td className="num">{maskPhone(e.phone)}</td>
                  <td>{e.purpose}</td><td><span className={`tag ${e.granted ? "in" : "out"}`}>{e.granted ? "Given" : "Not given"}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
