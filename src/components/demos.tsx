/**
 * Demo scenarios kept apart from the product: a compact panel beside sign-in and a filterable library
 * that previews what the owner types and what the advisor will do before starting the scenario.
 */
import { useState } from "react";
import { DEMOS, type Demo, type DemoCategory } from "../data/demos";
import { runAllScenarios, type ScenarioResult } from "../services/scenarios";
import { t, type Key, type Lang } from "../i18n/strings";
import { CITIES } from "../data/reference";
import { Icon, IconClose, Modal } from "./ui";
import { onGroupKeys } from "../a11y/keys";

const CAT_ICON: Record<DemoCategory, string> = { retail: "retail", health: "health", hosp: "hosp", mfg: "mfg", services: "services_cat" };
const CATS: ("all" | DemoCategory)[] = ["all", "retail", "health", "hosp", "mfg", "services"];
const catLabel = (lang: Lang, c: "all" | DemoCategory) => t(lang, `cat_${c}` as Key);
const nameOf = (d: Demo, lang: Lang) => (lang === "hi" ? d.nameHi : d.name);
const cityOf = (d: Demo, lang: Lang) => (lang === "hi" ? CITIES.find((c) => c.city === d.city)?.hi ?? d.city : d.city);
const contextOf = (d: Demo, lang: Lang) => (lang === "hi" ? d.contextHi : d.context);
const tagsOf = (d: Demo, lang: Lang) => (lang === "hi" ? d.tagsHi : d.tags);

function ScenarioCard({ d, lang, onClick, pressed, showTags }: { d: Demo; lang: Lang; onClick: () => void; pressed?: boolean; showTags?: boolean }) {
  return (
    <button className="scn" data-cat={d.category} onClick={onClick} aria-pressed={pressed}>
      <span className="scn-ic" aria-hidden="true"><Icon name={CAT_ICON[d.category]} size={18} /></span>
      <b>{nameOf(d, lang)}</b>
      <span className="meta">{cityOf(d, lang)} · {catLabel(lang, d.category)}</span>
      <span className="go">{pressed === undefined ? `${t(lang, "dm_try")} →` : ""}</span>
      {showTags && <span className="tags"><span className="ctx">{contextOf(d, lang)}</span>{tagsOf(d, lang).slice(0, 2).map((x) => <span key={x} className="tag">{x}</span>)}</span>}
    </button>
  );
}

/** Secondary panel beside the sign-in card: four curated scenarios and a way into the full library. */
export function DemoPanel({ lang, onTry, onViewAll }: { lang: Lang; onTry: (text: string) => void; onViewAll: () => void }) {
  const featured = DEMOS.filter((d) => d.featured).slice(0, 4);
  return (
    <aside className="demo-panel" aria-labelledby="demo-panel-t">
      <span className="eyebrow">{t(lang, "dm_eyebrow")}</span>
      <h2 id="demo-panel-t">{t(lang, "dm_title")}</h2>
      <p>{t(lang, "dm_sub")}</p>
      <div className="scn-list">
        {featured.map((d) => <ScenarioCard key={d.id} d={d} lang={lang} onClick={() => onTry(d.text)} showTags />)}
      </div>
      <button className="secondary" onClick={onViewAll}>{t(lang, "dm_all")} ({DEMOS.length})</button>
    </aside>
  );
}

