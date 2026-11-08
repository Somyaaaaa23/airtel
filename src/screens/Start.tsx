/** Landing page: what the product is, and who is signing in (business owner or Accel team). */
import { Brand, Icon, IconArrow, LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";

export function Start({ lang, setLang, onOwner, onAdmin, onPrivacy }: {
  lang: Lang; setLang: (l: Lang) => void; onOwner: () => void; onAdmin: () => void; onPrivacy: () => void;
}) {
  return (
    <div className="site" lang={lang}>
      <header className="topnav">
        <Brand />
        <span className="spacer" />
        <button className="navlink hide-sm" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
        <LangToggle lang={lang} setLang={setLang} />
      </header>

      <main className="container landing">
        <section>
          <span className="eyebrow">{t(lang, "st_eyebrow")}</span>
          <h1 className="hero">{t(lang, "heroA")} <em>{t(lang, "heroB")}</em></h1>
          <p className="hero-sub">{t(lang, "tagline")}</p>
          <ul className="proof">
            <li>{t(lang, "st_p1")}</li>
            <li>{t(lang, "st_p2")}</li>
            <li>{t(lang, "st_p3")}</li>
          </ul>
        </section>

        <section className="roles-wrap" aria-labelledby="who-t">
          <h2 id="who-t" className="eyebrow" style={{ margin: 0 }}>{t(lang, "st_title")}</h2>
          <button className="role role-owner" onClick={onOwner}>
            <span className="role-ic" aria-hidden="true"><Icon name="owner" size={24} /></span>
            <b>{t(lang, "st_owner")}</b>
            <span>{t(lang, "st_owner_sub")}</span>
            <span className="cta">{t(lang, "st_owner_cta")} <IconArrow /></span>
          </button>
          <button className="role role-admin" onClick={onAdmin}>
            <span className="role-ic" aria-hidden="true"><Icon name="team" size={24} /></span>
            <b>{t(lang, "st_admin")}</b>
            <span>{t(lang, "st_admin_sub")}</span>
            <span className="cta">{t(lang, "st_admin_cta")} <IconArrow /></span>
          </button>
        </section>
      </main>

      <footer className="site-foot">
        <span>{t(lang, "st_foot")}</span>
        <button className="textbtn" onClick={onPrivacy}>{t(lang, "privacyLink")}</button>
      </footer>
    </div>
  );
}
