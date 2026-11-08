/**
 * Owner workspace pages: overview, services, usage, bills, orders, support and profile.
 * Usage is sample data derived from the phone number (labelled as such); production would read Accel billing.
 * Everything else comes from orders placed in this app.
 */
import { product } from "../engine/catalogue";
import { addDays, KYC_TODAY } from "../engine/kyc";
import { goLiveDay, planTasks, type Order } from "../engine/orders";
import { Icon, IconArrow } from "../components/ui";
import type { NavKey } from "../components/OwnerShell";
import { fmtDate, inr, t, type Key, type Lang } from "../i18n/strings";
import { GRIEVANCE } from "../services/consent";

type Channel = "internet" | "sim" | "comms" | "cloud" | "security" | "cctv";
const CHANNELS: Channel[] = ["internet", "sim", "comms", "cloud", "security", "cctv"];
type Status = "active" | "setup" | "none";

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
  const renew = 3 + (sum % 24);
  return {
    quota: 75, used: Math.round((18 + (sum % 37) + (d[9] ?? 0) / 10) * 10) / 10,
    calls: 240 + ((sum * 37) % 900), sms: 12 + ((sum * 7) % 80),
    renewOn: addDays(KYC_TODAY, renew), cycleStart: addDays(KYC_TODAY, renew - 30),
  };
}

const isLive = (o: Order) => (o.simDay ?? 0) >= goLiveDay(planTasks(o));
const liveDate = (o: Order) => addDays(o.placedOn, goLiveDay(planTasks(o)));
const noYear = (d: string) => d.replace(/\s*\d{4}$/, "");
const fmtPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

export interface DashProps {
  lang: Lang; view: NavKey; name: string; phone: string; order: Order | null; orders: Order[]; canExpert: boolean;
  onNav: (k: NavKey) => void; onFindPlan: () => void; onSim: () => void; onTrack: (o: Order) => void;
  onExpert: () => void; onPrivacy: () => void; onSignOut: () => void;
}

export function Dashboard(p: DashProps) {
  const { lang, view } = p;
  return (
    <div className="dash-page" lang={lang}>
      {view === "overview" && <Overview {...p} />}
      {view === "services" && <><Head lang={lang} k="nav_services" sub="db_services_sub" /><Services {...p} detailed /></>}
      {view === "usage" && <><Head lang={lang} k="nav_usage" /><div className="dgrid"><div className="span-12"><Usage {...p} /></div></div></>}
      {view === "bills" && <Bills {...p} />}
      {view === "orders" && <Orders {...p} />}
      {view === "support" && <Support {...p} />}
      {view === "profile" && <Profile {...p} />}
    </div>
  );
}

function Head({ lang, k, sub }: { lang: Lang; k: Key; sub?: Key }) {
  return <div className="welcome-row"><div><h2>{t(lang, k)}</h2>{sub && <p>{t(lang, sub)}</p>}</div></div>;
}

function Overview(p: DashProps) {
  const { lang, name, order } = p;
  const first = name.split(" ")[0];
  return (
    <>
      <div className="welcome-row">
        <div>
          <h2>{first ? `${t(lang, "db_hello")} ${first}` : t(lang, "db_hello").replace(/,$/, "")}</h2>
          <p>{t(lang, "db_sub")}</p>
        </div>
      </div>
      <div className="dgrid">
        <div className="span-8"><Usage {...p} /></div>
        <div className="span-4"><NextBill {...p} /></div>
        <div className="span-12">{order ? <OrderCard o={order} lang={lang} onTrack={() => p.onTrack(order)} /> : <Reco {...p} />}</div>
        <section className="span-12 stack" aria-labelledby="svc-t">
          <div className="section-head">
            <div><h3 id="svc-t">{t(lang, "db_services")}</h3><p>{t(lang, "db_services_sub")}</p></div>
            <button className="link-arrow" onClick={() => p.onNav("services")}>{t(lang, "nav_services")} <IconArrow /></button>
          </div>
          <Services {...p} />
        </section>
      </div>
    </>
  );
}

