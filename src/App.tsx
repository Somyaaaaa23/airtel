import { useState } from "react";
import { Bar, IconSpark, LangToggle } from "./components/ui";
import { DEMOS } from "./data/demos";
import type { Profile, Recommendation } from "./engine/types";
import { t, type Lang } from "./i18n/strings";
import { Advisor } from "./screens/Advisor";
import { Expert, KycNext } from "./screens/End";
import { Quote, type QuoteResult } from "./screens/Quote";
import { Welcome } from "./screens/Welcome";

type Screen = "welcome" | "advisor" | "quote" | "expert" | "kyc";

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [phone, setPhone] = useState("9876543210");
  const [run, setRun] = useState({ key: 0, text: undefined as string | undefined });
  const [rec, setRec] = useState<{ profile: Profile; rec: Recommendation } | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [sheet, setSheet] = useState(false);

  const startDemo = (text: string) => {
    setRun((r) => ({ key: r.key + 1, text }));
    setScreen("advisor");
    setSheet(false);
  };
  const restart = () => { setRun((r) => ({ key: r.key + 1, text: undefined })); setScreen("advisor"); };

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

  return (
    <div className="shell">
      <div className="app">
        {screen === "welcome" && (
          <>
            <Bar title="" right={<>
              <button className="iconbtn demo-btn" onClick={() => setSheet(true)} aria-label={t(lang, "demoTitle")}><IconSpark /></button>
              <LangToggle lang={lang} setLang={setLang} />
            </>} />
            <Welcome lang={lang} setLang={setLang} onDone={(p) => { setPhone(p); setScreen("advisor"); }} />
          </>
        )}
        {screen === "advisor" && (
          <>
            <Bar title={t(lang, "advisorTitle")} onBack={() => setScreen("welcome")} backLabel={t(lang, "back")}
              right={<>
                <button className="iconbtn demo-btn" onClick={() => setSheet(true)} aria-label={t(lang, "demoTitle")}><IconSpark /></button>
                <button className="textbtn" onClick={restart}>{t(lang, "startOver")}</button>
                <LangToggle lang={lang} setLang={setLang} />
              </>} />
            <Advisor key={run.key} lang={lang} initialText={run.text}
              onQuote={(profile, r) => { setRec({ profile, rec: r }); setScreen("quote"); }} />
          </>
        )}
        {screen === "quote" && rec && (
          <>
            <Bar title={t(lang, "quoteTitle")} onBack={() => setScreen("advisor")} backLabel={t(lang, "back")} right={<LangToggle lang={lang} setLang={setLang} />} />
            <Quote key={JSON.stringify(rec.profile)} lang={lang} profile={rec.profile} rec={rec.rec}
              onKyc={(q) => { setQuote(q); setScreen("kyc"); }} onExpert={(q) => { setQuote(q); setScreen("expert"); }} />
          </>
        )}
        {screen === "expert" && quote && (
          <><Bar title="" onBack={() => setScreen("quote")} backLabel={t(lang, "back")} right={<LangToggle lang={lang} setLang={setLang} />} />
            <Expert lang={lang} phone={phone} quote={quote} onBack={() => setScreen("quote")} /></>
        )}
        {screen === "kyc" && quote && (
          <><Bar title="" onBack={() => setScreen("quote")} backLabel={t(lang, "back")} right={<LangToggle lang={lang} setLang={setLang} />} />
            <KycNext lang={lang} quote={quote} onBack={() => setScreen("quote")} /></>
        )}
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
