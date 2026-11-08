/** WCAG 2.1 contrast helpers and a reader for the colour tokens declared in styles.css. */

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hex colour tokens from one CSS block, e.g. `{ "--text": "#1f2328" }`. */
export function readTokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

/** Light tokens (first :root block) and dark tokens (light overridden by the dark media-query block). */
export function themeTokens(css: string) {
  const light = readTokens(css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {"))));
  const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
  const darkBlock = css.slice(darkStart, css.indexOf("}\n}", darkStart));
  return { light, dark: { ...light, ...readTokens(darkBlock) } };
}

/** Foreground/background pairs that carry text somewhere in the app. */
export const TEXT_PAIRS: [fg: string, bg: string][] = [
  ["--text", "--bg"], ["--text", "--surface"], ["--text", "--surface-2"], ["--text", "--surface-3"],
  ["--text-2", "--bg"], ["--text-2", "--surface"], ["--text-2", "--surface-2"], ["--text-2", "--surface-3"],
  ["--primary-text", "--surface"], ["--primary-text", "--primary-soft"], ["--primary-text", "--bg"],
  ["--on-primary", "--primary"], ["--on-primary", "--primary-hover"],
  ["--info", "--info-soft"], ["--info", "--surface"], ["--info", "--surface-2"], ["--info", "--surface-3"],
  ["--ok", "--ok-soft"], ["--ok", "--surface"], ["--warn-text", "--warn-soft"], ["--warn-text", "--surface"],
  ["--bad", "--bad-soft"], ["--bad", "--surface"], ["--text", "--primary-soft"], ["--text", "--warn-soft"], ["--text", "--bad-soft"],
  ["--on-inverse", "--inverse"], ["--on-inverse-2", "--inverse"], ["--text", "--ok-soft"],
];
