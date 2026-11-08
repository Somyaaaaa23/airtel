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
  /** How far the plan journey has got, and a way back into it. */
  progress: { rec: boolean; quote: boolean; kyc: boolean; signed: boolean }; onContinue: () => void;
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

type StepKey = "signin" | "plan" | "quote" | "kyc" | "sign" | "pay" | "install" | "live";
const STEP_ICON: Record<StepKey, string> = { signin: "profile", plan: "plan", quote: "bills", kyc: "privacy", sign: "comms", pay: "bills", install: "orders", live: "internet" };

function steps(p: DashProps): { key: StepKey; done: boolean }[] {
  const o = p.order;
  const tasks = o ? planTasks(o) : [];
  const day = o?.simDay ?? 0;
  const installed = !!o && tasks.length > 1 && day >= tasks[tasks.length - 2].dueDay;
  const pr = p.progress;
  return [
    { key: "signin", done: true },
    { key: "plan", done: pr.rec || pr.quote || !!o },
    { key: "quote", done: pr.quote || !!o },
    { key: "kyc", done: pr.kyc || !!o },
    { key: "sign", done: pr.signed || !!o },
    { key: "pay", done: !!o },
    { key: "install", done: installed },
    { key: "live", done: !!o && isLive(o) },
  ];
}

