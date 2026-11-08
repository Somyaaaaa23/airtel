import { useState } from "react";
import { businessLabel } from "./advisor/explain";
import { Bar, IconSpark, LangToggle } from "./components/ui";
import { DEMOS } from "./data/demos";
import { KYC_TODAY, type KycResult } from "./engine/kyc";
import { orderId, type Order } from "./engine/orders";
import { computeQuote } from "./engine/quote";
import { smartPrice } from "./engine/pricing";
import { PLAYBOOKS } from "./engine/segments";
import { JourneyBar } from "./components/segment";
import type { Profile, Recommendation } from "./engine/types";
import { t, type Key, type Lang } from "./i18n/strings";
import { Advisor } from "./screens/Advisor";
import { AdminLogin } from "./screens/AdminLogin";
import { BackOffice } from "./screens/BackOffice";
import { Consent } from "./screens/Consent";
import { Contract, type Signed } from "./screens/Contract";
import { Dashboard } from "./screens/Dashboard";
import { Expert } from "./screens/End";
import { Kyc, type KycSnapshot } from "./screens/Kyc";
import { Payment, type Paid } from "./screens/Payment";
import { Privacy } from "./screens/Privacy";
import { Quote, type QuoteResult } from "./screens/Quote";
import { SimQuick } from "./screens/SimQuick";
import { Start } from "./screens/Start";
import { Tracker } from "./screens/Tracker";
import { Welcome } from "./screens/Welcome";
import { currentConsent, PURPOSES } from "./services/consent";
import { convertLead, saveLead, type LeadStage } from "./services/leads";
import { scoreProfile } from "./services/leadScore";
import { loadOrders, saveOrder } from "./services/orders";

type Screen = "start" | "adminLogin" | "dashboard" | "welcome" | "advisor" | "sim" | "quote" | "expert" | "consent" | "kyc" | "contract" | "payment" | "track" | "privacy" | "backoffice";

