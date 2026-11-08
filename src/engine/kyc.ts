/**
 * Smart KYC: turns OCR lines into document fields, then checks them against each other, the registries and the plan.
 * Pure TypeScript. Registry access is passed in so tests and the UI share the same rules.
 * Every result is a check code; the UI turns codes into plain English or Hindi (like eligibility blocks).
 */
import { maskId, STATE_CODES, validateGstinFormat, type GstinFormatError } from "./gstin";

/** "Today" for date checks, as the dataset README asks. */
export const KYC_TODAY = "2026-07-15";
export const ADDRESS_PROOF_MAX_DAYS = 90;

export type DocKind = "gst" | "udyam" | "id" | "address";
export const DOC_KINDS: DocKind[] = ["gst", "udyam", "id", "address"];

/** One OCR text line: text, box (x, y from top, width, height as page fractions) and recognition confidence. */
export type OcrLine = [text: string, x: number, y: number, w: number, h: number, conf: number];

const TITLES: [DocKind, RegExp][] = [
  ["gst", /GST Registration Certificate/i],
  ["udyam", /Udyam Registration Certificate/i],
  ["id", /Signatory ID/i],
  ["address", /Electricity Bill|Water Bill|Telephone Bill|Utility/i],
];

const LABELS: Record<DocKind, Record<string, RegExp>> = {
  gst: {
    gstin: /^GSTIN$/i, legalName: /^Legal name/i, tradeName: /^Trade name/i, constitution: /^Constitution/i,
    address: /^Address of principal|^place of business/i, liabilityDate: /^Date of liability/i, regType: /^Type of registration/i,
  },
  udyam: {
    udyamNumber: /^Udyam reg/i, name: /^Enterprise name/i, activity: /^Major activity/i, city: /^City$/i, state: /^State$/i,
    regDate: /^Date of registration/i,
  },
  id: { name: /^Name$/i, designation: /^Designation/i, business: /^For business/i, idNumber: /^ID no/i, validTill: /^Valid till/i },
  address: {
    consumerNo: /^Consumer no/i, billedTo: /^Billed to/i, address: /^Supply address/i, billDate: /^Bill date/i,
    units: /^Units consumed/i, amount: /^Amount due/i,
  },
};

/** Fields a document must show to be usable. */
const REQUIRED: Record<DocKind, string[]> = {
  gst: ["gstin", "legalName", "tradeName", "address"],
  udyam: ["udyamNumber", "name", "city", "state"],
  id: ["name", "business", "idNumber", "validTill"],
  address: ["billedTo", "address", "billDate"],
};

const BOILERPLATE = /^(Specimen:|Format for|Fictional utility|Accel YTL Hackathon|SYNTHETIC SPECIMEN)/i;
const TYPED: Partial<Record<string, RegExp>> = {
  gstin: /^[0-9A-Z]{15}$/, udyamNumber: /^UDYAM-/i, idNumber: /^SYN-ID-\d+$/i,
  billDate: /^\d{4}-\d{2}-\d{2}$/, validTill: /^\d{4}-\d{2}-\d{2}$/, regDate: /^\d{4}-\d{2}-\d{2}$/, liabilityDate: /^\d{4}-\d{2}-\d{2}$/,
};

export interface ParsedDoc {
  /** Document type read from its title; undefined when the title can't be read. */
  kind?: DocKind;
  fields: Record<string, string>;
  /** Mean OCR confidence of the body text (0–1). */
  confidence: number;
  /** False when the photo is too blurred or cut off to read the fields. */
  readable: boolean;
  /** GSTIN characters fixed after OCR (O read as 0 and similar). */
  ocrFixed?: boolean;
}

/** Joins a value that wrapped onto the next line ("…Visakhapatnam, A" + "ndhra Pradesh"). */
function joinWrapped(a: string, b: string) {
  if (!a) return b;
  if ((/[A-Za-z]$/.test(a) && /^[a-z]/.test(b)) || (/\d$/.test(a) && /^\d/.test(b))) return a + b;
  return `${a} ${b}`;
}

