import { useEffect, useMemo, useRef, useState } from "react";
import { blockText, businessLabel, needLabel, noteText, pName, summarise } from "../advisor/explain";
import {
  ALL_NEEDS, COUNT_CHIPS, EMPLOYEE_CHIPS, INTERNET_CHIPS, mergeExtracted, NEED_ORDER, NET_NONE, nextStep, OTHER_PREFIX, segmentOf,
  SITE_CHIPS, SPEED_CHIPS, SPEND_CHIPS, toProfile, type Draft, type Step,
} from "../advisor/flow";
import { BUSINESS_TYPES, CITIES, QUICK_TYPES } from "../data/reference";
import { maskId } from "../engine/gstin";
import { computeQuote } from "../engine/quote";
import { defaultPlan, recommend } from "../engine/recommend";
import type { Need, Profile, Recommendation, SpeedPref } from "../engine/types";
import { inr, t, type Key, type Lang } from "../i18n/strings";
import { checkFeasibility, isValidPincode } from "../services/feasibility";
import { extract } from "../services/nlu";
import { lookupGstin } from "../services/registry";
import { IconSend } from "../components/ui";
import { SegmentHero } from "../components/segment";
import { smartPrice } from "../engine/pricing";

type Render = (lang: Lang) => string;
interface Msg { id: number; from: "bot" | "user"; render: Render; tone?: "ok" | "warn"; rec?: { profile: Profile; rec: Recommendation } }

const QUESTION: Partial<Record<Step, Key>> = {
  business: "q_business", employees: "q_employees", sites: "q_sites", city: "q_city", gstin: "q_gstin",
  gstin_type: "q_gstin_type", internet: "q_internet", spend: "q_spend", needs: "q_needs", speed: "q_speed",
  lines: "q_lines", cameras: "q_cameras", vehicles: "q_vehicles", machines: "q_machines", pincode: "q_pincode",
};
const STATUS_HI: Record<string, string> = { Cancelled: "रद्द", Suspended: "निलंबित" };
const COUNT_STEPS = ["employees", "sites", "lines", "cameras", "vehicles", "machines"] as const;

