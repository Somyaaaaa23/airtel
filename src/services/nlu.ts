/**
 * Understands free-text answers in English, Hindi and Hinglish ("mujhe CCTV aur WhatsApp chahiye, 2 dukaan hai").
 * Deterministic keyword + pattern matching, so every extraction is explainable. An LLM can replace or sit in front of
 * this layer later, but the catalogue rules engine always makes the final product decision.
 */
import { BUSINESS_TYPES, CITIES } from "../data/reference";
import type { Need, SpeedPref } from "../engine/types";

export interface Extracted {
  businessTypeId?: string;
  chain?: boolean;
  employees?: number;
  sites?: number;
  city?: string;
  gstin?: string;
  hasGstin?: boolean;
  needs: Need[];
  speedPref?: SpeedPref;
  lines?: number;
  cameras?: number;
  vehicles?: number;
  machines?: number;
  pincode?: string;
  monthlySpend?: number;
}

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const normalise = (s: string) =>
  s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d))).replace(/\s+/g, " ").trim();

const NEED_PATTERNS: [Need, RegExp][] = [
  ["guest_wifi", /(guest|customer|free|public)\s*wi-?fi|wi-?fi (?:for|to) (?:customers|guests|clients)|ग्राहकों (?:के लिए|को) वाई-?फ़ाई|गेस्ट वाई-?फ़ाई/i],
  ["backup_internet", /backup (?:internet|line|connection)|failover|(?:internet|net) (?:goes|keeps going) down|बैकअप (?:इंटरनेट|नेट)|नेट (?:बार-बार )?(?:बंद|चला) जाता/i],
  ["internet", /internet|broadband|fib(?:re|er)|wi-?fi|\bnet\b|इंटरनेट|ब्रॉडबैंड|वाई-?फ़ाई|वाईफाई|नेट कनेक्शन/i],
  ["mobile_lines", /\bsims?\b|mobile (?:plan|connection|line)|postpaid|phone (?:line|number)s? for (?:staff|team)|सिम|मोबाइल (?:प्लान|कनेक्शन)|पोस्टपेड/i],
  ["calling", /ivr|call recording|telephony|calling system|landline|reception (?:phone|line)|आईवीआर|कॉल रिकॉर्डिंग|लैंडलाइन/i],
  ["toll_free", /toll.?free|\b1800\b|टोल.?फ़्री|टोल.?फ्री/i],
  ["whatsapp", /whats ?app|व्हाट्सऐप|व्हाट्सएप|वॉट्सऐप/i],
  ["sms", /\bsms\b|bulk (?:message|sms)|text (?:message|alert)s?|एसएमएस/i],
  ["email_office", /e-?mail|office suite|google workspace|video meetings?|ईमेल|ई-मेल/i],
  ["website", /website|web ?site|online presence|वेबसाइट/i],
  ["pos_billing", /billing|\bpos\b|\bupi\b|card payments?|bill banana|inventory|बिलिंग|बिल|यूपीआई|पेमेंट/i],
  ["cctv", /cctv|cameras?|सीसीटीवी|कैमरा|कैमरे/i],
  ["device_security", /anti-?virus|virus|ransomware|endpoint|hack|एंटीवायरस|वायरस|हैक/i],
  ["firewall", /firewall|फ़ायरवॉल|फायरवॉल/i],
  ["data_backup", /(?:data|cloud|file|pc|computer) backup|backup (?:of|my) (?:data|files|pcs?|computers?)|डेटा बैकअप/i],
  ["static_ip", /static ip|fixed ip|public ip|स्टैटिक आईपी/i],
  ["multisite_network", /sd-?wan|connect (?:all )?(?:my |our )?(?:branches|sites|outlets)|central(?:ly)? manage|सभी ब्रांच/i],
  ["machine_iot", /machine (?:monitoring|uptime)|\biot\b|sensors?|energy use|मशीन (?:मॉनिटरिंग|की निगरानी)/i],
  ["fleet", /\bgps\b|fleet|vehicle track|track(?:ing)? (?:my )?(?:vehicles|trucks|vans|bikes)|जीपीएस|गाड़ी ट्रैक|गाड़ियों की ट्रैकिंग/i],
];

const num = (re: RegExp, s: string) => {
  const m = s.match(re);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
};

