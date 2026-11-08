import { useState } from "react";
import { product } from "../engine/catalogue";
import { addDays } from "../engine/kyc";
import {
  dueDate, engineerFor, goLiveDay, needsVisit, planTasks, SLA_DAYS, taskStates, VISIT_DAYS, type Order, type Task, type VisitSlot,
} from "../engine/orders";
import { fmtDate, inr, t, type Key, type Lang } from "../i18n/strings";
import { saveOrder } from "../services/orders";

const SLOTS: VisitSlot[] = ["morning", "afternoon", "evening"];

function taskText(task: Task, o: Order, lang: Lang): string {
  if (task.kind === "kyc") return t(lang, o.kycStatus === "review" ? "task_kyc_review" : "task_kyc");
  if (task.kind === "engineer") return t(lang, "task_engineer", { name: engineerFor(o) });
  if (task.kind !== "service") return t(lang, `task_${task.kind}` as Key);
  const p = product(task.productId!);
  if (p.id === "P07" || p.id === "P08") return t(lang, "svc_sim", { qty: task.qty ?? 1 });
  const name = task.qty && task.qty > 1 ? `${p.name} × ${task.qty}` : p.name;
  return t(lang, `svc_${p.category}` as Key, { product: name });
}

export function Tracker({ lang, order, onChange, onNew, onPrivacy }: { lang: Lang; order: Order; onChange: (o: Order) => void; onNew: () => void; onPrivacy: () => void }) {
  const day = order.simDay ?? 0;
  const setDay = (f: (d: number) => number) => { const next = { ...order, simDay: f(day) }; onChange(next); saveOrder(next); };
  const [picking, setPicking] = useState(needsVisit(order.items) && !order.visit);
  const tasks = planTasks(order);
  const states = taskStates(tasks, day);
  const live = goLiveDay(tasks);
  const slow = order.items.map((i) => product(i.productId)).filter((p) => p.installDays > SLA_DAYS);
  const phone = `${order.phone.slice(0, 2)}••••••${order.phone.slice(-2)}`;

  const book = (visitDay: number, slot: VisitSlot) => {
    const next = { ...order, visit: { day: visitDay, slot } };
    onChange(next);
    saveOrder(next);
    setPicking(false);
  };
  const messages = [
    { day: 0, text: t(lang, "msg_placed", { id: order.id, monthly: inr(order.monthly) }) },
    ...tasks.filter((x, i) => x.kind !== "placed" && states[i] === "done").map((x) => ({ day: x.dueDay, text: t(lang, "msg_done", { task: taskText(x, order, lang) }) })),
  ].reverse();

  return (
    <main className="scroll" lang={lang}>
      <section className="order-card">
        <span className="fine num">{t(lang, "orderNo", { id: order.id })}</span>
        <h2>{order.businessName}</h2>
        <p className="golive">{t(lang, "goLiveOn", { date: fmtDate(addDays(order.placedOn, live), lang) })}</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={states.filter((s) => s === "done").length}>
          <i style={{ width: `${(states.filter((s) => s === "done").length / tasks.length) * 100}%` }} />
        </div>
        <span className="fine">{t(lang, "dayN", { n: day, date: fmtDate(addDays(order.placedOn, day), lang, true) })}</span>
      </section>

      {order.kycStatus === "review" && <div className="notice info">{t(lang, "reviewNote", { name: order.signatory ?? "" })}</div>}
      {order.kycStatus === "rejected" && <div className="notice blocked">{t(lang, "rejectedNote", { note: order.kyc?.reviewNote ?? "" })}</div>}
      {order.payment && <p className="fine paid">{t(lang, "paidNote", { amount: inr(order.payment.amount), method: order.payment.method.toUpperCase(), ref: order.payment.ref })}</p>}
      {slow.map((p) => <div key={p.id} className="notice info">{t(lang, "slaNote", { product: p.name, n: p.installDays })}</div>)}

      {needsVisit(order.items) && (picking ? (
        <section className="slot-pick">
          <h3>{t(lang, "pickSlot")}</h3>
          {VISIT_DAYS.map((d) => (
            <div key={d} className="slot-row">
              <span>{fmtDate(addDays(order.placedOn, d), lang, true)}</span>
              <div className="chips">
                {SLOTS.map((s) => (
                  <button key={s} className="chip" aria-pressed={order.visit?.day === d && order.visit.slot === s} onClick={() => book(d, s)}>{t(lang, `slot_${s}` as Key)}</button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : order.visit && (
        <div className="booked">
          <span>{t(lang, "visitBooked", { date: fmtDate(addDays(order.placedOn, order.visit.day), lang, true), slot: t(lang, `slot_${order.visit.slot}` as Key) })}</span>
          <button className="textbtn" onClick={() => setPicking(true)}>{t(lang, "changeSlot")}</button>
        </div>
      ))}

      <ol className="timeline">
        {tasks.map((task, i) => (
          <li key={task.id} className={states[i]}>
            <span className="dot" aria-hidden="true">{states[i] === "done" ? "✓" : ""}</span>
            <div>
              <b>{taskText(task, order, lang)}</b>
              <span className="fine">{fmtDate(dueDate(order, task), lang, true)} · {t(lang, `st_${states[i]}` as Key)}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="row2 sim">
        <button className="secondary" onClick={() => setDay((d) => Math.min(d + 1, live))} disabled={day >= live}>{t(lang, "simulate")} ▸</button>
        <button className="secondary" onClick={() => setDay(() => live)} disabled={day >= live}>{t(lang, "simJump")}</button>
      </div>

      <section className="updates">
        <h3>{t(lang, "updatesTitle", { phone })}</h3>
        <p className="fine">{t(lang, "noCallNeeded")}</p>
        <ul>
          {messages.map((m, i) => (
            <li key={i}><span className="fine">{fmtDate(addDays(order.placedOn, m.day), lang, true)}</span>{m.text}</li>
          ))}
        </ul>
      </section>

      <section className="consent my-accel">
        <h3>{t(lang, "myTitle")}</h3>
        <p>{t(lang, "myBill", { monthly: inr(order.monthly), date: fmtDate(addDays(order.placedOn, live + 30), lang) })}</p>
        <p>{t(lang, "mySupport")}</p>
      </section>

      <button className="secondary" onClick={onNew}>{t(lang, "newPlan")}</button>
      <button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
    </main>
  );
}
