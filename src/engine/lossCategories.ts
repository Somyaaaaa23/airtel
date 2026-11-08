/**
 * Why a lost lead was lost, in four categories. "Lost to our own process" is defined here once and used by the
 * back-office build script, the command centre and the tests, so the headline number always means the same thing.
 */
export type LossKind = "process" | "reach" | "choice" | "network";

/** Drop reasons caused by how we sell, verify, sign, bill or install: things this journey can fix. */
export const OWN_PROCESS_REASONS = [
  "Visit not scheduled by sales", "Owner had no time for a visit", "Only wanted a mobile plan", "Quote too complex to understand",
  "Quote took too long to arrive", "Missing GST or Udyam document", "Found paperwork too long", "Authorised signatory not available",
  "Document details did not match", "Installation delayed beyond 21 days", "Customer cancelled before install", "First payment failed",
] as const;
export const UNREACHABLE_REASONS = ["Unreachable after 3 attempts", "Not interested on first call", "Wrong or invalid number"] as const;
export const NO_NETWORK_REASONS = ["Site not feasible for fibre"] as const;

export function lossOf(reason: string): LossKind {
  if ((OWN_PROCESS_REASONS as readonly string[]).includes(reason)) return "process";
  if ((UNREACHABLE_REASONS as readonly string[]).includes(reason)) return "reach";
  if ((NO_NETWORK_REASONS as readonly string[]).includes(reason)) return "network";
  return "choice";
}

export const LOSS_LABEL: Record<LossKind, { en: string; hi: string }> = {
  process: { en: "Our own process", hi: "हमारी अपनी प्रक्रिया" },
  reach: { en: "Unreachable or not interested", hi: "संपर्क नहीं हुआ या रुचि नहीं" },
  choice: { en: "Chose not to buy", hi: "ख़रीदने का फ़ैसला नहीं किया" },
  network: { en: "No network at site", hi: "साइट पर नेटवर्क नहीं" },
};

export const LOST_TO_OWN_PROCESS = {
  en: "Lost leads whose drop reason is one of ours: visits not scheduled, slow or confusing quotes, paperwork, document mismatches, signatory or payment problems, cancellations and install delays. It excludes leads we couldn't reach, owners who chose not to buy, and sites without network.",
  hi: "वे खोई हुई लीड जिनकी वजह हमारी ओर से थी: विज़िट तय न होना, धीमा या उलझा कोटेशन, काग़ज़ी काम, दस्तावेज़ मेल न खाना, साइन करने वाले या भुगतान की दिक़्क़त, रद्द होना और इंस्टॉल में देरी। इसमें वे लीड नहीं हैं जिनसे संपर्क नहीं हुआ, जिन्होंने न ख़रीदने का फ़ैसला किया, या जिनकी साइट पर नेटवर्क नहीं था।",
};

/** Share of lost leads that were lost to our own process, in percent. */
export function lostToOwnProcessPct(loss: Record<LossKind, number>): number {
  const total = loss.process + loss.reach + loss.choice + loss.network;
  return total ? (loss.process / total) * 100 : 0;
}