function Usage({ lang, phone }: DashProps) {
  const u = sampleUsage(phone);
  const pct = Math.min(100, (u.used / u.quota) * 100);
  const left = Math.round((u.quota - u.used) * 10) / 10;
  return (
    <section className="dcard" aria-labelledby="use-t">
      <div className="dcard-head">
        <h3 id="use-t">{t(lang, "db_usage")}</h3>
        <span className="tag info">{t(lang, "db_renews_on", { date: fmtDate(u.renewOn, lang) })}</span>
      </div>
      <div className="usage-main">
        <div>
          <span className="fine">{t(lang, "db_data")}</span>
          <div className="usage-big"><b className="num">{u.used} GB</b><span>{t(lang, "db_of", { n: u.quota })}</span></div>
          <div className="meterbar" role="meter" aria-valuemin={0} aria-valuemax={u.quota} aria-valuenow={u.used} aria-label={t(lang, "db_data")}><i style={{ width: `${pct}%` }} /></div>
          <div className="meterbar-legend num"><span>{Math.round(pct)}% {t(lang, "db_used")}</span><span>{t(lang, "db_left", { n: left })}</span></div>
        </div>
        <dl className="metrics">
          <div><dt>{t(lang, "db_calls")}</dt><dd className="num">{t(lang, "db_min", { n: u.calls })}</dd></div>
          <div><dt>{t(lang, "db_sms")}</dt><dd className="num">{u.sms}</dd></div>
          <div><dt>{t(lang, "db_cycle")}</dt><dd className="num">{noYear(fmtDate(u.cycleStart, lang))} – {noYear(fmtDate(u.renewOn, lang))}</dd></div>
          <div><dt>{t(lang, "db_renews")}</dt><dd className="num">{fmtDate(u.renewOn, lang)}</dd></div>
        </dl>
      </div>
      <p className="fine">{t(lang, "db_sample")}</p>
    </section>
  );
}

function NextBill({ lang, order, onNav }: DashProps) {
  return (
    <section className="dcard fill" aria-labelledby="bill-t">
      <div className="dcard-head">
        <h3 id="bill-t">{t(lang, "db_bill")}</h3>
        {order && <span className="tag opt">{t(lang, "db_upcoming")}</span>}
      </div>
      {order ? (
        <>
          <span className="bill-amt num">{inr(order.monthly)}</span>
          <p className="fine">{t(lang, "db_bill_due", { amount: inr(order.monthly), date: fmtDate(addDays(liveDate(order), 30), lang) })}</p>
          <button className="link-arrow push" onClick={() => onNav("bills")}>{t(lang, "db_details")} <IconArrow /></button>
        </>
      ) : <div className="empty">{t(lang, "db_bill_none")}</div>}
    </section>
  );
}

function Reco({ lang, onFindPlan, onSim }: DashProps) {
  return (
    <section className="dcard reco" aria-labelledby="reco-t">
      <span className="reco-ic" aria-hidden="true"><Icon name="rocket" size={22} /></span>
      <div>
        <h3 id="reco-t">{t(lang, "db_get_t")}</h3>
        <p>{t(lang, "db_get_b")}</p>
      </div>
      <div className="reco-actions">
        <button className="secondary" onClick={onSim}>{t(lang, "pathSim")}</button>
        <button className="primary" onClick={onFindPlan}>{t(lang, "pathFind")}</button>
      </div>
    </section>
  );
}

function OrderCard({ o, lang, onTrack }: { o: Order; lang: Lang; onTrack: () => void }) {
  const live = goLiveDay(planTasks(o));
  const done = isLive(o);
  return (
    <section className="dcard order-mini" aria-label={t(lang, "db_order_t", { id: o.id })}>
      <div className="row">
        <h3>{t(lang, "db_order_t", { id: o.id })}</h3>
        <span className={`tag ${done ? "in" : "opt"}`}>{done ? t(lang, "db_order_live") : t(lang, "db_order_due", { date: fmtDate(liveDate(o), lang) })}</span>
      </div>
      <p className="fine">{o.items.map((i) => product(i.productId).name).slice(0, 4).join(" · ")}{o.items.length > 4 ? ` +${o.items.length - 4}` : ""}</p>
      <div className="progress" aria-hidden="true"><i style={{ width: `${Math.min(100, ((o.simDay ?? 0) / Math.max(1, live)) * 100)}%` }} /></div>
      <div className="row">
        <span className="fine num">{inr(o.monthly)}{t(lang, "perMonth")}</span>
        <button className="primary auto" onClick={onTrack}>{t(lang, "db_track")}</button>
      </div>
    </section>
  );
}

function Services({ lang, order, onFindPlan, onTrack, onNav, detailed }: DashProps & { detailed?: boolean }) {
  const live = order ? isLive(order) : false;
  const owned = (c: Channel) => order?.items.filter((i) => channelOf(i.productId) === c) ?? [];
  const status = (c: Channel): Status => owned(c).length ? (live ? "active" : "setup") : c === "sim" ? "active" : "none";
  return (
    <div className="services">
      {CHANNELS.map((c) => {
        const s = status(c);
        const items = owned(c);
        const action = s === "none" ? { label: t(lang, "cha_add"), run: onFindPlan }
          : s === "setup" ? { label: t(lang, "cha_track"), run: () => order && onTrack(order) }
          : items.length && order ? { label: t(lang, "cha_order"), run: () => onTrack(order) }
          : { label: t(lang, "cha_usage"), run: () => onNav("usage") };
        return (
          <article key={c} className={`svc is-${s}`}>
            <span className="svc-ic" aria-hidden="true"><Icon name={c} size={20} /></span>
            <div className="svc-top">
              <b>{t(lang, `ch_${c}` as Key)}</b>
              <span className={`status ${s}`}>{t(lang, s === "active" ? "chs_active" : s === "setup" ? "chs_setup" : "chs_none")}</span>
            </div>
            <p>{t(lang, `chd_${c}` as Key)}</p>
            {detailed && items.length > 0 && <p className="items">{t(lang, "db_includes")}: {items.map((i) => product(i.productId).name).join(", ")}</p>}
            <button className="link-arrow" onClick={action.run}>{action.label} <IconArrow /></button>
          </article>
        );
      })}
    </div>
  );
}