export function extract(input: string): Extracted {
  const s = normalise(input);
  const out: Extracted = { needs: [] };

  // GSTIN first, so its digits are not read as counts.
  const gstin = s.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i);
  if (gstin) { out.gstin = gstin[0].toUpperCase(); out.hasGstin = true; }
  const rest = gstin ? s.replace(gstin[0], " ") : s;

  if (/(?:\bno|without|don'?t have|do not have|not registered|nahi(?:n)?|nai)\s*(?:a\s*|any\s*)?(?:gst|जीएसटी)|(?:gst|जीएसटी)\s*(?:nahi(?:n)?|nai|नहीं|not|nhi)|बिना\s*जीएसटी|जीएसटी\s*नहीं/i.test(rest)) out.hasGstin = false;
  else if (!gstin && /\bgst(?:in)?\b|जीएसटी/i.test(rest) && /\b(have|registered|yes|hai|है)\b/i.test(rest)) out.hasGstin = true;

  const bt = BUSINESS_TYPES.find((b) => b.kw.test(rest));
  if (bt) out.businessTypeId = bt.id;
  if (/\bchain\b|branches|outlets|चेन|ब्रांचें/i.test(rest)) out.chain = true;

  const city = CITIES.find((c) => new RegExp(`\\b${c.city}\\b`, "i").test(rest) || (c.hi && rest.includes(c.hi)));
  if (city) out.city = city.city;

  out.employees = num(/(\d[\d,]*)\s*(?:staff|employees?|people|workers?|members?|log|लोग|कर्मचारी|स्टाफ़?|आदमी)/i, rest)
    ?? num(/(?:staff|team|employees?)\s*(?:of|is|are|hai|=)?\s*(\d[\d,]*)/i, rest);
  out.sites = num(/(\d+)\s*(?:sites?|branch(?:es)?|outlets?|shops?|stores?|locations?|centres?|centers?|clinics?|offices|dukaan|dukan|शाखाएँ|शाखा|ब्रांच|दुकानें|दुकान|आउटलेट)/i, rest);
  out.cameras = num(/(\d+)\s*(?:cctv\s*)?(?:cameras?|कैमरे|कैमरा)/i, rest);
  out.vehicles = num(/(\d+)\s*(?:vehicles?|trucks?|vans?|bikes?|cars?|गाड़ियाँ|गाड़ियां|गाड़ी|ट्रक)/i, rest);
  out.lines = num(/(\d+)\s*(?:sims?|lines?|mobile connections?|सिम)/i, rest);
  out.machines = num(/(\d+)\s*(?:machines?|मशीनें|मशीन)/i, rest);
  out.monthlySpend = num(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₹|rs\.?|rupees|रुपये|रु\.?)/i, rest.replace(/(\d[\d,]*)\s*(₹|rs\.?|rupees|रुपये|रु\.?)/i, "₹$1"));
  const pin = rest.match(/\b[1-9]\d{5}\b/);
  if (pin) out.pincode = pin[0];

  if (/1\s*gbps|gigabit|\b1g\b|1000\s*mbps/i.test(rest)) out.speedPref = "gigabit";
  else if (/leased|dedicated|\bsla\b|लीज़्?ड/i.test(rest)) out.speedPref = "dedicated";
  else if (/300\s*mbps|fast(?:er)? internet|high.?speed|तेज़ इंटरनेट|तेज इंटरनेट/i.test(rest)) out.speedPref = "fast";
  if (out.speedPref) out.needs.push("internet");

  for (const [need, re] of NEED_PATTERNS) if (re.test(rest) && !out.needs.includes(need)) out.needs.push(need);
  // "wifi" for guests shouldn't also count as the owner asking for an internet line; the engine adds one anyway.
  if (out.needs.includes("guest_wifi") && !/internet|broadband|fib(?:re|er)|इंटरनेट/i.test(rest)) out.needs = out.needs.filter((n) => n !== "internet");
  // "backup internet" is a backup need, not a data-backup need.
  if (out.needs.includes("backup_internet")) out.needs = out.needs.filter((n) => n !== "data_backup");
  if (out.cameras && !out.needs.includes("cctv")) out.needs.push("cctv");
  if (out.vehicles && !out.needs.includes("fleet") && /track|gps|ट्रैक/i.test(rest)) out.needs.push("fleet");
  return out;
}
