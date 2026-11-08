/** Demo businesses for judges and the demo video. GSTINs come from the mock registry. */
export type DemoCategory = "retail" | "health" | "hosp" | "mfg" | "services";
export interface Demo {
  id: string; title: string; shows: string; text: string; pincode?: string;
  /** Short card fields for the scenario library. */
  name: string; city: string; category: DemoCategory; context: string; tags: string[]; featured?: boolean;
}

export const DEMOS: Demo[] = [
  {
    id: "kirana", name: "Kirana store", city: "Patna", category: "retail", context: "3 staff · 1 shop", tags: ["No GST", "CCTV", "WhatsApp"], featured: true,
    title: "Kirana in Patna, no GST",
    shows: "WhatsApp API is left out (needs GST); CCTV brings its own fibre line.",
    text: "Kirana store in Patna, 3 staff, 1 shop, no GST. Need CCTV with 4 cameras, WhatsApp for orders and UPI billing. We spend ₹800 a month",
  },
  {
    id: "dental", name: "Dental clinic", city: "Kochi", category: "health", context: "12 staff · 1 clinic", tags: ["1 Gbps asked", "Tier-2 city", "GST verified"],
    title: "Dental clinic in Kochi asks for 1 Gbps",
    shows: "1 Gbps is sold only in Tier-1 cities, so the advisor offers 300 Mbps.",
    text: "Dental clinic in Kochi, 12 staff, 1 clinic, GSTIN 32TTNXB7384T1ZW. Need 1 Gbps internet, IVR phone line, email and antivirus",
  },
  {
    id: "restaurant", name: "Restaurant chain", city: "Mumbai", category: "hosp", context: "60 staff · 6 outlets", tags: ["Multi-site", "SD-WAN", "CCTV"], featured: true,
    title: "Restaurant chain in Mumbai, 6 outlets",
    shows: "SD-WAN, billing and CCTV sized per outlet; GSTIN verified.",
    text: "Restaurant chain in Mumbai with 6 outlets, 60 staff, GSTIN 27DIDXN3795G1ZF. Connect all branches, billing, CCTV and wifi for customers",
  },
  {
    id: "factory", name: "Packaging unit", city: "Patna", category: "mfg", context: "30 staff · 1 site", tags: ["No fibre", "Leased line", "Machine IoT"],
    title: "Packaging unit, no fibre at the site",
    shows: "Leased line can't reach PIN 800006, so 5G AirFiber; wired-only add-ons are blocked.",
    text: "Packaging unit in Patna, 30 staff, 1 site, GSTIN 10EHQXC2517S1ZN. Need a dedicated leased line, static IP, firewall and machine monitoring for 8 machines. Pincode 800006",
  },
  {
    id: "cancelled", name: "General store", city: "Bengaluru", category: "retail", context: "4 staff · 1 shop", tags: ["Cancelled GSTIN", "SMS", "WhatsApp"],
    title: "General store with a cancelled GSTIN",
    shows: "The registry shows the GSTIN as cancelled, so SMS and WhatsApp API are blocked.",
    text: "General store in Bengaluru, 4 staff, 1 shop, GSTIN 29OKAXP4077P1ZL. Want SMS offers, WhatsApp and internet",
  },
  {
    id: "insurance", name: "Insurance agency", city: "Visakhapatnam", category: "services", context: "6 staff · 1 office", tags: ["Full journey", "KYC passes", "E-sign"], featured: true,
    title: "Insurance agency in Visakhapatnam: full journey",
    shows: "GSTIN matches specimen K09, so KYC, e-sign, payment and the tracker all go through.",
    text: "Insurance agency in Visakhapatnam, 6 staff, 1 office, GSTIN 37LDYXK0296F1ZB. Need internet, email and antivirus. We spend ₹4000 a month. Pincode 530017",
  },
  {
    id: "furniture", name: "Furniture workshop", city: "Nagpur", category: "mfg", context: "15 staff · 1 site", tags: ["Full journey", "CCTV", "Priority install"], featured: true,
    title: "Furniture workshop in Nagpur: full journey",
    shows: "GSTIN matches specimen K03; CCTV and machine monitoring need a site visit.",
    text: "Furniture workshop in Nagpur, 15 staff, 1 site, GSTIN 27XUIXG0767D1ZP. Need internet, CCTV with 4 cameras and machine monitoring for 10 machines. We spend ₹6000 a month. Pincode 440001",
  },
  {
    id: "hindi", name: "दवा की दुकान (Hindi)", city: "Indore", category: "health", context: "5 staff · 1 shop", tags: ["Hindi", "No GST", "CCTV"],
    title: "हिंदी में: इंदौर की दवा की दुकान",
    shows: "Typed in Hindi with Hindi digits; switch the app to हि to reply in Hindi.",
    text: "मेरी दवा की दुकान है इंदौर में, ५ कर्मचारी, GST नहीं है, इंटरनेट और सीसीटीवी कैमरा चाहिए",
  },
];

/** The hackathon pack's 12 KYC applicants and what each one shows in Smart KYC. */
export const KYC_DEMOS: { id: string; shows: string }[] = [
  { id: "K01", shows: "GSTIN is cancelled in the registry and the Udyam number is missing from the certificate." },
  { id: "K02", shows: "Tilted photo; OCR reads an O as 0 in the GSTIN, and the checksum fixes it. Passes." },
  { id: "K03", shows: "Clean manufacturer file. Passes." },
  { id: "K04", shows: "Blurred GST certificate: asked to retake the photo." },
  { id: "K05", shows: "LLP signed by someone who isn't a partner: order allowed, team asks for a letter." },
  { id: "K06", shows: "GSTIN differs from the registry by one digit; the real record is suggested." },
  { id: "K07", shows: "Legal name on the GST certificate doesn't match the registry." },
  { id: "K08", shows: "OCR O/0 slip in the GSTIN, fixed by the checksum. Passes." },
  { id: "K09", shows: "Clean proprietorship. Passes." },
  { id: "K10", shows: "LLP 'owner' without partner status: goes to review." },
  { id: "K11", shows: "Electricity bill is 8 months old (limit 90 days)." },
  { id: "K12", shows: "Clean proprietorship. Passes." },
];
