export type Segment = "micro" | "prof" | "multi" | "mfg";
export type Tier = 1 | 2;

export interface Product {
  id: string;
  category: string;
  name: string;
  description: string;
  unit: string;
  priceMin: number;
  priceMax: number;
  /** List price used in quotes: midpoint of the catalogue range (matches how bundles were priced in smb_leads.csv). */
  price: number;
  setup: number;
  minContract: number;
  tiers: Tier[];
  minEmployees: number;
  minSites: number;
  requiresGstin: boolean;
  /** Bundle must contain at least one of these products. Empty = no dependency. */
  requiresOneOf: string[];
  installDays: number;
  segments: Segment[];
}

/** What the business wants to do. Each need maps to one product (see recommend.ts). */
export type Need =
  | "internet"
  | "backup_internet"
  | "mobile_lines"
  | "calling"
  | "toll_free"
  | "whatsapp"
  | "sms"
  | "email_office"
  | "website"
  | "pos_billing"
  | "cctv"
  | "guest_wifi"
  | "device_security"
  | "firewall"
  | "data_backup"
  | "static_ip"
  | "multisite_network"
  | "machine_iot"
  | "fleet";

export type SpeedPref = "auto" | "basic" | "fast" | "gigabit" | "dedicated";

export interface Profile {
  businessType?: string;
  segment: Segment;
  employees: number;
  sites: number;
  city?: string;
  tier: Tier;
  /** True only when the business has a GSTIN that is Active in the registry. */
  hasActiveGstin: boolean;
  /** Registry status when the owner gave a GSTIN; drives the "your GSTIN is cancelled" note. */
  gstinStatus?: "Active" | "Cancelled" | "Suspended" | "NotFound";
  monthlySpend?: number;
  /** GSTIN the owner typed in the advisor and the registry legal name, so KYC can check the certificate is the same one. */
  gstin?: string;
  legalName?: string;
  /** State of the city the owner named (undefined for "other city"). */
  state?: string;
  /** What they use for internet today (advisor chip key, e.g. "net_hotspot"). */
  currentInternet?: string;
  needs: Need[];
  speedPref: SpeedPref;
  /** Optional quantities the owner told us. */
  lines?: number;
  cameras?: number;
  vehicles?: number;
  machines?: number;
  /** Result of the site feasibility check. Undefined = not checked yet (assume feasible). */
  fibreFeasible?: boolean;
}

export type Block =
  | { code: "tier"; allowed: Tier[] }
  | { code: "employees"; min: number }
  | { code: "sites"; min: number }
  | { code: "gstin" }
  | { code: "fibre" }
  | { code: "dependency"; options: string[] };

export type ItemReason =
  | { kind: "asked"; need: Need }
  | { kind: "base"; for: string[] } // connectivity needed by these products
  | { kind: "addon"; segment: Segment }
  | { kind: "substitute"; for: string; need: Need }; // offered because the asked-for product isn't allowed

export interface LineItem {
  productId: string;
  qty: number;
  reason: ItemReason;
  /** Add-ons start switched off; the owner can turn them on. */
  optional: boolean;
}

export interface Blocked {
  productId: string;
  need?: Need;
  blocks: Block[];
  /** Product offered instead, if any. */
  alternative?: string;
}

export interface Note {
  code: "downgraded" | "airfiber_fallback" | "gstin_inactive";
  from?: string;
  to?: string;
  blocks?: Block[];
}

export interface Plan {
  /** starter = Essential (cheapest that meets the needs), pro = recommended with every add-on. */
  key: "recommended" | "starter" | "pro";
  items: LineItem[];
}

export interface Recommendation {
  plans: Plan[];
  addons: LineItem[];
  blocked: Blocked[];
  notes: Note[];
}

export interface QuoteLine {
  product: Product;
  qty: number;
  monthly: number;
  setup: number;
}

export interface Quote {
  lines: QuoteLine[];
  monthly: number;
  setup: number;
  contractMonths: number;
  goLiveDays: number;
}