export function parseDocument(lines: OcrLine[]): ParsedDoc {
  const kind = TITLES.find(([, re]) => lines.some(([t]) => re.test(t)))?.[0];
  const body = lines.filter(([t]) => !BOILERPLATE.test(t.trim()) && t.trim().length > 0);
  const confidence = body.length ? body.reduce((s, l) => s + l[5], 0) / body.length : 0;
  if (!kind) return { kind, fields: {}, confidence, readable: false };

  const labels: { field: string; x: number; y: number; h: number }[] = [];
  const values: OcrLine[] = [];
  for (const line of body) {
    const field = Object.entries(LABELS[kind]).find(([, re]) => re.test(line[0].trim()))?.[0];
    if (field) labels.push({ field, x: line[1], y: line[2], h: line[4] });
    else values.push(line);
  }

  // Photos are often slightly rotated, which pushes values below their label's row. Find the vertical shift that
  // best lines values up with labels, then give each value to the closest label on its row or above it.
  const mid = (l: { y: number; h: number }) => l.y + l.h / 2;
  const labelMids = labels.map(mid);
  let shift = 0;
  let best = Infinity;
  for (let d = -0.01; d <= 0.06; d += 0.002) {
    const cost = values.reduce((s, v) => s + Math.min(0.02, ...labelMids.map((m) => Math.abs(mid({ y: v[2], h: v[4] }) - d - m))), 0);
    if (cost < best - 1e-9) { best = cost; shift = d; }
  }
  const parts: Record<string, { y: number; text: string }[]> = {};
  for (const [text, x, y, , h] of values) {
    const typed = Object.entries(TYPED).find(([f, re]) => f in LABELS[kind] && re!.test(text.trim()))?.[0];
    const vy = y + h / 2 - shift;
    const owner = typed ?? labels
      .filter((l) => mid(l) <= vy + 0.012 && l.x <= x + 0.01)
      .sort((a, b) => mid(b) - mid(a) || b.x - a.x)[0]?.field;
    if (owner) (parts[owner] ??= []).push({ y, text: text.trim() });
  }
  const fields: Record<string, string> = {};
  for (const [f, ps] of Object.entries(parts)) {
    ps.sort((a, b) => a.y - b.y);
    // Only addresses wrap onto a second line; for other fields extra lines are stray OCR fragments.
    fields[f] = f === "address"
      ? ps.reduce((acc, p) => joinWrapped(acc, p.text), "").replace(/\s*-\s*(?=\d{6}\b)/, " - ")
      : ps[0].text;
  }

  let ocrFixed: boolean | undefined;
  if (fields.gstin) {
    const fixed = fixGstinOcr(fields.gstin);
    ocrFixed = fixed !== fields.gstin.toUpperCase();
    fields.gstin = fixed;
  }
  const found = REQUIRED[kind].filter((f) => fields[f]).length;
  const readable = confidence >= 0.6 && found >= Math.ceil(REQUIRED[kind].length / 2);
  return { kind, fields, confidence, readable, ocrFixed };
}

const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "5": "S", "8": "B", "2": "Z" };
const TO_DIGIT: Record<string, string> = { O: "0", I: "1", S: "5", B: "8", Z: "2", D: "0" };
// Character class of each GSTIN position: d = digit, l = letter, a = either.
const GSTIN_SHAPE = "ddllllldddd" + "la" + "Z" + "a";

/**
 * OCR often reads O as 0 (and I as 1) in a GSTIN. Fix characters that can only be letters or only digits,
 * then, for the two positions that can be either, keep the variant whose checksum is valid.
 */
export function fixGstinOcr(raw: string): string {
  const g = raw.replace(/\s/g, "").toUpperCase();
  if (g.length !== 15) return g;
  const chars = [...g].map((c, i) => {
    const shape = GSTIN_SHAPE[i];
    if (shape === "d") return TO_DIGIT[c] ?? c;
    if (shape === "l") return TO_LETTER[c] ?? c;
    if (shape === "Z") return c === "2" ? "Z" : c;
    return c;
  });
  const swap: Record<string, string> = { "0": "O", O: "0", "1": "I", I: "1" };
  const candidates = [chars.join("")];
  for (const i of [12, 14]) {
    for (const c of [...candidates]) if (swap[c[i]]) candidates.push(c.slice(0, i) + swap[c[i]] + c.slice(i + 1));
  }
  return candidates.find((c) => validateGstinFormat(c).ok) ?? candidates[0];
}

