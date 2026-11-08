/**
 * Landing: one split card. Left, a coral welcome panel; right, a sign-in panel where the visitor picks who they are
 * (business owner or Accel team) and continues.
 */
import { useState } from "react";
import { Icon, IconArrow, LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";

type Role = "owner" | "team";

export function Start({ lang, setLang, onOwner, onAdmin, onPrivacy, onDemos }: {
  lang: Lang; setLang: (l: Lang) => void; onOwner: () => void; onAdmin: () => void; onPrivacy: () => void; onDemos: () => void;
}) {
  const [role, setRole] = useState<Role>("owner");
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
            <ul className="split-proof">
              <li>{t(lang, "st_p1")}</li>
              <li>{t(lang, "st_p2")}</li>
              <li>{t(lang, "st_p3")}</li>
            </ul>
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
              <label key={o.id} className={`role-opt ${role === o.id ? "on" : ""}`} data-role={o.id}>
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

          <div className="or">{lang === "hi" ? "या" : "or"}</div>
          <button className="secondary" onClick={onDemos}>{t(lang, "si_demo")}</button>

          <button className="textbtn privacy-link split-privacy" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
        </section>
      </div>
    </main>
  );
}
