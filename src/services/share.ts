/** Plain-text quote summary for sharing on WhatsApp, in the owner's language. */
import { product } from "../engine/catalogue";
type Item = { productId: string; qty: number };
import { inr, t, type Lang } from "../i18n/strings";

export function quoteShareText(lang: Lang, items: Item[], monthly: number, standard: number, heldUntilText?: string): string {
  const lines = items.map((i) => `• ${product(i.productId).name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join("\n");
  return [
    t(lang, "sh_head"),
    lines,
    t(lang, "sh_price", { price: inr(monthly), standard: inr(standard) }),
    heldUntilText ? t(lang, "sh_held", { until: heldUntilText }) : "",
  ].filter(Boolean).join("\n");
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