export interface RegistryGst { gstin: string; legalName: string; tradeName: string; constitution: string; address: string; status: "Active" | "Cancelled" | "Suspended" }
export interface RegistryUdyam { udyamNumber: string; enterpriseName: string; city: string; state: string }
export interface Registry {
  gstin: (g: string) => RegistryGst | undefined;
  udyam: (u: string) => RegistryUdyam | undefined;
  /** All GSTINs, used to suggest the record a mistyped or altered GSTIN was meant to be. */
  allGstins: () => string[];
}

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckCode =
  | "missing" | "unreadable" | "wrong_kind" | "field_missing"
  | "gstin_format" | "gstin_registry" | "gst_name" | "gst_address"
  | "udyam_format" | "udyam_registry" | "udyam_name" | "udyam_place"
  | "names_match" | "signatory" | "id_valid" | "address_recent" | "address_match" | "business_proof"
  | "gstin_quote" | "state_match" | "applicant_match" | "pan_format";

export interface Check {
  code: CheckCode;
  status: CheckStatus;
  doc?: DocKind;
  /** Values for the explanation text. Identifiers are already masked. */
  params?: Record<string, string | number>;
}

export interface KycInput {
  docs: Partial<Record<DocKind, ParsedDoc>>;
  /** True when the plan contains products that need an active GSTIN. */
  needsGst: boolean;
  today?: string;
  /** What the owner told us before KYC: the application the documents must match. */
  application?: {
    /** Name the owner gave as the person signing. */
    name?: string;
    /** GSTIN typed in the advisor chat. */
    gstin?: string;
    /** State of the city named in the advisor. */
    state?: string;
    /** Business PAN, accepted as business proof when the plan doesn't need GST. */
    pan?: string;
  };
}

/** PAN: 5 letters (4th = entity type; this dataset uses X), 4 digits, 1 letter. */
export const PAN_RE = /^[A-Z]{3}[ABCFGHLJPTX][A-Z]\d{4}[A-Z]$/;
const sameId = (a: string, b: string) => a.replace(/O/g, "0").replace(/I/g, "1") === b.replace(/O/g, "0").replace(/I/g, "1");

export interface KycResult {
  checks: Check[];
  status: "verified" | "review" | "fix";
  gstVerified: boolean;
  udyamVerified: boolean;
  /** Business name and signatory as read from the documents, for the order. */
  businessName?: string;
  signatory?: string;
  city?: string;
  pincode?: string;
}

export const normName = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/\b(m\/s|the)\b/g, " ").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
/** Edit distance, for names where OCR may drop or swap a letter. */
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
/** Same name, allowing about one OCR slip per 15 characters. */
export const sameName = (a: string, b: string) => {
  const x = normName(a), y = normName(b);
  return x === y || editDistance(x, y) <= Math.floor(Math.max(x.length, y.length) / 15);
};
const normAddr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const pinOf = (s?: string) => s?.match(/\b\d{6}\b/)?.[0];
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

/** "Neha Kaur (Prop. Vindhya Tours & Travels)" → proprietor "Neha Kaur", business "Vindhya Tours & Travels". */
function splitLegalName(legal: string) {
  const m = legal.match(/^(.*?)\s*\(Prop\.?\s*(.*?)\)\s*$/i);
  return m ? { person: m[1], business: m[2] } : { person: undefined, business: legal };
}

/** A registry GSTIN one character away (ignoring O/0 and I/1 confusion): what an altered or mistyped number was meant to be. */
function hammingNeighbour(g: string, all: string[]) {
  const n = (s: string) => s.replace(/O/g, "0").replace(/I/g, "1");
  const t = n(g);
  return all.find((x) => x !== g && [...n(x)].filter((c, i) => c !== t[i]).length <= 1);
}