export function DemoLibrary({ lang, onTry, onClose }: { lang: Lang; onTry: (text: string, runLang?: Lang) => void; onClose: () => void }) {
  const [cat, setCat] = useState<"all" | DemoCategory>("all");
  const [query, setQuery] = useState("");
  const [pickId, setPickId] = useState<string>(DEMOS[0].id);
  const [mobilePick, setMobilePick] = useState(false);
  const [results, setResults] = useState<ScenarioResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState(false);
  const q = query.trim().toLowerCase();
  const list = DEMOS.filter((d) => (cat === "all" || d.category === cat)
    && (!q || [d.name, d.nameHi, d.city, cityOf(d, "hi"), d.text, d.shows, d.showsHi, ...d.tags, ...d.tagsHi, d.rule.code].join(" ").toLowerCase().includes(q)));
  const pick = DEMOS.find((d) => d.id === pickId) ?? DEMOS[0];
  const resultFor = (id: string) => results?.find((r) => r.id === id);
  const runAll = async () => {
    setRunning(true); setRunErr(false); setShowResults(true); setMobilePick(true);
    try { setResults(await runAllScenarios(DEMOS)); } catch { setRunErr(true); }
    setRunning(false);
  };
  const run = (l?: Lang) => { onTry(pick.text, l); onClose(); };

  return (
    <Modal label={t(lang, "dm_library")} onClose={onClose}>
      <div className="modal-head">
        {mobilePick && <button className="textbtn lib-back" onClick={() => { setMobilePick(false); setShowResults(false); }}>← {t(lang, "back")}</button>}
        <h2>{t(lang, "dm_library")}</h2>
        <span className="fine">{t(lang, "dm_count", { n: list.length })}</span>
        <button className="iconbtn" onClick={onClose} aria-label={t(lang, "dm_close")}><IconClose /></button>
      </div>
      <div className="modal-tools">
        <label className="vh" htmlFor="scn-search">{t(lang, "dm_search")}</label>
        <input id="scn-search" className="input" type="search" placeholder={t(lang, "dm_search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="filters" role="group" aria-label="Filter" onKeyDown={(e) => onGroupKeys(e)}>
          {CATS.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{catLabel(lang, c)}</button>)}
        </div>
      </div>
      <div className={`lib ${mobilePick ? "has-pick" : ""}`}>
        <div className="lib-list">
          {list.length === 0 && <p className="empty">{t(lang, "dm_none")}</p>}
          {list.map((d) => {
            const r = resultFor(d.id);
            return (
              <div key={d.id} className="scn-wrap">
                <ScenarioCard d={d} lang={lang} pressed={!showResults && pick.id === d.id} onClick={() => { setPickId(d.id); setShowResults(false); setMobilePick(true); }} showTags />
                {r && <span className={`tag ${r.pass ? "in" : "out"} scn-res`}>{r.pass ? `✓ ${t(lang, "dm_pass")}` : `✕ ${t(lang, "dm_fail")}`}</span>}
              </div>
            );
          })}
        </div>
        <div className="lib-preview" aria-live="polite">
          {showResults ? (
            <>
              <h3>{t(lang, "dm_results_t")}</h3>
              {running && <div className="skeleton-list" aria-label={t(lang, "dm_running")}>{DEMOS.map((d) => <i key={d.id} className="skeleton" />)}</div>}
              {runErr && <p className="notice blocked" role="alert">{t(lang, "dm_err")}</p>}
              {results && !running && (
                <>
                  <p className={`tag ${results.every((r) => r.pass) ? "in" : "out"} start-self`}>{t(lang, "dm_results", { pass: results.filter((r) => r.pass).length, n: results.length })}</p>
                  <ul className="runall">
                    {results.map((r) => {
                      const d = DEMOS.find((x) => x.id === r.id)!;
                      return (
                        <li key={r.id}>
                          <b>{nameOf(d, lang)} · {cityOf(d, lang)}</b>
                          <span className={`tag ${r.pass ? "in" : "out"}`}>{r.pass ? t(lang, "dm_pass") : t(lang, "dm_fail")}</span>
                          <span className="fine">{r.checks.map((c) => `${c.ok ? "✓" : "✕"} ${c.label}`).join(" · ")}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <span className="eyebrow">{cityOf(pick, lang)} · {catLabel(lang, pick.category)} · {contextOf(pick, lang)}</span>
                <h3>{nameOf(pick, lang)}</h3>
              </div>
              <div><span className="eyebrow">{t(lang, "dm_says")}</span><p className="bubble">{pick.text}</p></div>
              <div><span className="eyebrow">{t(lang, "dm_shows")}</span><p className="what">{lang === "hi" ? pick.showsHi : pick.shows}</p></div>
              <div><span className="eyebrow">{t(lang, "dm_rule")}</span><p className="rule"><code>{pick.rule.code}</code></p><p className="fine">{lang === "hi" ? pick.rule.hi : pick.rule.en}</p></div>
              <div className="chips">{tagsOf(pick, lang).map((x) => <span key={x} className="tag">{x}</span>)}</div>
            </>
          )}
        </div>
      </div>
      <div className="modal-foot">
        <button className="secondary" onClick={runAll} disabled={running}>{running ? t(lang, "dm_running") : t(lang, "dm_run_all")}</button>
        <span className="fine">{results ? t(lang, "dm_results", { pass: results.filter((r) => r.pass).length, n: results.length }) : ""}</span>
        <button className="secondary" onClick={() => run("hi")} disabled={showResults}>{t(lang, "dm_run_hi")}</button>
        <button className="primary" onClick={() => run()} disabled={showResults}>{t(lang, "dm_run")} →</button>
      </div>
    </Modal>
  );
}
