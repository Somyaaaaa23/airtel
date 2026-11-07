import { BUSINESS_TYPES, CITIES } from "../data/reference";
import { product } from "../engine/catalogue";
import type { Block, ItemReason, Need, Note } from "../engine/types";
import { NEED_LABELS, PRODUCT_HI, t, UNIT_LABELS, type Lang } from "../i18n/strings";
import type { Draft } from "./flow";
import type { Extracted } from "../services/nlu";

export const pName = (id: string) => product(id).name;
/** Lower-cases the first letter for mid-sentence use, leaving acronyms (CA, GST) alone. */
export const lcFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
export const pBlurb = (id: string, lang: Lang) => (lang === "hi" ? PRODUCT_HI[id] : product(id).description);
export const unitLabel = (id: string, lang: Lang) => UNIT_LABELS[product(id).unit]?.[lang] ?? product(id).unit;
export const needLabel = (n: Need, lang: Lang) => NEED_LABELS[n][lang];
export const businessLabel = (id: string | undefined, lang: Lang) => {
  const b = BUSINESS_TYPES.find((x) => x.id === id);
  return b ? (lang === "hi" ? b.hi : lcFirst(b.en)) : lang === "hi" ? "बिज़नेस" : "business";
};

export function joinList(items: string[], lang: Lang) {
  if (items.length <= 1) return items.join("");
  const and = lang === "hi" ? " और " : " and ";
  return items.slice(0, -1).join(", ") + and + items[items.length - 1];
}

export function blockText(b: Block, lang: Lang): string {
  switch (b.code) {
    case "tier": return t(lang, "block_tier");
    case "employees": return t(lang, "block_employees", { min: b.min });
    case "sites": return t(lang, "block_sites", { min: b.min });
    case "gstin": return t(lang, "block_gstin");
    case "fibre": return t(lang, "block_fibre");
    case "dependency":
      if (b.options.includes("P04")) return t(lang, "block_dep_line");
      if (b.options.includes("P05")) return t(lang, "block_dep_wired");
      return t(lang, "block_dep_fibre");
  }
}

export function reasonText(r: ItemReason, lang: Lang): string {
  switch (r.kind) {
    case "asked": return t(lang, "why_asked", { need: needLabel(r.need, lang) });
    case "base": return t(lang, "why_base", { list: joinList(r.for.map(pName), lang) });
    case "substitute": return t(lang, "why_substitute", { product: pName(r.for) });
    case "addon": return t(lang, "why_addon");
  }
}

export function noteText(n: Note, lang: Lang): string {
  if (n.code === "downgraded") {
    return t(lang, "note_downgraded", { from: pName(n.from!), to: pName(n.to!), why: (n.blocks ?? []).map((b) => lcFirst(blockText(b, lang))).join("; ") });
  }
  return t(lang, n.code === "airfiber_fallback" ? "note_airfiber_fallback" : "note_gstin_inactive");
}

/** Short summary of what was understood from one typed message. */
export function summarise(e: Extracted, lang: Lang): string {
  const parts: string[] = [];
  if (e.businessTypeId) parts.push(businessLabel(e.businessTypeId, lang));
  if (e.city) { const c = CITIES.find((x) => x.city === e.city)!; parts.push(lang === "hi" ? c.hi ?? c.city : c.city); }
  if (e.employees !== undefined) parts.push(t(lang, "people", { n: e.employees }));
  if (e.sites !== undefined) parts.push(e.sites === 1 ? t(lang, "site_1") : t(lang, "sites_n", { n: e.sites }));
  if (e.hasGstin === false) parts.push(t(lang, "noGst"));
  if (e.gstin) parts.push("GSTIN");
  for (const n of e.needs) parts.push(needLabel(n, lang));
  return parts.join(" · ");
}

export const draftHasGst = (d: Draft) => d.gst === "Active" || d.gst === "later";