export function runKyc({ docs, needsGst, today = KYC_TODAY, application = {} }: KycInput, reg: Registry): KycResult {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);
  const usable: Partial<Record<DocKind, ParsedDoc>> = {};

  // 1. Can we read each document, and is it the document we asked for?
  for (const kind of DOC_KINDS) {
    const d = docs[kind];
    if (!d) {
      const required = kind === "id" || kind === "address" || (kind === "gst" && needsGst);
      if (required) add({ code: "missing", status: "fail", doc: kind });
      continue;
    }
    if (!d.readable && !d.kind) { add({ code: "unreadable", status: "fail", doc: kind }); continue; }
    if (d.kind && d.kind !== kind) { add({ code: "wrong_kind", status: "fail", doc: kind, params: { found: d.kind } }); continue; }
    if (!d.readable) { add({ code: "unreadable", status: "fail", doc: kind }); continue; }
    const missing = REQUIRED[kind].filter((f) => !d.fields[f]);
    if (missing.length) { add({ code: "field_missing", status: "fail", doc: kind, params: { field: missing[0] } }); continue; }
    usable[kind] = d;
  }

  // 2. GST certificate against the registry.
  let gstVerified = false;
  let gstRecord: RegistryGst | undefined;
  const gst = usable.gst?.fields;
  if (gst) {
    const fmt = validateGstinFormat(gst.gstin);
    if (!fmt.ok) {
      const near = fmt.error === "checksum" || fmt.error === "pan" ? hammingNeighbour(gst.gstin, reg.allGstins()) : undefined;
      // Name only the differing character, so the hint helps without revealing the rest of the number.
      const pos = near ? [...near].findIndex((c, i) => c.replace("O", "0") !== gst.gstin[i].replace("O", "0")) : -1;
      add({ code: "gstin_format", status: "fail", doc: "gst", params: {
        masked: maskId(gst.gstin), error: fmt.error as GstinFormatError,
        ...(pos >= 0 ? { pos: pos + 1, found: gst.gstin[pos], expected: near![pos] } : {}),
      } });
    } else {
      gstRecord = reg.gstin(gst.gstin);
      if (!gstRecord) add({ code: "gstin_registry", status: "fail", doc: "gst", params: { masked: maskId(gst.gstin), state: "notfound" } });
      else if (gstRecord.status !== "Active") {
        add({ code: "gstin_registry", status: needsGst ? "fail" : "warn", doc: "gst", params: { masked: maskId(gst.gstin), state: gstRecord.status } });
      } else {
        add({ code: "gstin_registry", status: "pass", doc: "gst", params: { masked: maskId(gst.gstin), state: "Active" } });
      }
      // The certificate must be for the GSTIN the owner gave in the chat, and for the state they said they're in.
      if (application.gstin) {
        const same = sameId(gst.gstin, application.gstin.toUpperCase());
        add({ code: "gstin_quote", status: same ? "pass" : "fail", doc: "gst", params: { masked: maskId(gst.gstin), given: maskId(application.gstin.toUpperCase()) } });
      }
      const gstState = STATE_CODES[gst.gstin.slice(0, 2)];
      const addrState = gstRecord?.address ?? gst.address;
      const stateOk = (!application.state || sameName(application.state, gstState)) && normAddr(addrState).includes(normAddr(gstState));
      add({ code: "state_match", status: stateOk ? "pass" : "fail", doc: "gst", params: { gstState, stated: application.state ?? gstState } });
      if (gstRecord) {
        const nameOk = sameName(gstRecord.legalName, gst.legalName) && sameName(gstRecord.tradeName, gst.tradeName);
        add({ code: "gst_name", status: nameOk ? "pass" : "fail", doc: "gst", params: { doc: nameOk ? gst.tradeName : gst.legalName, registry: gstRecord.legalName } });
        const addrOk = normAddr(gstRecord.address) === normAddr(gst.address);
        add({ code: "gst_address", status: addrOk ? "pass" : "fail", doc: "gst" });
        gstVerified = gstRecord.status === "Active" && nameOk && addrOk;
      }
    }
  }

  // 3. Udyam certificate against the registry.
  let udyamVerified = false;
  const ud = usable.udyam?.fields;
  if (ud) {
    const num = ud.udyamNumber.toUpperCase().replace(/\s/g, "");
    if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(num)) add({ code: "udyam_format", status: "fail", doc: "udyam", params: { masked: maskId(num) } });
    else {
      const rec = reg.udyam(num);
      if (!rec) add({ code: "udyam_registry", status: "fail", doc: "udyam", params: { masked: maskId(num) } });
      else {
        add({ code: "udyam_registry", status: "pass", doc: "udyam", params: { masked: maskId(num) } });
        const nameOk = sameName(rec.enterpriseName, ud.name);
        const placeOk = sameName(rec.city, ud.city) && sameName(rec.state, ud.state);
        if (!nameOk) add({ code: "udyam_name", status: "fail", doc: "udyam", params: { doc: ud.name, registry: rec.enterpriseName } });
        if (!placeOk) add({ code: "udyam_place", status: "fail", doc: "udyam", params: { doc: ud.city, registry: rec.city } });
        udyamVerified = nameOk && placeOk;
      }
    }
  }

  // 4. Same business on every document.
  const names: [DocKind, string][] = [];
  if (gst) names.push(["gst", gst.tradeName]);
  if (ud) names.push(["udyam", ud.name]);
  if (usable.id) names.push(["id", usable.id.fields.business]);
  if (usable.address) names.push(["address", usable.address.fields.billedTo]);
  const businessName = names[0]?.[1];
  if (names.length >= 2) {
    const odd = names.find(([, n]) => !sameName(n, businessName!));
    add(odd
      ? { code: "names_match", status: "fail", doc: odd[0], params: { found: odd[1], expected: businessName! } }
      : { code: "names_match", status: "pass", params: { name: businessName! } });
  }

  // 5. Signatory: the proprietor themselves, or a partner / director, or someone who needs an authorisation letter.
  const id = usable.id?.fields;
  if (id) {
    const legal = gst ? splitLegalName(gst.legalName) : undefined;
    const constitution = gstRecord?.constitution ?? gst?.constitution ?? "";
    if (legal?.person && /propriet/i.test(constitution)) {
      const ok = sameName(legal.person, id.name);
      add({ code: "signatory", status: ok ? "pass" : "fail", doc: "id", params: { name: id.name, owner: legal.person, kind: ok ? "owner" : "notowner" } });
    } else if (/partner|director/i.test(id.designation ?? "")) {
      add({ code: "signatory", status: "pass", doc: "id", params: { name: id.name, owner: "", kind: "partner" } });
    } else {
      add({ code: "signatory", status: "warn", doc: "id", params: { name: id.name, owner: "", kind: "letter" } });
    }
    if (application.name) {
      const ok = sameName(application.name, id.name);
      add({ code: "applicant_match", status: ok ? "pass" : "fail", doc: "id", params: { name: id.name, applicant: application.name } });
    }
    const left = daysBetween(today, id.validTill);
    add({ code: "id_valid", status: Number.isNaN(left) || left < 0 ? "fail" : "pass", doc: "id", params: { date: id.validTill } });
  }

  // 6. Address proof: recent, and for the registered address.
  const addr = usable.address?.fields;
  if (addr) {
    const age = daysBetween(addr.billDate, today);
    const recent = !Number.isNaN(age) && age >= 0 && age <= ADDRESS_PROOF_MAX_DAYS;
    add({ code: "address_recent", status: recent ? "pass" : "fail", doc: "address", params: { date: addr.billDate, cutoff: addDays(today, -ADDRESS_PROOF_MAX_DAYS) } });
    const ref = gstRecord?.address ?? gst?.address;
    if (ref) {
      const ok = normAddr(ref) === normAddr(addr.address) || (pinOf(ref) === pinOf(addr.address) && normAddr(addr.address).includes(normAddr(ref).slice(0, 12)));
      add({ code: "address_match", status: ok ? "pass" : "fail", doc: "address", params: { pin: pinOf(addr.address) ?? "" } });
    } else if (ud) {
      const ok = normAddr(addr.address).includes(normAddr(ud.city));
      add({ code: "address_match", status: ok ? "pass" : "fail", doc: "address", params: { pin: pinOf(addr.address) ?? "" } });
    }
  }

  // 7. The plan's business-proof rule. Without GST products, a business PAN is accepted; the team confirms it with the tax department.
  let panOk = false;
  if (application.pan && !needsGst && !gstVerified && !udyamVerified) {
    const pan = application.pan.toUpperCase().replace(/\s/g, "");
    panOk = PAN_RE.test(pan);
    add({ code: "pan_format", status: panOk ? "warn" : "fail", params: { masked: maskId(pan) } });
  }
  const proofOk = needsGst ? gstVerified : gstVerified || udyamVerified || panOk;
  add({ code: "business_proof", status: proofOk ? "pass" : "fail", params: { need: needsGst ? "gst" : "any" } });

  const status = checks.some((c) => c.status === "fail") ? "fix" : checks.some((c) => c.status === "warn") ? "review" : "verified";
  const cityFromAddr = addr?.address.match(/,\s*([^,]+),\s*[^,]+-\s*\d{6}/)?.[1];
  return {
    checks, status, gstVerified, udyamVerified, businessName,
    signatory: id?.name, city: ud?.city ?? cityFromAddr, pincode: pinOf(addr?.address ?? gst?.address),
  };
}
