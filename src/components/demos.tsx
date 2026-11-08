/**
 * Demo scenarios kept apart from the product: a compact panel beside sign-in and a filterable library
 * that previews what the owner types and what the advisor will do before starting the scenario.
 */
import { useState } from "react";
import { DEMOS, type Demo, type DemoCategory } from "../data/demos";
import { t, type Key, type Lang } from "../i18n/strings";
import { Icon, IconClose, Modal } from "./ui";

const CAT_ICON: Record<DemoCategory, string> = { retail: "retail", health: "health", hosp: "hosp", mfg: "mfg", services: "services_cat" };
const CATS: ("all" | DemoCategory)[] = ["all", "retail", "health", "hosp", "mfg", "services"];
const catLabel = (lang: Lang, c: "all" | DemoCategory) => t(lang, `cat_${c}` as Key);

function ScenarioCard({ d, lang, onClick, pressed, showTags }: { d: Demo; lang: Lang; onClick: () => void; pressed?: boolean; showTags?: boolean }) {
  return (
    <button className="scn" data-cat={d.category} onClick={onClick} aria-pressed={pressed}>
      <span className="scn-ic" aria-hidden="true"><Icon name={CAT_ICON[d.category]} size={18} /></span>
      <b>{d.name}</b>
      <span className="meta">{d.city} · {catLabel(lang, d.category)}</span>
      <span className="go">{pressed === undefined ? `${t(lang, "dm_try")} →` : ""}</span>
      {showTags && <span className="tags"><span className="ctx">{d.context}</span>{d.tags.slice(0, 2).map((x) => <span key={x} className="tag">{x}</span>)}</span>}
    </button>
  );
}

/** Secondary panel beside the sign-in card: four curated scenarios and a way into the full library. */
export function DemoPanel({ lang, onTry, onViewAll }: { lang: Lang; onTry: (text: string) => void; onViewAll: () => void }) {
  const featured = DEMOS.filter((d) => d.featured).slice(0, 4);
  return (
    <aside className="demo-panel" aria-labelledby="demo-panel-t">
      <span className="eyebrow">Demo</span>
      <h2 id="demo-panel-t">{t(lang, "dm_title")}</h2>
      <p>{t(lang, "dm_sub")}</p>
      <div className="scn-list">
        {featured.map((d) => <ScenarioCard key={d.id} d={d} lang={lang} onClick={() => onTry(d.text)} showTags />)}
      </div>
      <button className="secondary" onClick={onViewAll}>{t(lang, "dm_all")} ({DEMOS.length})</button>
    </aside>
  );
}

export function DemoLibrary({ lang, onTry, onClose }: { lang: Lang; onTry: (text: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState<"all" | DemoCategory>("all");
  const [pick, setPick] = useState<Demo | null>(null);
  const list = DEMOS.filter((d) => cat === "all" || d.category === cat);
  return (
    <Modal label={t(lang, "dm_library")} onClose={onClose}>
      <div className="modal-head">
        {pick && <button className="textbtn lib-back" onClick={() => setPick(null)}>← {t(lang, "back")}</button>}
        <h2>{t(lang, "dm_library")}</h2>
        <span className="fine">{t(lang, "dm_count", { n: list.length })}</span>
        <button className="iconbtn" onClick={onClose} aria-label={t(lang, "dm_close")}><IconClose /></button>
      </div>
      <div className="filters" role="group" aria-label="Filter">
        {CATS.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => { setCat(c); setPick(null); }}>{catLabel(lang, c)}</button>)}
      </div>
      <div className={`lib ${pick ? "has-pick" : ""}`}>
        <div className="lib-list">
          {list.map((d) => <ScenarioCard key={d.id} d={d} lang={lang} pressed={pick?.id === d.id} onClick={() => setPick(d)} showTags />)}
        </div>
        <div className="lib-preview" aria-live="polite">
          {pick ? (
            <>
              <div>
                <span className="eyebrow">{pick.city} · {catLabel(lang, pick.category)}</span>
                <h3>{pick.name}</h3>
              </div>
              <div>
                <span className="eyebrow">{t(lang, "dm_says")}</span>
                <p className="bubble">{pick.text}</p>
              </div>
              <div>
                <span className="eyebrow">{t(lang, "dm_shows")}</span>
                <p className="what">{pick.shows}</p>
              </div>
              <div className="chips">{pick.tags.map((x) => <span key={x} className="tag info">{x}</span>)}</div>
              <button className="primary" onClick={() => { onTry(pick.text); onClose(); }}>{t(lang, "dm_try")} →</button>
            </>
          ) : <p className="lib-empty">{t(lang, "dm_pick")}</p>}
        </div>
      </div>
    </Modal>
  );
}
