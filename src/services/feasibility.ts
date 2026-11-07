/**
 * Mock site-feasibility API. Production would query the fibre network inventory by address.
 * Deterministic for demos: a PIN code whose digits sum to a multiple of 7 has no fibre (about 1 in 7 sites).
 * Example without fibre: 452030. Example with fibre: 302001.
 */
export interface Feasibility { pincode: string; fibre: boolean; airfiber: boolean }

export const isValidPincode = (p: string) => /^[1-9]\d{5}$/.test(p.trim());

export async function checkFeasibility(pincode: string): Promise<Feasibility> {
  const p = pincode.trim();
  const digitSum = [...p].reduce((s, d) => s + Number(d), 0);
  return { pincode: p, fibre: digitSum % 7 !== 0, airfiber: true };
}
