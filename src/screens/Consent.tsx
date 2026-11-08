import { useState } from "react";
import { t, type Key, type Lang } from "../i18n/strings";
import { GRIEVANCE, PURPOSES, recordConsent, type Purpose } from "../services/consent";

/** DPDP consent: one checkbox per purpose, nothing pre-ticked, each with what / why / how long / who sees it. */
export function Consent({ lang, phone, onDone, onPrivacy }: { lang: Lang; phone: string; onDone: () => void; onPrivacy: () => void }) {
  const [choice, setChoice] = useState<Record<Purpose, boolean>>({ kyc: false, install: false, updates: false, offers: false });
  const ready = PURPOSES.every((p) => !p.required || choice[p.id]);
  const k = (id: Purpose, part: string) => t(lang, `cs_${id}_${part}` as Key);

  return (
    <>
      <main className="scroll" lang={lang}>
        <p className="lead">{t(lang, "cs_intro")}</p>
        {PURPOSES.map(({ id, required }) => (
          <section key={id} className={`purpose ${choice[id] ? "on" : ""}`}>
            <label className="agree">
              <input type="checkbox" className="check" checked={choice[id]} onChange={(e) => setChoice((c) => ({ ...c, [id]: e.target.checked }))} />
              <span>{k(id, "t")} <small className={`tag ${required ? "opt" : "in"}`}>{t(lang, required ? "cs_required" : "cs_optional")}</small></span>
            </label>
            <dl className="fields">
              {(["what", "why", "keep", "who"] as const).map((part) => (
                <div key={part}><dt>{t(lang, `cs_${part}` as Key)}</dt><dd>{k(id, part)}</dd></div>
              ))}
            </dl>
          </section>
        ))}
        <p className="fine">{t(lang, "cs_withdraw", GRIEVANCE)}</p>
        <button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
      </main>
      <footer className="footer" lang={lang}>
        {!ready && <p className="kyc-status">{t(lang, "cs_needRequired")}</p>}
        <button className="primary" disabled={!ready} onClick={() => { recordConsent(phone, choice); onDone(); }}>{t(lang, "cs_continue")}</button>
      </footer>
    </>
  );
}
