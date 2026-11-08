/** Business-owner workspace: sidebar navigation, top bar with account menu, and the page content. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { t, type Key, type Lang } from "../i18n/strings";
import { Brand, Icon, IconBack, IconClose, IconMenu, IconSpark, LangToggle } from "./ui";

export type NavKey = "overview" | "services" | "plan" | "usage" | "bills" | "orders" | "support" | "profile";
const MAIN: NavKey[] = ["overview", "services", "plan", "usage", "bills", "orders", "support"];

export function OwnerShell({ lang, setLang, name, phone, title, active, onNav, onBack, onOpenDemos, onPrivacy, onSignOut, actions, flowing, children }: {
  lang: Lang; setLang: (l: Lang) => void; name: string; phone: string; title: string; active?: NavKey;
  onNav: (k: NavKey) => void; onBack?: () => void; onOpenDemos: () => void; onPrivacy: () => void; onSignOut: () => void;
  actions?: ReactNode; flowing?: boolean; children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const display = name || t(lang, "guest");
  const initials = (name || "G").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [menu]);

  const go = (k: NavKey) => { setNavOpen(false); onNav(k); };
  const item = (k: NavKey) => (
    <button key={k} className="nav-item" aria-current={active === k ? "page" : undefined} onClick={() => go(k)}>
      <Icon name={k} size={18} /><span>{t(lang, `nav_${k}` as Key)}</span>
    </button>
  );

  return (
    <div className={`ws ${navOpen ? "nav-open" : ""}`} lang={lang}>
      <aside className="ws-side" aria-label="Main">
        <Brand onClick={() => go("overview")} />
        <nav className="ws-nav">{MAIN.map(item)}</nav>
        <nav className="ws-nav" aria-label="Account">
          <button className="nav-item only-sm" onClick={() => { setNavOpen(false); onOpenDemos(); }}><IconSpark /><span>{t(lang, "nav_demos")}</span></button>
          {item("profile")}
          <div className="nav-row"><span><Icon name="language" size={18} />{t(lang, "nav_language")}</span><LangToggle lang={lang} setLang={setLang} /></div>
          <button className="nav-item" onClick={() => { setNavOpen(false); onPrivacy(); }}><Icon name="privacy" size={18} /><span>{t(lang, "nav_privacy")}</span></button>
          <button className="nav-item" onClick={onSignOut}><Icon name="signout" size={18} /><span>{t(lang, "signOut")}</span></button>
        </nav>
      </aside>
      <button className="side-scrim" aria-label={t(lang, "nav_close")} onClick={() => setNavOpen(false)} />

      <div className="ws-body">
        <header className="ws-top">
          <button className="iconbtn menu-btn" onClick={() => setNavOpen((v) => !v)} aria-label={navOpen ? t(lang, "nav_close") : t(lang, "nav_menu")} aria-expanded={navOpen}>
            {navOpen ? <IconClose /> : <IconMenu />}
          </button>
          {onBack && <button className="iconbtn" onClick={onBack} aria-label={t(lang, "back")} title={t(lang, "back")}><IconBack /></button>}
          <h1>{title}</h1>
          {actions}
          <button className="btn-ghost top-demos" onClick={onOpenDemos} title={t(lang, "nav_demos")}><IconSpark /><span className="hide-sm">{t(lang, "nav_demos")}</span></button>
          <div className="avatar-wrap" ref={menuRef}>
            <button className="avatar" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label={t(lang, "nav_account")}>{initials}</button>
            {menu && (
              <div className="menu" role="menu">
                <div className="who"><b>{display}</b><span className="fine num">+91 {phone.slice(0, 5)} {phone.slice(5)}</span></div>
                <button role="menuitem" onClick={() => { setMenu(false); go("profile"); }}>{t(lang, "nav_profile")}</button>
                <button role="menuitem" onClick={() => { setMenu(false); onPrivacy(); }}>{t(lang, "nav_privacy")}</button>
                <button role="menuitem" onClick={() => { setMenu(false); setLang(lang === "en" ? "hi" : "en"); }}>{lang === "en" ? "हिन्दी" : "English"}</button>
                <button role="menuitem" onClick={onSignOut}>{t(lang, "signOut")}</button>
              </div>
            )}
          </div>
        </header>
        <main className={`ws-main ${flowing ? "flowing" : ""}`}>{children}</main>
      </div>
    </div>
  );
}
