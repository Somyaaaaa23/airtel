/**
 * Landing: one split card. Left, a red welcome panel; right, a sign-in panel where the visitor picks who they are
 * (business owner or Accel team). Demo mode reveals sample businesses, the staff login and a reset.
 */
import { useState } from "react";
import { Icon, IconArrow, LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";
import { DEMO_STAFF } from "../services/admin";

type Role = "owner" | "team";

function TrustStrip({ lang, className = "" }: { lang: Lang; className?: string }) {
  return (
    <ul className={`trust ${className}`}>
      <li>{t(lang, "tr_catalogue")}</li>
      <li>{t(lang, "tr_novisit")}</li>
      <li>{t(lang, "tr_dpdp")}</li>
    </ul>
  );
}

export function Start({ lang, setLang, onOwner, onAdmin, onPrivacy, onDemos, demoMode, setDemoMode, onReset }: {
  lang: Lang; setLang: (l: Lang) => void; onOwner: () => void; onAdmin: () => void; onPrivacy: () => void; onDemos: () => void;
  demoMode: boolean; setDemoMode: (on: boolean) => void; onReset: () => void;
}) {
  const [role, setRole] = useState<Role>("owner");
  const [resetNote, setResetNote] = useState("");
  const options: { id: Role; icon: string; title: string; sub: string }[] = [
    { id: "owner", icon: "owner", title: t(lang, "st_owner"), sub: t(lang, "st_owner_sub") },
    { id: "team", icon: "team", title: t(lang, "st_admin"), sub: t(lang, "st_admin_sub") },
  ];

  return (
    <main className="split-page" lang={lang}>
      <div className="split">
        <section className="split-art" aria-labelledby="welcome-t">
          <i className="blob b1" aria-hidden="true" />
          <i className="blob b2" aria-hidden="true" />
          <i className="blob b3" aria-hidden="true" />
          <svg className="split-wave" viewBox="0 0 120 800" preserveAspectRatio="none" aria-hidden="true">
            <path d="M120 0 H62 C10 120 8 250 52 360 C92 460 96 600 40 800 H120 Z" />
          </svg>
          <div className="split-copy">
            <span className="split-kicker">{t(lang, "si_welcome")}</span>
            <h1 id="welcome-t">{t(lang, "heroA")} <em>{t(lang, "heroB")}</em></h1>
            <p>{t(lang, "tagline")}</p>
            <TrustStrip lang={lang} />
          </div>
        </section>

        <section className="split-form" aria-labelledby="signin-t">
          <div className="split-form-top">
            <div>
              <h2 id="signin-t">{t(lang, "si_title")}</h2>
              <p>{t(lang, "si_sub")}</p>
            </div>
            <LangToggle lang={lang} setLang={setLang} />
          </div>

          <fieldset className="role-pick">
            <legend className="vh">{t(lang, "st_title")}</legend>
            {options.map((o) => (
              <label key={o.id} className={`role-opt ${role === o.id ? "on" : ""}`}>
                <input type="radio" name="role" value={o.id} checked={role === o.id} onChange={() => setRole(o.id)} className="vh" />
                <span className="role-opt-ic" aria-hidden="true"><Icon name={o.icon} size={22} /></span>
                <span className="role-opt-text"><b>{o.title}</b><span>{o.sub}</span></span>
                <span className="role-opt-dot" aria-hidden="true" />
              </label>
            ))}
          </fieldset>

          <button className="primary split-go" onClick={role === "owner" ? onOwner : onAdmin}>
            {role === "owner" ? t(lang, "st_owner_cta") : t(lang, "st_admin_cta")} <IconArrow />
          </button>
          <TrustStrip lang={lang} className="on-light mobile-only" />

          <div className="split-row">
            <label className="switch">
              <input type="checkbox" checked={demoMode} onChange={(e) => { setDemoMode(e.target.checked); setResetNote(""); }} aria-describedby="demo-hint" />
              <span className="track" aria-hidden="true" />
              {t(lang, "dm_mode")}
            </label>
            <button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
          </div>
          <span id="demo-hint" className="vh">{t(lang, "dm_mode_hint")}</span>

          {demoMode && (
            <div className="demo-box" aria-label={t(lang, "dm_mode")}>
              <button className="secondary" onClick={onDemos}>{t(lang, "si_demo")}</button>
              <div>
                <span className="eyebrow">{t(lang, "dm_staff")}</span>
                <dl>
                  <dt>{t(lang, "dm_email")}</dt><dd>{DEMO_STAFF.email}</dd>
                  <dt>{t(lang, "dm_password")}</dt><dd>{DEMO_STAFF.password}</dd>
                </dl>
              </div>
              <button className="textbtn start-self" onClick={() => { onReset(); setResetNote(t(lang, "dm_reset_done")); }}>{t(lang, "dm_reset")}</button>
              <p className="fine" role="status" aria-live="polite">{resetNote}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
