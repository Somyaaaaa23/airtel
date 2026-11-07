import type { ReactNode } from "react";
import type { Lang } from "../i18n/strings";

const svg = (d: ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const IconBack = () => svg(<path d="M15 18l-6-6 6-6" />);
export const IconSend = () => svg(<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>, 20);
export const IconCheck = () => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 30);
export const IconSpark = () => svg(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" /></>, 20);

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language">
      <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
      <button aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हि</button>
    </div>
  );
}

export function Bar({ title, onBack, backLabel, right }: { title: string; onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <header className="bar">
      {onBack ? <button className="iconbtn" onClick={onBack} aria-label={backLabel ?? "Back"}><IconBack /></button> : <span style={{ width: 4 }} />}
      <h1>{title}</h1>
      {right}
    </header>
  );
}
