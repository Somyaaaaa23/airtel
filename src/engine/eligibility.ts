import { FIBRE_PRODUCTS, product } from "./catalogue";
import type { Block, Profile } from "./types";

/** Every catalogue rule that can stop a product being sold to this business, ignoring dependencies. */
export function checkProduct(id: string, profile: Profile): Block[] {
  const p = product(id);
  const blocks: Block[] = [];
  if (!p.tiers.includes(profile.tier)) blocks.push({ code: "tier", allowed: p.tiers });
  if (profile.employees < p.minEmployees) blocks.push({ code: "employees", min: p.minEmployees });
  if (profile.sites < p.minSites) blocks.push({ code: "sites", min: p.minSites });
  if (p.requiresGstin && !profile.hasActiveGstin) blocks.push({ code: "gstin" });
  if (FIBRE_PRODUCTS.has(id) && profile.fibreFeasible === false) blocks.push({ code: "fibre" });
  return blocks;
}

export const isEligible = (id: string, profile: Profile) => checkProduct(id, profile).length === 0;

/** null when the product's `requires_one_of` rule is met by the bundle. */
export function checkDependency(id: string, bundle: string[]): Extract<Block, { code: "dependency" }> | null {
  const opts = product(id).requiresOneOf;
  if (!opts.length || opts.some((o) => bundle.includes(o))) return null;
  return { code: "dependency", options: opts };
}

/** Products in the bundle that would lose their only qualifying dependency if `removeId` were removed. */
export function dependentsOf(removeId: string, bundle: string[]): string[] {
  const rest = bundle.filter((b) => b !== removeId);
  return rest.filter((id) => {
    const opts = product(id).requiresOneOf;
    return opts.includes(removeId) && !opts.some((o) => rest.includes(o));
  });
}

/** Full check of a bundle as the owner has toggled it: eligibility + dependencies. */
export function validateBundle(bundle: string[], profile: Profile): { productId: string; blocks: Block[] }[] {
  const problems: { productId: string; blocks: Block[] }[] = [];
  for (const id of bundle) {
    const blocks = checkProduct(id, profile);
    const dep = checkDependency(id, bundle);
    if (dep) blocks.push(dep);
    if (blocks.length) problems.push({ productId: id, blocks });
  }
  return problems;
}
