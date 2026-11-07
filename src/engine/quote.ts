import { product } from "./catalogue";
import type { Quote } from "./types";

/**
 * Prices a bundle the same way bundles in smb_leads.csv were priced:
 * monthly = sum(list price x qty), setup = sum(setup fee x qty), contract = longest minimum contract.
 * Installs run in parallel, so go-live = slowest product's typical install days.
 */
export function computeQuote(items: { productId: string; qty: number }[]): Quote {
  const lines = items.map(({ productId, qty }) => {
    const p = product(productId);
    return { product: p, qty, monthly: p.price * qty, setup: p.setup * qty };
  });
  return {
    lines,
    monthly: lines.reduce((s, l) => s + l.monthly, 0),
    setup: lines.reduce((s, l) => s + l.setup, 0),
    contractMonths: lines.reduce((m, l) => Math.max(m, l.product.minContract), 0),
    goLiveDays: lines.reduce((m, l) => Math.max(m, l.product.installDays), 0),
  };
}