export function Advisor({ lang, initialText, onQuote }: { lang: Lang; initialText?: string; onQuote: (p: Profile, r: Recommendation) => void }) {
  const [draft, setDraft] = useState<Draft>({ preNeeds: [] });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Need[]>([]);
  const [moreNeeds, setMoreNeeds] = useState(false);
  const [nets, setNets] = useState<string[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const idRef = useRef(0);
  const asked = useRef<string>("");
  const chatRef = useRef<HTMLDivElement>(null);
  const step = nextStep(draft);
  const segment = segmentOf(draft);

  const say = (from: Msg["from"], render: Render, extra: Partial<Msg> = {}) =>
    setMsgs((m) => [...m, { id: ++idRef.current, from, render, ...extra }]);
  const bot = (key: Key, params: Record<string, string | number> = {}, tone?: Msg["tone"]) => say("bot", (l) => t(l, key, params), { tone });
  const user = (text: string | Render) => say("user", typeof text === "string" ? () => text : text);

  // Ask the next question whenever the step changes; at the end, show the recommendation.
  useEffect(() => {
    if (busy || asked.current === step) return;
    asked.current = step;
    if (step === "needs") { setPicked(draft.preNeeds); setMoreNeeds(false); }
    if (step === "internet") { setNets([]); setOtherOpen(false); setOtherText(""); }
    if (step === "pincode" && draft.pincode) { void runPincode(draft.pincode); return; }
    if (step === "done") {
      const profile = toProfile(draft);
      const rec = recommend(profile);
      say("bot", (l) => t(l, "r_ready", { business: businessLabel(draft.businessTypeId, l) }), { rec: { profile, rec } });
      return;
    }
    const q = QUESTION[step];
    if (q) bot(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, busy]);

  // Runs once: a demo business arrives as the owner's first typed message.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialText) void handleText(initialText); }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); }, [msgs, step]);

  async function runGstin(gstin: string, base: Draft) {
    setBusy(true);
    const res = await lookupGstin(gstin);
    const masked = maskId(gstin.toUpperCase());
    let next: Draft = base;
    if (res.result === "invalid_format") {
      const errKey = `gstErr_${res.error}` as Key;
      say("bot", (l) => t(l, "r_gstin_invalid", { reason: t(l, errKey) }), { tone: "warn" });
      next = { ...base, gst: "awaiting" };
      asked.current = "gstin_type"; // the error message already re-asks
    } else if (res.result === "not_found") {
      bot("r_gstin_notfound", { masked }, "warn");
      next = { ...base, gst: "NotFound", gstin };
    } else if (res.record.status === "Active") {
      bot("r_gstin_active", { name: res.record.tradeName, masked }, "ok");
      next = { ...base, gst: "Active", gstin, legalName: res.record.legalName };
    } else {
      const status = res.record.status;
      say("bot", (l) => t(l, "r_gstin_inactive", { masked, status: l === "hi" ? STATUS_HI[status] : status.toLowerCase() }), { tone: "warn" });
      next = { ...base, gst: status, gstin };
    }
    setDraft(next);
    setBusy(false);
  }

  async function runPincode(pin: string) {
    setBusy(true);
    const f = await checkFeasibility(pin);
    bot(f.fibre ? "r_fibre_ok" : "r_fibre_no", { pin }, f.fibre ? "ok" : "warn");
    setDraft((d) => ({ ...d, pincode: pin, fibreFeasible: f.fibre }));
    setBusy(false);
  }

  async function handleText(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    // On the internet question, typed text is one more "Other" answer; Done sends them all.
    if (nextStep(draft) === "internet") { addOther(text); setInput(""); return; }
    user(text);
    setInput("");
    const cur = nextStep(draft);

    if (cur === "gstin_type") return runGstin(text.replace(/\s/g, ""), draft);
    if (cur === "pincode") {
      const pin = text.match(/[1-9]\d{5}/)?.[0];
      if (!pin || !isValidPincode(pin)) return bot("r_pin_invalid");
      return runPincode(pin);
    }

    const e = extract(text);
    let d = mergeExtracted(draft, e);
    const plainNumber = /^\d[\d,]*$/.test(text) ? Number(text.replace(/,/g, "")) : undefined;
    if (plainNumber !== undefined) {
      if ((COUNT_STEPS as readonly string[]).includes(cur)) d = { ...d, [cur]: Math.max(1, plainNumber) };
      if (cur === "spend") d = { ...d, monthlySpend: plainNumber };
    }
    if (cur === "city" && d.tier === undefined && /\p{L}{3,}/u.test(text)) {
      d = { ...d, tier: 2 };
      bot("r_otherCity");
    }
    if (cur === "needs") setPicked((p) => [...new Set([...p, ...e.needs])]);
    if (e.pincode) d = { ...d, pincode: e.pincode };

    const fields = summarise(e, "en");
    const changed = JSON.stringify(d) !== JSON.stringify(draft) || e.needs.length > 0;
    if (!changed) return bot("r_notUnderstood");
    if (fields && plainNumber === undefined) say("bot", (l) => t(l, "r_understood", { summary: summarise(e, l) }));
    if (e.gstin && (d.gst === undefined || d.gst === "awaiting")) return runGstin(e.gstin, d);
    setDraft(d);
  }

  function choose(label: string | Render, update: Partial<Draft>, after?: () => void) {
    if (busy) return;
    user(label);
    after?.();
    setDraft((d) => ({ ...d, ...update }));
  }

  const chips = useMemo(() => {
    const L = (k: Key) => (l: Lang) => t(l, k);
    switch (step) {
      case "business":
        return QUICK_TYPES.map((id) => {
          const b = BUSINESS_TYPES.find((x) => x.id === id)!;
          return { key: id, label: lang === "hi" ? b.hi : b.en, act: () => choose((l) => (l === "hi" ? b.hi : b.en), { businessTypeId: id }) };
        });
      case "employees": return EMPLOYEE_CHIPS.map(([label, v]) => ({ key: label, label, act: () => choose(label, { employees: v }) }));
      case "sites": return SITE_CHIPS.map(([label, v]) => ({ key: label, label, act: () => choose(label, { sites: v }) }));
      case "city":
        return [...CITIES.map((c) => ({ key: c.city, label: lang === "hi" ? c.hi ?? c.city : c.city, act: () => choose((l) => (l === "hi" ? c.hi ?? c.city : c.city), { city: c.city, tier: c.tier }) })),
          { key: "other", label: t(lang, "otherCity"), act: () => choose(L("otherCity"), { tier: 2 }, () => bot("r_otherCity")) }];
      case "gstin":
        return [
          { key: "type", label: t(lang, "gst_type"), act: () => choose(L("gst_type"), { gst: "awaiting" }) },
          { key: "later", label: t(lang, "gst_later"), act: () => choose(L("gst_later"), { gst: "later" }, () => bot("r_gstin_later")) },
          { key: "none", label: t(lang, "gst_none"), act: () => choose(L("gst_none"), { gst: "none" }, () => bot("r_no_gst")) },
        ];
      case "gstin_type":
        return [{ key: "none", label: t(lang, "gst_none"), act: () => choose(L("gst_none"), { gst: "none" }, () => bot("r_no_gst")) }];
      case "spend": return SPEND_CHIPS.map(([label, v]) => ({ key: label, label, act: () => choose(label, { monthlySpend: v }) }));
      case "speed": return SPEED_CHIPS.map((s: SpeedPref) => ({ key: s, label: t(lang, `speed_${s}` as Key), act: () => choose(L(`speed_${s}` as Key), { speedPref: s }) }));
      case "lines": case "cameras": case "vehicles": case "machines":
        return COUNT_CHIPS[step].map((n) => ({ key: String(n), label: String(n), act: () => choose(String(n), { [step]: n }) }));
      default: return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lang, busy]);

  const netLabel = (k: string, l: Lang) => (k.startsWith(OTHER_PREFIX) ? k.slice(OTHER_PREFIX.length) : t(l, k as Key));
  const toggleNet = (k: string) => setNets((n) => {
    if (n.includes(k)) return n.filter((x) => x !== k);
    return k === NET_NONE ? [NET_NONE] : [...n.filter((x) => x !== NET_NONE), k];
  });
  function addOther(text: string) {
    const v = text.trim().replace(/\s+/g, " ").slice(0, 60);
    if (v) setNets((n) => [...new Set([...n.filter((x) => x !== NET_NONE), OTHER_PREFIX + v])]);
    setOtherText("");
    setOtherOpen(false);
  }
  const confirmNets = () => {
    const chosen = nets;
    choose((l) => chosen.map((k) => netLabel(k, l)).join(", "), { currentInternet: chosen });
  };

  const needList = moreNeeds ? [...NEED_ORDER[segment], ...ALL_NEEDS.filter((n) => !NEED_ORDER[segment].includes(n))] : NEED_ORDER[segment];
  const needsVisible = [...needList, ...picked.filter((p) => !needList.includes(p))];
  const confirmNeeds = () => {
    const chosen = picked;
    choose((l) => chosen.map((n) => needLabel(n, l)).join(", "), { needs: chosen });
  };

  return (
    <>
      {draft.businessTypeId && (
        <div className="profile-strip" lang={lang}>
          <SegmentHero segment={segment} lang={lang} compact />
          <div className="facts-strip" aria-label={t(lang, "building")}>
            {draft.city && <span>{lang === "hi" ? CITIES.find((c) => c.city === draft.city)?.hi ?? draft.city : draft.city}</span>}
            {draft.employees !== undefined && <span>{t(lang, "people", { n: draft.employees })}</span>}
            {draft.sites !== undefined && <span>{draft.sites === 1 ? t(lang, "site_1") : t(lang, "sites_n", { n: draft.sites })}</span>}
            {draft.gst && draft.gst !== "awaiting" && <span>{draft.gst === "Active" || draft.gst === "later" ? t(lang, "hasGst") : t(lang, "noGst")}</span>}
            {draft.monthlySpend !== undefined && <span className="num">{inr(draft.monthlySpend)}{t(lang, "perMonth")}</span>}
            {(draft.needs ?? draft.preNeeds).length > 0 && <span>{(draft.needs ?? draft.preNeeds).length} ✓</span>}
          </div>
        </div>
      )}
      <div className="chat" ref={chatRef} aria-live="polite" lang={lang}>
        {msgs.map((m) => m.rec ? (
          <div key={m.id} style={{ display: "contents" }}>
            <div className="msg bot">{m.render(lang)}</div>
            <RecCard lang={lang} {...m.rec} onQuote={() => onQuote(m.rec!.profile, m.rec!.rec)} />
          </div>
        ) : (
          <div key={m.id} className={`msg ${m.from} ${m.tone ?? ""}`}>{m.render(lang)}</div>
        ))}
        {busy && <div className="typing">…</div>}
      </div>
      {step !== "done" && (
        <div className="dock" lang={lang}>
          {step === "internet" ? (
            <>
              <div className="chips" role="group" aria-label={t(lang, "q_internet")}>
                {INTERNET_CHIPS.map((k) => (
                  <button key={k} className="chip" aria-pressed={nets.includes(k)} onClick={() => toggleNet(k)}>{t(lang, k)}</button>
                ))}
                {nets.filter((k) => k.startsWith(OTHER_PREFIX)).map((k) => (
                  <button key={k} className="chip" aria-pressed onClick={() => toggleNet(k)} title={t(lang, "remove")}>{netLabel(k, lang)} ✕</button>
                ))}
                {!otherOpen && <button className="chip more" onClick={() => setOtherOpen(true)}>{t(lang, "net_other")}</button>}
              </div>
              {otherOpen && (
                <div className="compose other-row">
                  <label className="vh" htmlFor="net-other">{t(lang, "net_other_ph")}</label>
                  <input id="net-other" className="input" autoFocus value={otherText} placeholder={t(lang, "net_other_ph")}
                    onChange={(e) => setOtherText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(otherText); } }} />
                  <button className="chip" onClick={() => addOther(otherText)} disabled={!otherText.trim()}>{t(lang, "net_add")}</button>
                </div>
              )}
              <button className="primary" disabled={!nets.length || busy} onClick={confirmNets}>{t(lang, "done")}{nets.length ? ` · ${nets.length}` : ""}</button>
            </>
          ) : step === "needs" ? (
            <>
              <div className="chips" role="group" aria-label={t(lang, "q_needs")}>
                {needsVisible.map((n) => (
                  <button key={n} className="chip" aria-pressed={picked.includes(n)}
                    onClick={() => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))}>{needLabel(n, lang)}</button>
                ))}
                {!moreNeeds && <button className="chip more" onClick={() => setMoreNeeds(true)}>{lang === "hi" ? "और विकल्प" : "More options"}</button>}
              </div>
              <button className="primary" disabled={!picked.length} onClick={confirmNeeds}>{t(lang, "done")}{picked.length ? ` · ${picked.length}` : ""}</button>
            </>
          ) : chips.length > 0 && (
            <div className="chips">{chips.map((c) => <button key={c.key} className="chip" onClick={c.act} disabled={busy}>{c.label}</button>)}</div>
          )}
          <form className="compose" onSubmit={(e) => { e.preventDefault(); void handleText(input); }}>
            <label className="vh" htmlFor="chat-input">{t(lang, "placeholder")}</label>
            <input id="chat-input" className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t(lang, "placeholder")} autoComplete="off" />
            <button className="send" type="submit" disabled={!input.trim() || busy} aria-label={t(lang, "send")}><IconSend /></button>
          </form>
        </div>
      )}
    </>
  );
}

