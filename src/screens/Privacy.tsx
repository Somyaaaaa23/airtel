import { useState } from "react";
import { fmtDate, t, type Key, type Lang } from "../i18n/strings";
import { consentLog, currentConsent, grievanceFor, PURPOSES, withdrawConsent } from "../services/consent";

const SECTIONS = ["collect", "purpose", "keep", "secure", "rights"] as const;

/** Privacy note for owners, plus their consent record with a withdraw button per purpose. */
export function Privacy({ lang, phone }: { lang: Lang; phone: string }) {
  const [, refresh] = useState(0);
  const current = currentConsent(phone);
  const events = consentLog().filter((e) => e.phone === phone);

  return (
    <main className="scroll" lang={lang}>
      {SECTIONS.map((s) => (
        <section key={s} className="consent">
          <h3>{t(lang, `pv_${s}_t` as Key)}</h3>
          <p>{t(lang, `pv_${s}` as Key, grievanceFor(lang))}</p>
        </section>
      ))}
      <section className="consent">
        <h3>{t(lang, "pv_consents_t")}</h3>
        {events.length === 0 ? <p>{t(lang, "pv_none")}</p> : (
          <ul className="consent-list">
            {PURPOSES.map(({ id, required }) => (
              <li key={id}>
                <span>{t(lang, `cs_${id}_t` as Key)}<small className="fine"> · {t(lang, current[id] ? "pv_granted" : "pv_withdrawn")}
                  {events.find((e) => e.purpose === id) ? ` · ${fmtDate(events.find((e) => e.purpose === id)!.at.slice(0, 10), lang)}` : ""}</small></span>
                {current[id] && <button className="textbtn" onClick={() => { withdrawConsent(phone, id); refresh((n) => n + 1); }}
                  title={required ? t(lang, "cs_required") : undefined}>{t(lang, "pv_withdraw")}</button>}
              </li>
            ))}
          </ul>
        )}
        <p className="fine">{t(lang, "pv_demo")}</p>
      </section>
    </main>
  );
}
