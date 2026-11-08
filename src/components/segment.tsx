/** Segment-aware pieces of the owner journey: who we think you are, your price, your offer, and a tool built for your kind of business. */
import { useState } from "react";
import { product } from "../engine/catalogue";
import type { SmartPrice } from "../engine/pricing";
import { JOURNEY, journeyProgress, type JourneyStep } from "../engine/journey";
import { PLAYBOOKS, segmentStats } from "../engine/segments";
import type { Profile, Segment } from "../engine/types";
import { inr, t, type Key, type Lang } from "../i18n/strings";

/** Seven steps from first question to tracking, with how many minutes of form-filling are left. Sticky at the top of each journey screen. */
export function JourneyBar({ step, lang }: { step: JourneyStep; lang: Lang }) {
  const p = journeyProgress(step);
  const at = p.number - 1;
  return (
    <nav className="journey-wrap" aria-label={t(lang, "js_status", { n: p.number, total: p.total, m: p.minutesLeft })}>
      <p className="journey-status" aria-live="polite">
        {p.minutesLeft > 0 ? t(lang, "js_status", { n: p.number, total: p.total, m: p.minutesLeft }) : t(lang, "js_status_done", { n: p.number, total: p.total })}
      </p>
      <ol className="journey">
        {JOURNEY.map((k, i) => (
          <li key={k} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}>
            <i aria-hidden="true">{i < at ? "✓" : i + 1}</i><span>{t(lang, `js_${k}` as Key)}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SegmentHero({ segment, lang, compact }: { segment: Segment; lang: Lang; compact?: boolean }) {
  const pb = PLAYBOOKS[segment];
  return (
    <section className={`seg-hero seg-${segment} ${compact ? "compact" : ""}`}>
      <span className="seg-icon" aria-hidden="true">{pb.icon}</span>
      <div>
        <b>{t(lang, `seg_${segment}` as Key)}</b>
        {!compact && <p>{t(lang, `segP_${segment}` as Key)}</p>}
        <span className="route">{t(lang, `route_${pb.route}` as Key)}</span>
      </div>
    </section>
  );
}

/** Daily / per-staff / per-site / downtime framing, chosen by the segment playbook. */
function frameLine(sp: SmartPrice, profile: Profile, lang: Lang) {
  const frame = PLAYBOOKS[profile.segment].frame;
  const perDay = sp.monthly / 30;
  if (frame === "staff") return t(lang, "sp_staff", { amount: inr(Math.max(1, Math.round(perDay / Math.max(1, profile.employees)))) });
  if (frame === "site") return t(lang, "sp_site", { amount: inr(Math.round(sp.monthly / Math.max(1, profile.sites))) });
  if (frame === "downtime") return t(lang, "sp_downtime", { amount: inr(Math.round(perDay)) });
  return t(lang, "sp_day", { amount: inr(Math.round(perDay)) });
}

function offerLines(sp: SmartPrice, segment: Segment, lang: Lang): string[] {
  const pb = PLAYBOOKS[segment];
  const out: string[] = [];
  const waived = sp.setupFull - sp.setupPayable;
  if (waived > 0) out.push(t(lang, pb.offer.setupWaive >= 1 ? "of_setup_full" : "of_setup_half", { amount: inr(waived) }));
  if (sp.launch) out.push(t(lang, "of_launch", { amount: inr(sp.launch.monthly), n: sp.launch.months }));
  if (pb.offer.firstMonthOff && sp.firstMonth < sp.monthly) out.push(t(lang, "of_first", { amount: inr(sp.firstMonth) }));
  if (sp.volumePct > 0) out.push(t(lang, "of_volume", { pct: Math.round(sp.volumePct * 100) }));
  if (sp.goLiveDays < sp.standardGoLiveDays) out.push(t(lang, "of_priority", { n: sp.goLiveDays, m: sp.standardGoLiveDays }));
  return out;
}

export function SmartPriceCard({ sp, profile, lang }: { sp: SmartPrice; profile: Profile; lang: Lang }) {
  const offers = offerLines(sp, profile.segment, lang);
  return (
    <section className="price-card" aria-label={t(lang, "sp_your")}>
      <div className="price-top">
        <div>
          <span className="eyebrow">{t(lang, "sp_standard")}</span>
          <s className="num">{inr(sp.standard)}</s>
        </div>
        <span className="save-badge">−{sp.savingPct}%</span>
      </div>
      <span className="eyebrow">{t(lang, "sp_your")}</span>
      <div className="price-big num">{inr(sp.monthly)}<small>{t(lang, "perMonth")}</small></div>
      <p className="frame">{frameLine(sp, profile, lang)}</p>
      <p className="save-line">{t(lang, "sp_save", { amount: inr(sp.savingMonthly), pct: sp.savingPct })}</p>
      {offers.length > 0 && (
        <div className="offer">
          <b>{t(lang, "of_title", { segment: t(lang, `seg_${profile.segment}` as Key) })}</b>
          <ul>{offers.map((o) => <li key={o}>{o}</li>)}</ul>
          <span className="fine">{t(lang, "of_valid")}</span>
        </div>
      )}
      <p className="fine">{t(lang, "sp_year", { amount: inr(sp.firstYear), saving: inr(sp.firstYearSaving) })}</p>
      <details className="how">
        <summary>{t(lang, "sp_how")}</summary>
        <p>{t(lang, "sp_how_body")}</p>
      </details>
    </section>
  );
}

export function Peers({ segment, lang }: { segment: Segment; lang: Lang }) {
  const s = segmentStats(segment);
  return (
    <section className="peers">
      <h3>{t(lang, "peer_t")}</h3>
      <p>{t(lang, "peer_n", { n: s.activated })}</p>
      <div className="peer-row">
        <span>{t(lang, "peer_bill", { amount: inr(s.medianBundle) })}</span>
        <span>{t(lang, "peer_top", { list: s.topProducts.slice(0, 3).map((p) => product(p.id).name).join(", ") })}</span>
      </div>
    </section>
  );
}

const PROTECTIONS = [
  { id: "P09", en: "backup internet", hi: "बैकअप इंटरनेट" },
  { id: "P20", en: "antivirus", hi: "एंटीवायरस" },
  { id: "P17", en: "cloud backup", hi: "क्लाउड बैकअप" },
  { id: "P21", en: "managed firewall", hi: "मैनेज्ड फ़ायरवॉल" },
];

/** One tool per segment, answering the question that segment's owners actually ask before buying. */
export function SegmentInsight({ profile, sp, items, lang }: { profile: Profile; sp: SmartPrice; items: string[]; lang: Lang }) {
  const [sales, setSales] = useState(15000);
  const [lossPerHour, setLossPerHour] = useState(3000);
  const [hours, setHours] = useState(12);
  const seg = profile.segment;

  if (seg === "micro") {
    const atRisk = Math.round((sales / 12) * 30);
    return (
      <section className="insight">
        <h3>{t(lang, "in_micro_t")}</h3>
        <label className="slider">
          <span>{t(lang, "in_micro_sales")}: <b className="num">{inr(sales)}</b></span>
          <input type="range" min={2000} max={100000} step={1000} value={sales} onChange={(e) => setSales(Number(e.target.value))} />
        </label>
        <p>{t(lang, "in_micro_body", { loss: inr(atRisk), cost: inr(sp.monthly) })}</p>
        <Meter value={Math.min(1, sp.monthly / Math.max(1, atRisk))} good />
        <span className="fine">{t(lang, "assumption")}</span>
      </section>
    );
  }
  if (seg === "prof") {
    const have = PROTECTIONS.filter((p) => items.includes(p.id));
    const missing = PROTECTIONS.filter((p) => !items.includes(p.id));
    return (
      <section className="insight">
        <h3>{t(lang, "in_prof_t")}</h3>
        <div className="shield-row">{PROTECTIONS.map((p) => <span key={p.id} className={items.includes(p.id) ? "on" : ""}>{lang === "hi" ? p.hi : p.en}</span>)}</div>
        <p>{t(lang, "in_prof_body", { n: have.length })} {missing.length ? t(lang, "in_prof_missing", { list: missing.map((p) => (lang === "hi" ? p.hi : p.en)).join(", ") }) : t(lang, "in_prof_all")}</p>
      </section>
    );
  }
  if (seg === "multi") {
    const sites = Math.max(1, profile.sites);
    return (
      <section className="insight">
        <h3>{t(lang, "in_multi_t", { sites })}</h3>
        <div className="consolidate">
          <div className="many">{Array.from({ length: Math.min(sites + 1, 12) }, (_, i) => <i key={i} />)}</div>
          <span aria-hidden="true">→</span>
          <div className="one"><i /></div>
        </div>
        <p>{t(lang, "in_multi_body", { vendors: sites + 1 })}</p>
        <p className="fine">{t(lang, "in_multi_waves", { waves: Math.ceil(sites / 3) })}</p>
      </section>
    );
  }
  const loss = lossPerHour * hours;
  const saved = Math.max(0, Math.round(lossPerHour * (hours - 3.6)));
  return (
    <section className="insight">
      <h3>{t(lang, "in_mfg_t")}</h3>
      <label className="slider">
        <span>{t(lang, "in_mfg_loss")}: <b className="num">{inr(lossPerHour)}</b></span>
        <input type="range" min={500} max={50000} step={500} value={lossPerHour} onChange={(e) => setLossPerHour(Number(e.target.value))} />
      </label>
      <label className="slider">
        <span>{t(lang, "in_mfg_hours")}: <b className="num">{hours}</b></span>
        <input type="range" min={1} max={48} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </label>
      <p>{t(lang, "in_mfg_body", { loss: inr(loss), saved: inr(saved) })}</p>
      <span className="fine">{t(lang, "assumption")}</span>
    </section>
  );
}

function Meter({ value, good }: { value: number; good?: boolean }) {
  return <div className={`meter ${good ? "good" : ""}`} aria-hidden="true"><i style={{ width: `${Math.max(3, value * 100)}%` }} /></div>;
}