/** Screen to return to with the back arrow. */
const BACK: Partial<Record<Screen, Screen>> = {
  welcome: "start", advisor: "dashboard", sim: "dashboard", track: "dashboard", quote: "advisor", expert: "quote", consent: "quote", kyc: "quote", contract: "kyc", payment: "contract",
};
/** Step of the six-step journey bar each screen belongs to. */
const JOURNEY_STEP: Partial<Record<Screen, number>> = { advisor: 0, sim: 0, quote: 1, expert: 1, consent: 2, kyc: 2, contract: 3, payment: 4, track: 5 };
const TITLE: Partial<Record<Screen, Key>> = {
  dashboard: "myTitle", advisor: "advisorTitle", sim: "simTitle", quote: "quoteTitle", consent: "cs_title", kyc: "kycTitle", contract: "ctTitle",
  payment: "payTitle", track: "trackTitle", privacy: "pv_title",
};

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [screen, setScreen] = useState<Screen>("start");
  const [phone, setPhone] = useState("9876543210");
  const [applicant, setApplicant] = useState("");
  const [fromSim, setFromSim] = useState(false);
  const [run, setRun] = useState({ key: 0, text: undefined as string | undefined });
  const [rec, setRec] = useState<{ profile: Profile; rec: Recommendation } | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [kyc, setKyc] = useState<{ result: KycResult; snap: KycSnapshot } | null>(null);
  const [signed, setSigned] = useState<Signed | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [privacyFrom, setPrivacyFrom] = useState<Screen>("start");
  const [admin, setAdmin] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  const go = (s: Screen) => { setScreen(s); setSheet(false); window.scrollTo(0, 0); };
  const openPrivacy = () => { setPrivacyFrom(screen); go("privacy"); };
  const startDemo = (text: string) => {
    setRun((r) => ({ key: r.key + 1, text }));
    setFromSim(false);
    go("advisor");
  };
  const restart = () => { setRun((r) => ({ key: r.key + 1, text: undefined })); setKyc(null); setSigned(null); go("advisor"); };
  /** Back to the start page with nothing of this owner's session left in memory. */
  const signOut = () => {
    setApplicant(""); setRec(null); setQuote(null); setKyc(null); setSigned(null); setOrder(null);
    setRun((r) => ({ key: r.key + 1, text: undefined })); go("start");
  };
  const toDashboard = (p: string, name: string) => {
    setPhone(p); setApplicant(name);
    setOrder(loadOrders().find((o) => o.phone === p) ?? null);
    go("dashboard");
  };
  const business = () => kyc?.result.businessName ?? businessLabel(quote?.profile.businessType, "en");

  /** Records a journey that stopped, for the back office's call list. */
  const stall = (stage: LeadStage, reason: string) => {
    if (!quote) return;
    saveLead({
      phone, name: applicant || undefined, business: business(), city: quote.profile.city, stage, reason,
      monthly: computeQuote(quote.items).monthly, score: scoreProfile(quote.profile, { lang, hasUdyam: !!kyc?.result.udyamVerified }),
    });
  };
  const toKyc = (q: QuoteResult) => {
    setQuote(q);
    const c = currentConsent(phone);
    go(PURPOSES.every((p) => !p.required || c[p.id]) ? "kyc" : "consent");
  };
  const placeOrder = (payment: Paid) => {
    if (!quote || !kyc || !signed) return;
    const q = computeQuote(quote.items);
    const p = quote.profile;
    const sp = smartPrice(quote.items, p);
    const r = kyc.result;
    const o: Order = {
      id: orderId(KYC_TODAY, phone), placedOn: KYC_TODAY, phone,
      businessName: business(), signatory: r.signatory ?? applicant,
      city: r.city ?? p.city, pincode: r.pincode, items: quote.items,
      monthly: sp.monthly, setup: sp.setupPayable, contractMonths: q.contractMonths, installCut: PLAYBOOKS[p.segment].installCut,
      kycStatus: r.status === "review" ? "review" : "verified", gstVerified: r.gstVerified, udyamVerified: r.udyamVerified,
      kyc: kyc.snap, contract: signed, payment, simDay: 0,
      score: scoreProfile(p, { lang, hasUdyam: r.udyamVerified }),
      segment: p.segment, employees: p.employees, sites: p.sites, lang,
    };
    saveOrder(o);
    convertLead(phone);
    setOrder(o);
    go("track");
  };

  const demoList = (
    <>
      <h2>{t(lang, "demoTitle")}</h2>
      <p>{t(lang, "demoHint")}</p>
      {DEMOS.map((d) => (
        <button key={d.id} className="demo" onClick={() => startDemo(d.text)}>
          <b>{d.title}</b><span>{d.shows}</span>
        </button>
      ))}
    </>
  );

  if (screen === "start") {
    return <div className="shell start-shell"><Start lang={lang} setLang={setLang} onOwner={() => go("welcome")} onAdmin={() => go(admin ? "backoffice" : "adminLogin")} onPrivacy={openPrivacy} /></div>;
  }
  if (screen === "adminLogin" || (screen === "backoffice" && !admin)) {
    return <div className="shell start-shell"><AdminLogin onBack={() => go("start")} onSignedIn={(email) => { setAdmin(email); go("backoffice"); }} /></div>;
  }
  if (screen === "backoffice" && admin) {
    return <div className="shell bo-shell"><BackOffice admin={admin} onSignOut={() => { setAdmin(null); go("start"); }} /></div>;
  }

  const back = screen === "privacy" ? privacyFrom : screen === "quote" && fromSim ? "sim" : BACK[screen];
  const demoBtn = <button className="iconbtn demo-btn" onClick={() => setSheet(true)} aria-label={t(lang, "demoTitle")}><IconSpark /></button>;

  return (
    <div className="shell">
      <div className="app">
        <Bar title={TITLE[screen] ? t(lang, TITLE[screen]!) : ""} onBack={back ? () => go(back) : undefined} backLabel={t(lang, "back")}
          right={<>
            {(screen === "dashboard" || screen === "advisor" || screen === "track") && demoBtn}
            {screen === "advisor" && <button className="textbtn" onClick={restart}>{t(lang, "startOver")}</button>}
            <LangToggle lang={lang} setLang={setLang} />
          </>} />
        {JOURNEY_STEP[screen] !== undefined && <JourneyBar step={JOURNEY_STEP[screen]!} lang={lang} />}
        {screen === "welcome" && (
          <Welcome lang={lang} setLang={setLang} onPrivacy={openPrivacy} onSignedIn={(p, name) => { setPhone(p); setApplicant(name); }}
            onDone={toDashboard} />
        )}
        {screen === "dashboard" && (
          <Dashboard lang={lang} name={applicant} phone={phone} order={order}
            onFindPlan={() => { setFromSim(false); restart(); }} onSim={() => { setFromSim(true); go("sim"); }}
            onTrack={() => go("track")} onPrivacy={openPrivacy} onSignOut={signOut} />
        )}
        {screen === "advisor" && (
          <Advisor key={run.key} lang={lang} initialText={run.text}
            onQuote={(profile, r) => { setRec({ profile, rec: r }); go("quote"); }} />
        )}
        {screen === "sim" && <SimQuick lang={lang} onQuote={(profile, r) => { setRec({ profile, rec: r }); go("quote"); }} />}
        {screen === "quote" && rec && (
          <Quote key={JSON.stringify(rec.profile) + rec.rec.plans[0].items.map((i) => i.productId + i.qty).join()} lang={lang} profile={rec.profile} rec={rec.rec}
            onKyc={toKyc} onExpert={(q) => { setQuote(q); saveLead({
              phone, name: applicant || undefined, business: businessLabel(q.profile.businessType, "en"), city: q.profile.city, stage: "quote",
              reason: "Asked for an expert from the quote", monthly: computeQuote(q.items).monthly, score: scoreProfile(q.profile, { lang, hasUdyam: false }),
            }); go("expert"); }} />
        )}
        {screen === "expert" && quote && <Expert lang={lang} phone={phone} quote={quote} onBack={() => go(kyc ? "kyc" : "quote")} />}
        {screen === "consent" && <Consent lang={lang} phone={phone} onDone={() => go("kyc")} onPrivacy={openPrivacy} />}
        {screen === "kyc" && quote && (
          <Kyc key={JSON.stringify(quote.items)} lang={lang} quote={quote} applicant={applicant || undefined}
            onContinue={(result, snap) => { setKyc({ result, snap }); setSigned(null); go("contract"); }}
            onExpert={(reason) => { stall("kyc", `Stuck at KYC: ${reason}`); go("expert"); }} />
        )}
        {screen === "contract" && quote && kyc && (
          <Contract lang={lang} quote={quote} phone={phone} signatory={kyc.result.signatory ?? applicant} business={business()} today={KYC_TODAY}
            onSigned={(s) => { setSigned(s); go("payment"); }} />
        )}
        {screen === "payment" && quote && (
          <Payment lang={lang} quote={quote} onPaid={placeOrder} onFailed={() => stall("payment", "First payment failed")} />
        )}
        {screen === "track" && order && (
          <Tracker key={order.id} lang={lang} order={order} onChange={setOrder} onNew={restart} onPrivacy={openPrivacy} />
        )}
        {screen === "privacy" && <Privacy lang={lang} phone={phone} />}
        {sheet && (
          <>
            <button className="scrim" aria-label="Close" onClick={() => setSheet(false)} />
            <div className="sheet rail-sheet" role="dialog" aria-label={t(lang, "demoTitle")}>{demoList}</div>
          </>
        )}
      </div>
      <aside className="rail" aria-label={t(lang, "demoTitle")}>{demoList}</aside>
    </div>
  );
}
