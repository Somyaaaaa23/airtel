/** Six one-digit boxes for a one-time code: typing moves forward, Backspace moves back, arrows move, paste fills all. */
import { useRef } from "react";

export function OtpInput({ value, onChange, invalid, label, labelFor, autoFocus }: {
  value: string; onChange: (v: string) => void; invalid?: boolean; label: string; labelFor: (i: number) => string; autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => (value[i] && value[i] !== " " ? value[i] : ""));
  // Empty boxes are kept as spaces so a digit typed into box 4 stays in box 4.
  const emit = (next: string[]) => onChange(next.map((d) => d || " ").join("").trimEnd());
  const focus = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  /** Reads the boxes themselves, so quick keystrokes never work from a stale render. */
  const current = () => refs.current.map((el) => (el?.value ?? "").replace(/\D/g, "").slice(-1));
  const setAt = (i: number, d: string) => {
    const next = current();
    next[i] = d;
    emit(next);
  };
  const fill = (text: string, from: number) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = current();
    for (let k = 0; k < clean.length && from + k < 6; k++) next[from + k] = clean[k];
    emit(next);
    focus(Math.min(5, from + clean.length));
  };

  return (
    <div className={`otp ${invalid ? "invalid" : ""}`} role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className={d ? "filled" : ""} inputMode="numeric" pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={i === 0 ? 6 : 1} value={d} aria-label={labelFor(i + 1)}
          aria-invalid={invalid || undefined} autoFocus={autoFocus && i === 0}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) return fill(v, i); // autofill or fast typing
            setAt(i, v);
            if (v) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]) { e.preventDefault(); setAt(i - 1 < 0 ? 0 : i - 1, ""); focus(i - 1); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
            else if (e.key === "ArrowRight") { e.preventDefault(); focus(i + 1); }
          }}
          onPaste={(e) => { e.preventDefault(); fill(e.clipboardData.getData("text"), i); }}
          onFocus={(e) => e.target.select()} />
      ))}
    </div>
  );
}
