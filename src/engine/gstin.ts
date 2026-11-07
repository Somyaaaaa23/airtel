const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** GST state codes (first two digits of a GSTIN). */
export const STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
  "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya",
  "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

export function gstinChecksum(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]);
    const prod = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export type GstinFormatError = "length" | "state" | "pan" | "entity" | "z" | "checksum";

/**
 * Structural check of a GSTIN: state code, embedded PAN, entity number, 'Z', checksum.
 * The PAN's 4th character (entity type) is normally one of ABCFGHLJPT; this dataset uses 'X' (see README), so X is accepted.
 */
export function validateGstinFormat(input: string): { ok: true; state: string; pan: string } | { ok: false; error: GstinFormatError } {
  const g = input.trim().toUpperCase();
  if (g.length !== 15) return { ok: false, error: "length" };
  const state = g.slice(0, 2);
  if (!STATE_CODES[state]) return { ok: false, error: "state" };
  const pan = g.slice(2, 12);
  if (!/^[A-Z]{3}[ABCFGHLJPTX][A-Z]\d{4}[A-Z]$/.test(pan)) return { ok: false, error: "pan" };
  if (!/^[1-9A-Z]$/.test(g[12])) return { ok: false, error: "entity" };
  if (g[13] !== "Z") return { ok: false, error: "z" };
  if (gstinChecksum(g.slice(0, 14)) !== g[14]) return { ok: false, error: "checksum" };
  return { ok: true, state: STATE_CODES[state], pan };
}

/** Masks an identifier for display and logs: keep first 5 and last 4 characters. */
export const maskId = (id: string) => (id.length <= 9 ? id : id.slice(0, 5) + "•".repeat(id.length - 9) + id.slice(-4));