function Bills(p: DashProps) {
  const { lang, orders } = p;
  const paid = orders.filter((o) => o.payment);
  return (
    <>
      <Head lang={lang} k="nav_bills" />
      <div className="dgrid">
        <div className="span-5"><NextBill {...p} /></div>
        <section className="dcard span-7" aria-labelledby="pay-t">
          <h3 id="pay-t">{t(lang, "db_payments")}</h3>
          {paid.length ? (
            <ul className="list">
              {paid.map((o) => (
                <li key={o.id}>
                  <div><b className="num">{o.id}</b><div className="fine">{t(lang, "db_paid_line", { amount: inr(o.payment!.amount), method: o.payment!.method.toUpperCase(), ref: o.payment!.ref })}</div></div>
                  <span className="tag in">{fmtDate(o.placedOn, lang)}</span>
                </li>
              ))}
            </ul>
          ) : <div className="empty">{t(lang, "db_no_payments")}</div>}
        </section>
      </div>
    </>
  );
}

function Orders({ lang, orders, onTrack, onFindPlan }: DashProps) {
  return (
    <>
      <Head lang={lang} k="nav_orders" />
      {orders.length ? (
        <div className="dgrid">{orders.map((o) => <div key={o.id} className="span-6"><OrderCard o={o} lang={lang} onTrack={() => onTrack(o)} /></div>)}</div>
      ) : (
        <div className="empty">{t(lang, "db_orders_none")}<button className="primary auto" onClick={onFindPlan}>{t(lang, "pathFind")}</button></div>
      )}
    </>
  );
}

function Support({ lang, canExpert, onExpert, orders, onTrack, onNav }: DashProps) {
  return (
    <>
      <Head lang={lang} k="nav_support" />
      <div className="support-grid">
        <section className="dcard">
          <span className="svc-ic" aria-hidden="true"><Icon name="support" /></span>
          <h3>{t(lang, "su_expert_t")}</h3>
          <p className="fine">{canExpert ? t(lang, "su_expert_b") : t(lang, "su_expert_need")}</p>
          {canExpert ? <button className="primary auto push" onClick={onExpert}>{t(lang, "su_expert_t")}</button>
            : <button className="secondary auto push" onClick={() => onNav("plan")}>{t(lang, "pathFind")}</button>}
        </section>
        <section className="dcard">
          <span className="svc-ic" aria-hidden="true"><Icon name="orders" /></span>
          <h3>{t(lang, "su_track_t")}</h3>
          <p className="fine">{t(lang, "su_track_b")}</p>
          <button className="secondary auto push" onClick={() => (orders[0] ? onTrack(orders[0]) : onNav("orders"))}>{t(lang, "nav_orders")}</button>
        </section>
        <section className="dcard">
          <span className="svc-ic" aria-hidden="true"><Icon name="privacy" /></span>
          <h3>{t(lang, "su_grievance")}</h3>
          <dl className="kv"><dt>{t(lang, "pr_name")}</dt><dd>{GRIEVANCE.name}</dd><dt>Email</dt><dd>{GRIEVANCE.email}</dd><dt>{t(lang, "pr_phone")}</dt><dd className="num">{GRIEVANCE.phone}</dd></dl>
        </section>
      </div>
    </>
  );
}

function Profile({ lang, name, phone, onPrivacy, onSignOut }: DashProps) {
  return (
    <>
      <Head lang={lang} k="pr_title" />
      <div className="dgrid">
        <section className="dcard span-7">
          <dl className="kv">
            <dt>{t(lang, "pr_name")}</dt><dd>{name || t(lang, "guest")}</dd>
            <dt>{t(lang, "pr_phone")}</dt><dd className="num">{fmtPhone(phone)}</dd>
            <dt>{t(lang, "nav_language")}</dt><dd>{lang === "en" ? "English" : "हिन्दी"}</dd>
          </dl>
        </section>
        <section className="dcard span-5">
          <h3>{t(lang, "pr_consent")}</h3>
          <button className="secondary auto" onClick={onPrivacy}>{t(lang, "pr_manage")}</button>
          <button className="textbtn start-self" onClick={onSignOut}>{t(lang, "signOut")}</button>
        </section>
      </div>
    </>
  );
}
