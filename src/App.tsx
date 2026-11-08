import { useState } from "react";
import { businessLabel } from "./advisor/explain";
import { DemoLibrary } from "./components/demos";
import { OwnerShell, type NavKey } from "./components/OwnerShell";
import { Brand, Icon, IconBack, LangToggle, Modal } from "./components/ui";
import { KYC_TODAY, type KycResult } from "./engine/kyc";
import { orderId, type Order } from "./engine/orders";
import { computeQuote } from "./engine/quote";
import { smartPrice } from "./engine/pricing";
import { PLAYBOOKS } from "./engine/segments";
import { JourneyBar } from "./components/segment";
import type { JourneyStep } from "./engine/journey";
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
import { loadDemoMode, resetDemoData, saveDemoMode } from "./services/demo";

type Screen = "start" | "adminLogin" | "dashboard" | "welcome" | "advisor" | "sim" | "quote" | "consent" | "kyc" | "contract" | "payment" | "track" | "privacy" | "backoffice";

/** Screen to return to with the back arrow. */
const BACK: Partial<Record<Screen, Screen>> = {
  welcome: "start", advisor: "dashboard", sim: "dashboard", track: "dashboard", quote: "advisor", consent: "quote", kyc: "quote", contract: "kyc", payment: "contract",
};
/** Step of the six-step journey bar each screen belongs to. */
const JOURNEY_STEP: Partial<Record<Screen, JourneyStep>> = { advisor: "advisor", sim: "advisor", quote: "quote", consent: "consent", kyc: "kyc", contract: "sign", payment: "pay", track: "track" };
/** Where a call-back request is filed for the sales team, by screen. */
const LEAD_STAGE: Partial<Record<Screen, LeadStage>> = { advisor: "advisor", sim: "advisor", quote: "quote", consent: "consent", kyc: "kyc", contract: "contract", payment: "payment", track: "track" };
const TITLE: Partial<Record<Screen, Key>> = {
  advisor: "advisorTitle", sim: "simTitle", quote: "quoteTitle", consent: "cs_title", kyc: "kycTitle", contract: "ctTitle",
  payment: "payTitle", track: "trackTitle", privacy: "pv_title",
};
/** Sidebar item that stays highlighted on each screen. */
const NAV_OF: Partial<Record<Screen, NavKey>> = {
  advisor: "plan", sim: "plan", quote: "plan", consent: "plan", kyc: "plan", contract: "plan", payment: "plan", track: "orders",
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
  const [owner, setOwner] = useState(false);
  const [view, setView] = useState<NavKey>("overview");
  const [demos, setDemos] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [demoMode, setDemoModeState] = useState(loadDemoMode);
  const setDemoMode = (on: boolean) => { setDemoModeState(on); saveDemoMode(on); };

  const go = (s: Screen) => { setScreen(s); setDemos(false); window.scrollTo(0, 0); };
  const openPrivacy = () => { setPrivacyFrom(screen); go("privacy"); };
  const startDemo = (text: string) => {
    setRun((r) => ({ key: r.key + 1, text }));
    setFromSim(false);
    setOwner(true);
    go("advisor");
  };
  const restart = () => { setRun((r) => ({ key: r.key + 1, text: undefined })); setKyc(null); setSigned(null); go("advisor"); };
  /** Back to the start page with nothing of this owner's session left in memory. */
  const signOut = () => {
    setApplicant(""); setRec(null); setQuote(null); setKyc(null); setSigned(null); setOrder(null); setOwner(false); setView("overview");
    setRun((r) => ({ key: r.key + 1, text: undefined })); go("start");
  };
  const toDashboard = (p: string, name: string) => {
    setPhone(p); setApplicant(name); setOwner(true); setView("overview");
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
  /** Files a call-back request from whichever step the owner is on, then confirms it. */
  const talkToExpert = (reason?: string, fromQuote?: QuoteResult) => {
    const stage = LEAD_STAGE[screen] ?? "quote";
    const q = fromQuote ?? quote;
    const p = q?.profile ?? rec?.profile;
    saveLead({
      phone, name: applicant || undefined, business: business(), city: p?.city, stage,
      reason: reason ?? `Asked for an expert at ${stage}`,
      monthly: q ? computeQuote(q.items).monthly : undefined,
      score: p ? scoreProfile(p, { lang, hasUdyam: !!kyc?.result.udyamVerified }) : undefined,
    });
    setExpertOpen(true);
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

  const expertDialog = expertOpen && (
    <Modal label={t(lang, "expertTitle")} onClose={() => setExpertOpen(false)} className="modal-sm">
      <Expert lang={lang} phone={phone} quote={quote ?? undefined} onBack={() => setExpertOpen(false)} />
    </Modal>
  );
  const library = demos && <DemoLibrary lang={lang} onTry={startDemo} onClose={() => setDemos(false)} />;

  if (screen === "start") {
    return (
      <>
        <Start lang={lang} setLang={setLang} onOwner={() => go(owner ? "dashboard" : "welcome")} onAdmin={() => go(admin ? "backoffice" : "adminLogin")}
          onPrivacy={openPrivacy} onDemos={() => setDemos(true)} demoMode={demoMode} setDemoMode={setDemoMode}
          onReset={() => { resetDemoData(); setAdmin(null); signOut(); }} />
        {library}
      </>
    );
  }
  if (screen === "adminLogin" || (screen === "backoffice" && !admin)) {
    return <AdminLogin lang={lang} setLang={setLang} demoMode={demoMode} onBack={() => go("start")} onSignedIn={(email) => { setAdmin(email); go("backoffice"); }} />;
  }
  if (screen === "backoffice" && admin) {
    return <div className="bo-shell"><BackOffice admin={admin} onSignOut={() => { setAdmin(null); go("start"); }} /></div>;
  }
  if (screen === "welcome") {
    return (
      <>
        <Welcome lang={lang} setLang={setLang} onPrivacy={openPrivacy} onSignedIn={(p, name) => { setPhone(p); setApplicant(name); }}
          onDone={toDashboard} onBack={() => go("start")} onTryDemo={startDemo} onOpenDemos={() => setDemos(true)} demoMode={demoMode} />
        {library}
      </>
    );
  }
  if (screen === "privacy" && !owner) {
    return (
      <div className="site" lang={lang}>
        <header className="topnav">
          <button className="iconbtn" onClick={() => go(privacyFrom)} aria-label={t(lang, "back")}><IconBack /></button>
          <Brand /><span className="spacer" /><LangToggle lang={lang} setLang={setLang} />
        </header>
        <main className="ws-main flowing"><div className="flow"><Privacy lang={lang} phone={phone} /></div></main>
      </div>
    );
  }

  const back = screen === "privacy" ? privacyFrom : screen === "quote" && fromSim ? "sim" : BACK[screen];
  const navTo = (k: NavKey) => {
    if (k === "plan") { setFromSim(false); restart(); return; }
    setView(k); go("dashboard");
  };
  const myOrders = loadOrders().filter((o) => o.phone === phone);
  const title = screen === "dashboard" ? t(lang, `nav_${view}` as Key) : TITLE[screen] ? t(lang, TITLE[screen]!) : "";
  const flowing = screen !== "dashboard";

  return (
    <>
      <OwnerShell lang={lang} setLang={setLang} name={applicant} phone={phone} title={title}
        active={screen === "dashboard" ? view : NAV_OF[screen]} onNav={navTo}
        onBack={screen !== "dashboard" && back ? () => go(back) : undefined}
        onOpenDemos={() => setDemos(true)} onPrivacy={openPrivacy} onSignOut={signOut} flowing={flowing} demoMode={demoMode}
        actions={<>
          {screen === "advisor" && <button className="textbtn" onClick={restart}>{t(lang, "startOver")}</button>}
          {screen !== "privacy" && (
            <button className="btn-ghost expert-btn" onClick={() => talkToExpert()} aria-label={t(lang, "ex_talk")}><Icon name="support" size={18} /><span className="hide-sm">{t(lang, "ex_talk")}</span></button>
          )}
        </>}>
        {screen === "dashboard" ? (
          <Dashboard lang={lang} view={view} name={applicant} phone={phone} order={order} orders={myOrders} canExpert={!!quote}
            onNav={navTo} onFindPlan={() => { setFromSim(false); restart(); }} onSim={() => { setFromSim(true); go("sim"); }}
            onTrack={(o) => { setOrder(o); go("track"); }} onExpert={() => talkToExpert()} onPrivacy={openPrivacy} onSignOut={signOut}
            progress={{ rec: !!rec, quote: !!quote, kyc: !!kyc, signed: !!signed }}
            onContinue={() => go(signed ? "payment" : kyc ? "contract" : quote ? "kyc" : rec ? "quote" : "advisor")} />
        ) : (
          <div className="flow">
            {JOURNEY_STEP[screen] !== undefined && <JourneyBar step={JOURNEY_STEP[screen]!} lang={lang} />}
            {screen === "advisor" && (
              <Advisor key={run.key} lang={lang} initialText={run.text}
                onQuote={(profile, r) => { setRec({ profile, rec: r }); go("quote"); }} />
            )}
            {screen === "sim" && <SimQuick lang={lang} onQuote={(profile, r) => { setRec({ profile, rec: r }); go("quote"); }} />}
            {screen === "quote" && rec && (
              <Quote key={JSON.stringify(rec.profile) + rec.rec.plans[0].items.map((i) => i.productId + i.qty).join()} lang={lang} profile={rec.profile} rec={rec.rec}
                onKyc={toKyc} onExpert={(q) => { setQuote(q); talkToExpert("Asked for an expert from the quote", q); }} />
            )}
            
            {screen === "consent" && <Consent lang={lang} phone={phone} onDone={() => go("kyc")} onPrivacy={openPrivacy} />}
            {screen === "kyc" && quote && (
              <Kyc key={JSON.stringify(quote.items)} lang={lang} quote={quote} applicant={applicant || undefined}
                onContinue={(result, snap) => { setKyc({ result, snap }); setSigned(null); go("contract"); }}
                onExpert={(reason) => talkToExpert(`Stuck at KYC: ${reason}`)} />
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
          </div>
        )}
      </OwnerShell>
      {library}
      {expertDialog}
    </>
  );
}
