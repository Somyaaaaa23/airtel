/** Catches a crash in any screen and shows a calm, bilingual recovery screen instead of a blank page. */
import { Component, type ReactNode } from "react";
import { t } from "../i18n/strings";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Screen failed to render", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash" role="alert">
        <h1>{t("en", "pl_err_t")}</h1>
        <p>{t("en", "pl_err_b")}</p>
        <h2 lang="hi">{t("hi", "pl_err_t")}</h2>
        <p lang="hi">{t("hi", "pl_err_b")}</p>
        <div className="row2 equal">
          <button className="secondary" onClick={() => location.assign(location.pathname)}>{t("en", "pl_err_home")} · {t("hi", "pl_err_home")}</button>
          <button className="primary" onClick={() => location.reload()}>{t("en", "pl_err_retry")} · {t("hi", "pl_err_retry")}</button>
        </div>
      </main>
    );
  }
}