function Overview(p: DashProps) {
  const { lang, name, phone, order } = p;
  const first = name.split(" ")[0];
  const u = sampleUsage(phone);
  const st = steps(p);
  const doneOf = (keys: StepKey[]) => keys.every((k) => st.find((x) => x.key === k)!.done);
  const phases: { label: string; keys: StepKey[]; grow: number }[] = [
    { label: t(lang, "j_plan"), keys: ["plan", "quote"], grow: 1 },
    { label: t(lang, "j_verify"), keys: ["kyc", "sign", "pay"], grow: 1.2 },
    { label: t(lang, "ns_install"), keys: ["install"], grow: 2.2 },
    { label: t(lang, "j_live"), keys: ["live"], grow: 0.9 },
  ];
  const firstOpen = phases.findIndex((ph) => !doneOf(ph.keys));
  return (
    <>
      <header className="hello">
        <div className="hello-left">
          <h2>{first ? `${t(lang, "db_hello")} ${first}` : t(lang, "db_hello").replace(/,$/, "")}</h2>
          <div className="phase-row" aria-label={t(lang, "ns_setup")}>
            {phases.map((ph, i) => {
              const state = i < firstOpen || firstOpen === -1 ? "done" : i === firstOpen ? "now" : "todo";
              return (
                <div key={ph.label} className="phase" style={{ flexGrow: ph.grow }}>
                  <span className="phase-label">{ph.label}</span>
                  <span className={`phase-pill ${state} ${i === 2 && state === "todo" ? "striped" : ""}`}>
                    {state === "done" ? "✓" : state === "now" ? t(lang, "ns_now") : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <dl className="hello-kpis">
          <div><dt><Icon name="internet" size={14} />{t(lang, "db_data")}</dt><dd className="num">{Math.round(u.used)}<small>GB</small></dd></div>
          <div><dt><Icon name="comms" size={14} />{t(lang, "db_calls")}</dt><dd className="num">{u.calls}<small>min</small></dd></div>
          <div><dt><Icon name="sim" size={14} />{t(lang, "db_sms")}</dt><dd className="num">{u.sms}</dd></div>
        </dl>
      </header>

      <div className="bento">
        <ProfileTile {...p} />
        <WeekTile {...p} />
        <CycleTile {...p} />
        <div className="bento-col">
          <SetupTile {...p} st={st} />
          <StepsTile {...p} st={st} />
        </div>
        <ServicesTile {...p} />
        <div className="bento-wide">{order ? <ScheduleTile o={order} lang={lang} onTrack={() => p.onTrack(order)} /> : <RecoTile {...p} />}</div>
      </div>
      <p className="fine bento-note">{t(lang, "db_sample")}</p>
    </>
  );
}

function ProfileTile({ lang, name, phone, order }: DashProps) {
  const initials = (name || "G").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <section className="tile tile-profile" aria-label={t(lang, "nav_profile")}>
      <i className="blob pb1" aria-hidden="true" /><i className="blob pb2" aria-hidden="true" />
      <span className="big-initials" aria-hidden="true">{initials}</span>
      <div className="profile-foot">
        <div><b>{name || t(lang, "guest")}</b><span className="num">{fmtPhone(phone)}</span></div>
        <span className="glass-pill num">{order ? `${inr(order.monthly)}${t(lang, "perMonth")}` : t(lang, "tl_noplan")}</span>
      </div>
    </section>
  );
}

/** Sample daily data for the current week; days after today are shown as stubs. */
function WeekTile({ lang, phone, onNav }: DashProps) {
  const sum = phone.split("").map(Number).reduce((a, b) => a + b, 0);
  const today = new Date(`${KYC_TODAY}T00:00:00`).getDay();
  const days = Array.from({ length: 7 }, (_, i) => Math.round((0.5 + (((sum + 3) * (i + 5)) % 19) / 10) * 10) / 10);
  const week = Math.round(days.slice(0, today + 1).reduce((a, b) => a + b, 0) * 10) / 10;
  const max = Math.max(...days);
  const letters = lang === "hi" ? ["र", "सो", "मं", "बु", "गु", "शु", "श"] : ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <section className="tile" aria-labelledby="wk-t">
      <div className="tile-head"><h3 id="wk-t">{t(lang, "tl_week")}</h3><button className="roundbtn sm" onClick={() => onNav("usage")} aria-label={t(lang, "nav_usage")}>↗</button></div>
      <div className="tile-big"><b className="num">{week}</b><span>GB<br />{t(lang, "db_used")}</span></div>
      <div className="week" role="img" aria-label={`${t(lang, "tl_week")}: ${week} GB`}>
        {days.map((v, i) => (
          <div key={i} className={`wk ${i === today ? "today" : i > today ? "future" : ""}`}>
            {i === today && <span className="wk-tip num">{v} GB</span>}
            <i style={{ height: i > today ? "10%" : `${Math.max(12, (v / max) * 100)}%` }} />
            <span>{letters[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CycleTile({ lang, phone, onNav }: DashProps) {
  const u = sampleUsage(phone);
  const total = 30;
  const day = Math.max(1, total - Math.round((new Date(`${u.renewOn}T00:00:00`).getTime() - new Date(`${KYC_TODAY}T00:00:00`).getTime()) / 864e5));
  const r = 54, c = 2 * Math.PI * r;
  return (
    <section className="tile" aria-labelledby="cy-t">
      <div className="tile-head"><h3 id="cy-t">{t(lang, "tl_cycle")}</h3><button className="roundbtn sm" onClick={() => onNav("bills")} aria-label={t(lang, "nav_bills")}>↗</button></div>
      <div className="cycle">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            return <line key={i} x1={70 + Math.cos(a) * 64} y1={70 + Math.sin(a) * 64} x2={70 + Math.cos(a) * 68} y2={70 + Math.sin(a) * 68} className="tick" />;
          })}
          <circle cx="70" cy="70" r={r} className="cyc-bg" />
          <circle cx="70" cy="70" r={r} className="cyc-fg" strokeDasharray={`${(c * day) / total} ${c}`} transform="rotate(-90 70 70)" />
        </svg>
        <div className="cycle-label"><b className="num">{t(lang, "tl_day", { n: day })}</b><span>{t(lang, "tl_of", { n: total })}</span></div>
      </div>
      <div className="tile-foot"><span className="fine">{t(lang, "db_renews_on", { date: fmtDate(u.renewOn, lang) })}</span></div>
    </section>
  );
}

function SetupTile({ lang, st }: DashProps & { st: { key: StepKey; done: boolean }[] }) {
  const done = st.filter((x) => x.done).length;
  const pct = Math.round((done / st.length) * 100);
  const nowPct = done < st.length ? Math.round(100 / st.length) : 0;
  return (
    <section className="tile" aria-labelledby="su-t">
      <div className="tile-head"><h3 id="su-t">{t(lang, "ns_setup")}</h3><b className="pct num">{pct}%</b></div>
      <div className="seg3">
        <div style={{ flexGrow: Math.max(pct, 8) }}><span className="num">{pct}%</span><i className="a" /></div>
        {nowPct > 0 && <div style={{ flexGrow: Math.max(nowPct, 14) }}><span className="num">{nowPct}%</span><i className="b" /></div>}
        <div style={{ flexGrow: Math.max(100 - pct - nowPct, 8) }}><span className="num">{Math.max(0, 100 - pct - nowPct)}%</span><i className="c" /></div>
      </div>
    </section>
  );
}

function StepsTile({ lang, st, onContinue, onFindPlan, order, onTrack }: DashProps & { st: { key: StepKey; done: boolean }[] }) {
  const done = st.filter((x) => x.done).length;
  const next = st.findIndex((x) => !x.done);
  const go = () => (order ? onTrack(order) : st[1].done ? onContinue() : onFindPlan());
  return (
    <section className="tile tile-dark" aria-labelledby="ns-t">
      <div className="tile-head"><h3 id="ns-t">{t(lang, "ns_title")}</h3><b className="pct num">{done}/{st.length}</b></div>
      <ol className="steps">
        {st.map((x, i) => (
          <li key={x.key} className={x.done ? "done" : i === next ? "next" : ""}>
            <span className="st-ic" aria-hidden="true"><Icon name={STEP_ICON[x.key]} size={15} /></span>
            <span className="st-name">{t(lang, `ns_${x.key}` as Key)}</span>
            {i === next ? <button className="st-go" onClick={go}>{t(lang, "ns_go")} →</button>
              : <span className={`st-dot ${x.done ? "on" : ""}`} aria-label={x.done ? "✓" : ""}>{x.done ? "✓" : ""}</span>}
          </li>
        ))}
      </ol>
      {next === -1 && <p className="fine">{t(lang, "ns_done")}</p>}
    </section>
  );
}

function ServicesTile({ lang, order, onFindPlan, onTrack, onNav }: DashProps) {
  const live = order ? isLive(order) : false;
  const owned = (c: Channel) => order?.items.filter((i) => channelOf(i.productId) === c) ?? [];
  return (
    <section className="tile" aria-labelledby="sv-t">
      <div className="tile-head"><h3 id="sv-t">{t(lang, "tl_services")}</h3><button className="roundbtn sm" onClick={() => onNav("services")} aria-label={t(lang, "nav_services")}>↗</button></div>
      <div className="acc">
        {CHANNELS.map((c) => {
          const items = owned(c);
          const s: Status = items.length ? (live ? "active" : "setup") : c === "sim" ? "active" : "none";
          return (
            <details key={c} className="acc-row">
              <summary>
                <span className="acc-ic" aria-hidden="true"><Icon name={c} size={16} /></span>
                <span className="acc-name">{t(lang, `ch_${c}` as Key)}</span>
                <span className={`status ${s}`}>{t(lang, s === "active" ? "chs_active" : s === "setup" ? "chs_setup" : "chs_none")}</span>
              </summary>
              <p>{items.length ? items.map((i) => product(i.productId).name).join(", ") : t(lang, `chd_${c}` as Key)}</p>
              <button className="link-arrow" onClick={s === "none" ? onFindPlan : order && items.length ? () => onTrack(order) : () => onNav("usage")}>
                {s === "none" ? t(lang, "cha_add") : s === "setup" ? t(lang, "cha_track") : items.length ? t(lang, "cha_order") : t(lang, "cha_usage")} <IconArrow />
              </button>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleTile({ o, lang, onTrack }: { o: Order; lang: Lang; onTrack: () => void }) {
  const tasks = planTasks(o).filter((x) => x.kind !== "service" && x.kind !== "engineer");
  const day = o.simDay ?? 0;
  return (
    <section className="tile" aria-labelledby="sc-t">
      <div className="tile-head"><h3 id="sc-t">{t(lang, "tl_schedule")}</h3><span className="tag info num">{o.id}</span></div>
      <ol className="sched">
        {tasks.map((x) => (
          <li key={x.id} className={x.dueDay <= day ? "done" : ""}>
            <span className="num">{fmtDate(addDays(o.placedOn, x.dueDay), lang)}</span>
            <b>{t(lang, (x.kind === "kyc" && o.kycStatus === "review" ? "task_kyc_review" : `task_${x.kind}`) as Key)}</b>
          </li>
        ))}
      </ol>
      <button className="primary auto start-self" onClick={onTrack}>{t(lang, "db_track")}</button>
    </section>
  );
}

function RecoTile({ lang, onFindPlan, onSim }: DashProps) {
  return (
    <section className="tile tile-reco" aria-labelledby="rc-t">
      <i className="blob rb1" aria-hidden="true" />
      <div className="reco-copy">
        <h3 id="rc-t">{t(lang, "db_get_t")}</h3>
        <p>{t(lang, "db_get_b")}</p>
        <div className="reco-actions">
          <button className="primary" onClick={onFindPlan}>{t(lang, "pathFind")}</button>
          <button className="secondary" onClick={onSim}>{t(lang, "pathSim")}</button>
        </div>
      </div>
    </section>
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
