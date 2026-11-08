import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../i18n/strings";
import { cycleFocus, FOCUSABLE, onGroupKeys } from "../a11y/keys";

const svg = (d: ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const IconBack = () => svg(<path d="M15 18l-6-6 6-6" />, 20);
export const IconSend = () => svg(<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>, 20);
export const IconCheck = () => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 30);
export const IconSpark = () => svg(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" /></>, 18);
export const IconArrow = () => svg(<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>, 16);
export const IconMenu = () => svg(<path d="M4 6h16M4 12h16M4 18h16" />, 20);
export const IconClose = () => svg(<path d="M6 6l12 12M18 6L6 18" />, 20);

/** Line icons used in navigation, service cards and scenario cards. One stroke style throughout. */
const PATHS: Record<string, string> = {
  overview: "M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5",
  services: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  plan: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  usage: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bills: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4",
  orders: "M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10",
  support: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6",
  language: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z",
  privacy: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
  signout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  internet: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  sim: "M7 2h7l5 5v15H7zM10 12h6v6h-6z",
  comms: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  cloud: "M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z",
  security: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
  cctv: "M3 7l12 4-2 5L3 12zM15 11l4-1M13 16l1 4h-4",
  owner: "M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6",
  team: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  rocket: "M5 15c-1 1-2 4-2 6 2 0 5-1 6-2M9 15l-3-3c2-5 6-9 13-9 0 7-4 11-9 13zM14 10a1.5 1.5 0 1 0 0-.01",
  retail: "M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6",
  health: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  hosp: "M6 3v8a3 3 0 0 0 6 0V3M9 3v18M17 3c-1.7 1-3 3-3 6v4h3v8",
  mfg: "M3 21V10l6 4V10l6 4V6h6v15zM3 21h18",
  services_cat: "M4 8h16v12H4zM9 8V5h6v3M4 13h16",
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return svg(<path d={PATHS[name] ?? PATHS.services} />, size);
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language / भाषा" onKeyDown={(e) => onGroupKeys(e, true)}>
      <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
      <button aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हि</button>
    </div>
  );
}

/** Accel mark and product name. */
export function Brand({ sub = "Accel Business", onClick }: { sub?: string; onClick?: () => void }) {
  const inner = <span><b>Udyam Digital</b><small>{sub}</small></span>;
  return onClick ? <button className="brand" onClick={onClick} aria-label="Udyam Digital home">{inner}</button> : <div className="brand">{inner}</div>;
}

/** Accessible dialog: focus moves in on open and back on close; Escape and the backdrop close it. */
export function Modal({ label, onClose, children, className = "" }: { label: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      const next = cycleFocus(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
      if (next >= 0) { e.preventDefault(); items[next].focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; before?.focus(); };
  }, []);
  return (
    <>
      <button className="scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</div>
    </>
  );
}

/** Kept for any screen that still renders its own header. */
export function Bar({ title, onBack, backLabel, right }: { title: string; onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <header className="ws-top">
      {onBack && <button className="iconbtn" onClick={onBack} aria-label={backLabel ?? "Back"}><IconBack /></button>}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/** "i" button with a definition. Opens on hover, keyboard focus or tap; Escape closes it. */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={`infotip ${open ? "open" : ""}`}>
      <button type="button" aria-label={`${label}: definition`} aria-describedby={id} aria-expanded={open}
        onClick={() => setOpen((v) => !v)} onBlur={() => setOpen(false)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>i</button>
      <span role="tooltip" id={id}>{text}</span>
    </span>
  );
}
