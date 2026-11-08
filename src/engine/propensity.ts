/**
 * Activation propensity: how likely a new lead is to end up activated, from what we know when the lead arrives.
 * Logistic regression trained on smb_leads.csv by scripts/build_backoffice.ts; weights ship in src/data/backoffice.json.
 * Only lead-time facts are used (no funnel dates, no outcome fields), so the score is available on day one.
 */
export interface LeadFeatures {
  source: string;
  segment: string;
  tier: number;
  language: string;
  employees: number;
  sites: number;
  turnover: string;
  hasGstin: boolean;
  hasUdyam: boolean;
  internet: string;
  spend: number;
  /** Number of products the lead asked about. */
  interests: number;
  role: string;
}

export interface Model {
  bias: number;
  weights: Record<string, number>;
  /** Standardisation of numeric features (one-hot features are left as 0/1). */
  mean: Record<string, number>;
  std: Record<string, number>;
}

const NUMERIC = ["log_employees", "log_spend", "sites", "interests"];

export function encode(f: LeadFeatures): Record<string, number> {
  const lang = f.language === "English" || f.language === "Hindi" ? f.language : "Regional";
  return {
    [`source=${f.source}`]: 1,
    [`segment=${f.segment}`]: 1,
    [`language=${lang}`]: 1,
    [`turnover=${f.turnover}`]: 1,
    [`internet=${f.internet}`]: 1,
    [`role=${f.role}`]: 1,
    tier2: f.tier === 2 ? 1 : 0,
    gstin: f.hasGstin ? 1 : 0,
    udyam: f.hasUdyam ? 1 : 0,
    log_employees: Math.log1p(f.employees),
    log_spend: Math.log1p(f.spend),
    sites: Math.min(f.sites, 20),
    interests: f.interests,
  };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function standardise(x: Record<string, number>, m: Model) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(x)) out[k] = k in m.mean ? (v - m.mean[k]) / (m.std[k] || 1) : v;
  return out;
}

export function score(m: Model, f: LeadFeatures): number {
  const x = standardise(encode(f), m);
  let z = m.bias;
  for (const [k, v] of Object.entries(x)) z += (m.weights[k] ?? 0) * v;
  return sigmoid(z);
}

/** Batch gradient descent with L2 penalty. Small data, so a plain loop is fast enough (~100 ms). */
export function fit(rows: { f: LeadFeatures; y: number }[], { l2 = 0.02, epochs = 600, lr = 0.5 } = {}): Model {
  const raw = rows.map((r) => encode(r.f));
  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};
  for (const k of NUMERIC) {
    const vals = raw.map((x) => x[k]);
    mean[k] = vals.reduce((s, v) => s + v, 0) / vals.length;
    std[k] = Math.sqrt(vals.reduce((s, v) => s + (v - mean[k]) ** 2, 0) / vals.length) || 1;
  }
  const model: Model = { bias: 0, weights: {}, mean, std };
  const xs = raw.map((x) => standardise(x, model));
  const keys = [...new Set(xs.flatMap((x) => Object.keys(x)))].sort();
  for (const k of keys) model.weights[k] = 0;
  const base = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  model.bias = Math.log(base / (1 - base));
  const n = rows.length;
  for (let e = 0; e < epochs; e++) {
    const grad: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = model.bias;
      for (const [k, v] of Object.entries(xs[i])) z += model.weights[k] * v;
      const err = sigmoid(z) - rows[i].y;
      gb += err;
      for (const [k, v] of Object.entries(xs[i])) grad[k] += err * v;
    }
    model.bias -= (lr * gb) / n;
    for (const k of keys) model.weights[k] -= lr * (grad[k] / n + l2 * model.weights[k]);
  }
  for (const k of keys) model.weights[k] = Math.round(model.weights[k] * 1e4) / 1e4;
  model.bias = Math.round(model.bias * 1e4) / 1e4;
  return model;
}

/** Area under the ROC curve: chance a random activated lead scores above a random dropped one. */
export function auc(scores: number[], labels: number[]): number {
  const idx = scores.map((s, i) => [s, labels[i]] as const).sort((a, b) => a[0] - b[0]);
  let rankSum = 0, pos = 0;
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j < idx.length && idx[j][0] === idx[i][0]) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (idx[k][1]) { rankSum += avgRank; pos++; }
    i = j;
  }
  const neg = idx.length - pos;
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

export function leadFromCsv(r: Record<string, string>): LeadFeatures {
  return {
    source: r.lead_source,
    segment: r.segment,
    tier: Number(r.city_tier),
    language: r.preferred_language,
    employees: Number(r.employee_count),
    sites: Number(r.num_sites),
    turnover: r.annual_turnover_band,
    hasGstin: r.has_gstin === "Y",
    hasUdyam: r.has_udyam === "Y",
    internet: r.current_internet,
    spend: Number(r.monthly_telecom_spend_inr),
    interests: r.products_of_interest ? r.products_of_interest.split(";").length : 0,
    role: r.contact_role,
  };
}

/** Plain-language name of a model feature, for the back-office "what drives the score" list. */
export function featureLabel(k: string): string {
  const [name, value] = k.split("=");
  if (value !== undefined) {
    const prefix: Record<string, string> = { source: "Came via", segment: "Segment:", language: "Prefers", turnover: "Turnover", internet: "Uses today:", role: "Contact is" };
    return `${prefix[name] ?? name} ${value}`;
  }
  const plain: Record<string, string> = {
    tier2: "Tier-2 city", gstin: "Has GSTIN", udyam: "Has Udyam registration", log_employees: "More employees",
    log_spend: "Higher telecom spend today", sites: "More sites", interests: "Asked about more products",
  };
  return plain[k] ?? k;
}
