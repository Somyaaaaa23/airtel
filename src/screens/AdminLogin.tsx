/** Staff sign-in page for the command centre. */
import { useState } from "react";
import { IconBack, LangToggle } from "../components/ui";
import { t, type Lang } from "../i18n/strings";
import { ADMIN_EMAIL, checkAdmin, DEMO_STAFF } from "../services/admin";

type Errors = { email?: string; password?: string; form?: string };

export function AdminLogin({ lang, setLang, demoMode, onBack, onSignedIn }: {
  lang: Lang; setLang: (l: Lang) => void; demoMode: boolean; onBack: () => void; onSignedIn: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<Errors>({});

  const attempt = (id: string, pw: string) => {
    const next: Errors = {};
    if (!id.trim()) next.email = t(lang, "ad_err_email");
    if (!pw) next.password = t(lang, "ad_err_password");
    if (!next.email && !next.password && !checkAdmin(id, pw)) next.form = t(lang, "ad_err_match");
    setErr(next);
    if (!next.email && !next.password && !next.form) onSignedIn(ADMIN_EMAIL);
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); attempt(email, password); };
  const useDemo = () => { setEmail(DEMO_STAFF.email); setPassword(DEMO_STAFF.password); attempt(DEMO_STAFF.email, DEMO_STAFF.password); };
  const bad = !!err.form;

  return (
    <div className="site" lang={lang}>
      <header className="topnav">
        <button className="back-label" onClick={onBack}><IconBack />{t(lang, "ad_back")}</button>
        <span className="spacer" />
        <LangToggle lang={lang} setLang={setLang} />
      </header>
      <main className="auth-layout single">
        <form className="login-card" onSubmit={submit} noValidate aria-describedby={err.form ? "adm-form-err" : undefined}>
          <span className="eyebrow">{t(lang, "st_admin")}</span>
          <h1>{t(lang, "ad_title")}</h1>
          <p className="fine">{t(lang, "ad_sub")}</p>
          {err.form && <p id="adm-form-err" className="notice blocked" role="alert"><strong>{err.form}</strong></p>}
          <div className="field">
            <label htmlFor="adm-email">{t(lang, "ad_email")}</label>
            <input id="adm-email" className="input" type="email" autoComplete="username" autoFocus value={email}
              aria-invalid={!!err.email || bad} aria-describedby={err.email ? "adm-email-err" : undefined}
              onChange={(e) => { setEmail(e.target.value); setErr((x) => ({ ...x, email: undefined, form: undefined })); }} placeholder="name@udyamdigital.in" />
            {err.email && <span id="adm-email-err" className="field-err" role="alert">{err.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="adm-pass">{t(lang, "ad_password")}</label>
            <div className="pass">
              <input id="adm-pass" className="input" type={show ? "text" : "password"} autoComplete="current-password" value={password}
                aria-invalid={!!err.password || bad} aria-describedby={err.password ? "adm-pass-err" : undefined}
                onChange={(e) => { setPassword(e.target.value); setErr((x) => ({ ...x, password: undefined, form: undefined })); }} />
              <button type="button" className="textbtn" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? t(lang, "ad_hide") : t(lang, "ad_show")}</button>
            </div>
            {err.password && <span id="adm-pass-err" className="field-err" role="alert">{err.password}</span>}
          </div>
          <button className="primary" type="submit">{t(lang, "ad_signin")}</button>
          {demoMode && <button type="button" className="secondary" onClick={useDemo}>{t(lang, "ad_use_demo")}</button>}
          <p className="fine">{t(lang, "ad_sso")}</p>
        </form>
      </main>
    </div>
  );
}