function RecCard({ lang, profile, rec, onQuote }: { lang: Lang; profile: Profile; rec: Recommendation; onQuote: () => void }) {
  const key = defaultPlan(rec, profile);
  const plan = rec.plans.find((p) => p.key === key)!;
  const q = computeQuote(plan.items);
  const sp = smartPrice(plan.items, profile);
  return (
    <section className="rec" aria-label={t(lang, "plan_recommended")}>
      <h3>{t(lang, key === "starter" ? "plan_starter" : "plan_recommended")}</h3>
      {q.lines.map((l) => (
        <div className="recline" key={l.product.id}>
          <span className="n">{l.product.name}{l.qty > 1 ? ` × ${l.qty}` : ""}</span>
          <span className="num">{inr(l.monthly)}</span>
        </div>
      ))}
      {rec.notes.map((n, i) => <div key={i} className="notice info">{noteText(n, lang)}</div>)}
      {rec.blocked.length > 0 && (
        <div className="notice blocked">
          <strong>{t(lang, "notIncluded")}</strong>
          <ul>{rec.blocked.map((b) => <li key={b.productId}>{pName(b.productId)}: {b.blocks.map((x) => blockText(x, lang)).join("; ")}{b.alternative ? `. ${t(lang, "insteadAdded", { product: pName(b.alternative) })}` : ""}</li>)}</ul>
          {rec.blocked.some((b) => b.blocks.some((x) => x.code === "gstin")) && <span>{t(lang, "gstTip")}</span>}
        </div>
      )}
      <div className="total">
        <span>{t(lang, "sp_your")}</span>
        <span className="rec-price"><s className="num">{inr(sp.standard)}</s> <b className="num">{inr(sp.monthly)}</b></span>
      </div>
      {profile.monthlySpend ? <p className="fine" style={{ margin: 0 }}>{t(lang, "vsSpend", { cur: inr(profile.monthlySpend) })}</p> : null}
      <button className="primary" onClick={onQuote}>{t(lang, "seeQuote")}</button>
    </section>
  );
}
