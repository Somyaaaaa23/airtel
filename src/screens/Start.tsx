/** First page: pick who is signing in, a business owner or the Accel team. */
import { LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";

export function Start({ lang, setLang, onOwner, onAdmin, onPrivacy }: {
  lang: Lang; setLang: (l: Lang) => void; onOwner: () => void; onAdmin: () => void; onPrivacy: () => void;
}) {
  return (
    <main className="start" lang={lang}>
      <header className="start-top">
        <div className="mark"><i aria-hidden="true">U</i><span>{t(lang, "st_brand")}<small>{t(lang, "st_by")}</small></span></div>
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <section className="start-body">
        <h1 className="hero">{t(lang, "heroA")}<em>{t(lang, "heroB")}</em></h1>
        <p className="sub">{t(lang, "tagline")}</p>
        <h2 className="eyebrow start-q">{t(lang, "st_title")}</h2>
        <div className="roles">
          <button className="role role-owner" onClick={onOwner}>
            <span className="role-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></svg>
            </span>
            <b>{t(lang, "st_owner")}</b>
            <span>{t(lang, "st_owner_sub")}</span>
            <small>{t(lang, "st_owner_how")} →</small>
          </button>
          <button className="role role-admin" onClick={onAdmin}>
            <span className="role-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
            </span>
            <b>{t(lang, "st_admin")}</b>
            <span>{t(lang, "st_admin_sub")}</span>
            <small>{t(lang, "st_admin_how")} →</small>
          </button>
        </div>
      </section>
      <button className="textbtn privacy-link" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
    </main>
  );
}
