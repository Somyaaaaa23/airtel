import raw from "../data/product_catalogue.csv?raw";
import { parseCsv } from "./csv";
import type { Product, Segment, Tier } from "./types";

export function loadCatalogue(text: string): Product[] {
  return parseCsv(text).map((r) => {
    const priceMin = Number(r.price_min_inr_per_month);
    const priceMax = Number(r.price_max_inr_per_month);
    return {
      id: r.product_id,
      category: r.category,
      name: r.product_name,
      description: r.description,
      unit: r.unit,
      priceMin,
      priceMax,
      price: Math.round((priceMin + priceMax) / 2),
      setup: Number(r.one_time_setup_inr),
      minContract: Number(r.min_contract_months),
      tiers: r.available_city_tiers.split(";").map(Number) as Tier[],
      minEmployees: Number(r.min_employees),
      minSites: Number(r.min_sites),
      requiresGstin: r.requires_gstin === "Y",
      requiresOneOf: r.requires_one_of ? r.requires_one_of.split("|") : [],
      installDays: Number(r.typical_install_days),
      segments: r.target_segments.split(";") as Segment[],
    };
  });
}

export const CATALOGUE: Product[] = loadCatalogue(raw);
export const PRODUCTS: Record<string, Product> = Object.fromEntries(CATALOGUE.map((p) => [p.id, p]));
export const product = (id: string): Product => {
  const p = PRODUCTS[id];
  if (!p) throw new Error(`Unknown product ${id}`);
  return p;
};

/** Products delivered over fibre: unavailable when the site fails the fibre feasibility check. */
export const FIBRE_PRODUCTS = new Set(["P01", "P02", "P03", "P05", "P06"]);
export const CONNECTIVITY = ["P01", "P02", "P03", "P04", "P05", "P06"];
