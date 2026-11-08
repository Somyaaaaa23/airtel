/**
 * Owner home after sign-in: this month's usage, services by channel, the latest order and the next bill.
 * Usage is sample data derived from the phone number; production would read it from Accel billing.
 */
import { product } from "../engine/catalogue";
import { addDays } from "../engine/kyc";
import { goLiveDay, planTasks, type Order } from "../engine/orders";
import { fmtDate, inr, t, type Key, type Lang } from "../i18n/strings";

type Channel = "internet" | "sim" | "comms" | "cloud" | "security" | "cctv";
const CHANNELS: { id: Channel; icon: string }[] = [
  { id: "internet", icon: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" },
  { id: "sim", icon: "M7 2h7l5 5v15H7zM10 12h6v6h-6z" },
  { id: "comms", icon: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" },
  { id: "cloud", icon: "M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" },
  { id: "security", icon: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" },
  { id: "cctv", icon: "M3 7l12 4-2 5L3 12zM15 11l4-1M13 16l1 4h-4" },
];

function channelOf(productId: string): Channel {
  const p = product(productId);
  if (productId === "P07" || productId === "P08") return "sim";
  if (p.category === "Connectivity") return "internet";
  if (p.category === "Communication") return "comms";
  if (p.category === "Cloud & Productivity") return "cloud";
  if (p.category === "Security") return "security";
  return "cctv";
}

/** Same numbers every time for the same phone, so the demo is repeatable. */
function sampleUsage(phone: string) {
  const d = phone.split("").map(Number);
  const sum = d.reduce((a, b) => a + b, 0);
  const quota = 75;
  const used = Math.round((18 + (sum % 37) + (d[9] ?? 0) / 10) * 10) / 10;
  return { quota, used, calls: 240 + ((sum * 37) % 900), sms: 12 + ((sum * 7) % 80), renew: 3 + (sum % 24) };
}

function Ring({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 110 110" width="118" height="118" className="usage-ring" aria-hidden="true">
      <circle cx="55" cy="55" r={r} className="ring-bg" />
      <circle cx="55" cy="55" r={r} className="ring-fg" strokeDasharray={`${c * Math.min(1, value)} ${c}`} transform="rotate(-90 55 55)" />
    </svg>
  );
}

export function Dashboard({ lang, name, phone, order, onFindPlan, onSim, onTrack, onPrivacy, onSignOut }: {
  lang: Lang; name: string; phone: string; order: Order | null;
  onFindPlan: () => void; onSim: () => void; onTrack: () => void; onPrivacy: () => void; onSignOut: () => void;
}) {
  const u = sampleUsage(phone);
  const live = order ? goLiveDay(planTasks(order)) : 0;
  const isLive = !!order && (order.simDay ?? 0) >= live;
  const owned = new Set(order?.items.map((i) => channelOf(i.productId)) ?? []);
  const status = (c: Channel): "active" | "setup" | "add" => {
    if (owned.has(c)) return isLive ? "active" : "setup";
    return c === "sim" ? "active" : "add"; // the number they signed in with is an Accel SIM
  };
  const first = name.split(" ")[0] || t(lang, "st_owner");

  return (
    <main className="dash" lang={lang}>
      <section className="dash-hello">
        <span className="eyebrow">{t(lang, "db_hello")}</span>
        <h2>{first}</h2>
        <p className="fine num">+91 {phone.slice(0, 5)} {phone.slice(5)}</p>
      </section>

      <section className="dash-card usage">
        <div className="usage-head"><h3>{t(lang, "db_usage")}</h3><span className="fine">{t(lang, "db_renew", { n: u.renew })}</span></div>
        <div className="usage-body">
          <div className="ring-wrap">
            <Ring value={u.used / u.quota} />
            <div className="ring-label"><b className="num">{u.used}</b><span>GB</span></div>
          </div>
          <dl className="usage-stats">
            <div><dt>{t(lang, "db_data")}</dt><dd className="num">{u.used} GB <small>{t(lang, "db_of", { n: u.quota })}</small></dd></div>
            <div><dt>{t(lang, "db_calls")}</dt><dd className="num">{t(lang, "db_min", { n: u.calls })}</dd></div>
            <div><dt>{t(lang, "db_sms")}</dt><dd className="num">{u.sms}</dd></div>
          </dl>
        </div>
        <p className="fine">{t(lang, "db_sample")}</p>
      </section>

      {order ? (
        <section className="dash-card order-card">
          <div className="usage-head"><h3>{t(lang, "db_order_t", { id: order.id })}</h3>
            <span className={`tag ${isLive ? "in" : "opt"}`}>{isLive ? t(lang, "db_order_live") : t(lang, "db_order_due", { date: fmtDate(addDays(order.placedOn, live), lang) })}</span></div>
          <p className="fine">{order.items.map((i) => product(i.productId).name).slice(0, 4).join(" · ")}{order.items.length > 4 ? ` +${order.items.length - 4}` : ""}</p>
          <div className="progress" aria-hidden="true"><i style={{ width: `${Math.min(100, ((order.simDay ?? 0) / Math.max(1, live)) * 100)}%` }} /></div>
          <button className="primary" onClick={onTrack}>{t(lang, "db_track")}</button>
        </section>
      ) : (
        <section className="dash-card get-online">
          <h3>{t(lang, "db_get_t")}</h3>
          <p>{t(lang, "db_get_b")}</p>
          <div className="paths">
            <button className="path primary-path" onClick={onFindPlan}><b>{t(lang, "pathFind")}</b><span>{t(lang, "pathFindSub")}</span></button>
            <button className="path" onClick={onSim}><b>{t(lang, "pathSim")}</b><span>{t(lang, "pathSimSub")}</span></button>
          </div>
        </section>
      )}

      <section className="dash-section">
        <h3>{t(lang, "db_services")}</h3>
        <p className="fine">{t(lang, "db_services_sub")}</p>
        <div className="channels">
          {CHANNELS.map((c) => {
            const s = status(c.id);
            return (
              <button key={c.id} className={`channel ch-${s}`} onClick={s === "add" ? onFindPlan : order ? onTrack : undefined} disabled={s !== "add" && !order}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.icon} /></svg>
                <b>{t(lang, `ch_${c.id}` as Key)}</b>
                <span>{s === "add" ? `+ ${t(lang, "chs_add")}` : t(lang, s === "active" ? "chs_active" : "chs_setup")}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dash-card bill">
        <div className="usage-head"><h3>{t(lang, "db_bill")}</h3></div>
        <p>{order
          ? t(lang, "db_bill_due", { amount: inr(order.monthly), date: fmtDate(addDays(order.placedOn, live + 30), lang) })
          : t(lang, "db_bill_none")}</p>
      </section>

      <div className="dash-foot">
        <button className="textbtn" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
        <button className="textbtn" onClick={onSignOut}>{t(lang, "signOut")}</button>
      </div>
    </main>
  );
}
