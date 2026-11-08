/** Staff sign-in page for the command centre. */
import { useState } from "react";
import { IconBack } from "../components/ui";
import { ADMIN_EMAIL, checkAdmin } from "../services/admin";

export function AdminLogin({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setErr("Enter your email and password.");
    if (!checkAdmin(email, password)) return setErr("That email and password don't match a staff account.");
    setErr("");
    onSignedIn(ADMIN_EMAIL);
  };

  return (
    <div className="site">
      <header className="topnav">
        <button className="iconbtn" onClick={onBack} aria-label="Back"><IconBack /></button>
        <span className="spacer" />
      </header>
      <main className="auth-layout single">
      <form className="login-card" onSubmit={submit} noValidate>
        <span className="eyebrow">Accel team</span>
        <h1>Command centre sign-in</h1>
        <p className="fine">Segments, leak finder, simulator, operations and lead scoring.</p>
        <div className="field">
          <label htmlFor="adm-email">Work email</label>
          <input id="adm-email" className="input" type="email" autoComplete="username" autoFocus value={email} aria-invalid={!!err}
            onChange={(e) => setEmail(e.target.value)} placeholder="name@udyamdigital.in" />
        </div>
        <div className="field">
          <label htmlFor="adm-pass">Password</label>
          <div className="pass">
            <input id="adm-pass" className="input" type={show ? "text" : "password"} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="textbtn" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
          </div>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
        <button className="primary" type="submit">Sign in</button>
        <p className="fine">Prototype sign-in. In production this would be Accel's single sign-on.</p>
      </form>
      </main>
    </div>
  );
}
