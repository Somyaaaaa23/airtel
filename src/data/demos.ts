/** Demo businesses for judges and the demo video. GSTINs come from the mock registry. */
export type DemoCategory = "retail" | "health" | "hosp" | "mfg" | "services";
export interface Demo {
  id: string; title: string; shows: string; text: string; pincode?: string;
  /** Short card fields for the scenario library. */
  name: string; city: string; category: DemoCategory; context: string; tags: string[]; featured?: boolean;
  /** Expected outcome in Hindi (the English is `shows`). */
  showsHi: string;
  /** Card fields in Hindi. */
  nameHi: string; contextHi: string; tagsHi: string[];
  /** The catalogue rule or check this scenario demonstrates. */
  rule: { code: string; en: string; hi: string };
}

export const DEMOS: Demo[] = [
  {
    id: "kirana", name: "Kirana store", city: "Patna", category: "retail", context: "3 staff · 1 shop", tags: ["No GST", "CCTV", "WhatsApp"], featured: true,
    nameHi: "किराना स्टोर", contextHi: "3 स्टाफ़ · 1 दुकान", tagsHi: ["GST नहीं", "CCTV", "WhatsApp"],
    showsHi: "WhatsApp API छोड़ा गया (GST चाहिए); CCTV के साथ अपनी फ़ाइबर लाइन आती है।",
    rule: { code: "requires_gstin", en: "Products marked requires_gstin need an active GST registration.", hi: "requires_gstin वाले प्रोडक्ट के लिए सक्रिय GST रजिस्ट्रेशन ज़रूरी है।" },
    title: "Kirana in Patna, no GST",
    shows: "WhatsApp API is left out (needs GST); CCTV brings its own fibre line.",
    text: "Kirana store in Patna, 3 staff, 1 shop, no GST. Need CCTV with 4 cameras, WhatsApp for orders and UPI billing. We spend ₹800 a month",
  },
  {
    id: "dental", name: "Dental clinic", city: "Kochi", category: "health", context: "12 staff · 1 clinic", tags: ["1 Gbps asked", "Tier-2 city", "GST verified"],
    nameHi: "डेंटल क्लिनिक", contextHi: "12 स्टाफ़ · 1 क्लिनिक", tagsHi: ["1 Gbps माँगा", "टियर-2 शहर", "GST वेरिफ़ाई"],
    showsHi: "1 Gbps सिर्फ़ टियर-1 शहरों में मिलता है, इसलिए एडवाइज़र 300 Mbps देता है।",
    rule: { code: "available_city_tiers", en: "Each product lists the city tiers where it is sold; 1 Gbps is Tier-1 only.", hi: "हर प्रोडक्ट उन शहरों के टियर बताता है जहाँ वह मिलता है; 1 Gbps सिर्फ़ टियर-1 में।" },
    title: "Dental clinic in Kochi asks for 1 Gbps",
    shows: "1 Gbps is sold only in Tier-1 cities, so the advisor offers 300 Mbps.",
    text: "Dental clinic in Kochi, 12 staff, 1 clinic, GSTIN 32TTNXB7384T1ZW. Need 1 Gbps internet, IVR phone line, email and antivirus",
  },
  {
    id: "restaurant", name: "Restaurant chain", city: "Mumbai", category: "hosp", context: "60 staff · 6 outlets", tags: ["Multi-site", "SD-WAN", "CCTV"], featured: true,
    nameHi: "रेस्टोरेंट चेन", contextHi: "60 स्टाफ़ · 6 आउटलेट", tagsHi: ["कई साइट", "SD-WAN", "CCTV"],
    showsHi: "SD-WAN, बिलिंग और CCTV हर आउटलेट के हिसाब से; GSTIN वेरिफ़ाई।",
    rule: { code: "min_sites", en: "SD-WAN needs at least 3 sites; per-site items scale with outlets.", hi: "SD-WAN के लिए कम से कम 3 साइट चाहिए; हर साइट वाले आइटम आउटलेट के हिसाब से बढ़ते हैं।" },
    title: "Restaurant chain in Mumbai, 6 outlets",
    shows: "SD-WAN, billing and CCTV sized per outlet; GSTIN verified.",
    text: "Restaurant chain in Mumbai with 6 outlets, 60 staff, GSTIN 27DIDXN3795G1ZF. Connect all branches, billing, CCTV and wifi for customers",
  },
  {
    id: "factory", name: "Packaging unit", city: "Patna", category: "mfg", context: "30 staff · 1 site", tags: ["No fibre", "Leased line", "Machine IoT"],
    nameHi: "पैकेजिंग यूनिट", contextHi: "30 स्टाफ़ · 1 साइट", tagsHi: ["फ़ाइबर नहीं", "लीज़्ड लाइन", "मशीन IoT"],
    showsHi: "PIN 800006 तक लीज़्ड लाइन नहीं पहुँचती, इसलिए 5G AirFiber; सिर्फ़-वायर्ड ऐड-ऑन रुके।",
    rule: { code: "requires_one_of + feasibility", en: "Wired add-ons need a wired line; no fibre at the PIN code means 5G AirFiber.", hi: "वायर्ड ऐड-ऑन के लिए वायर्ड लाइन चाहिए; PIN पर फ़ाइबर न हो तो 5G AirFiber।" },
    title: "Packaging unit, no fibre at the site",
    shows: "Leased line can't reach PIN 800006, so 5G AirFiber; wired-only add-ons are blocked.",
    text: "Packaging unit in Patna, 30 staff, 1 site, GSTIN 10EHQXC2517S1ZN. Need a dedicated leased line, static IP, firewall and machine monitoring for 8 machines. Pincode 800006",
  },
  {
    id: "cancelled", name: "General store", city: "Bengaluru", category: "retail", context: "4 staff · 1 shop", tags: ["Cancelled GSTIN", "SMS", "WhatsApp"],
    nameHi: "जनरल स्टोर", contextHi: "4 स्टाफ़ · 1 दुकान", tagsHi: ["GSTIN रद्द", "SMS", "WhatsApp"],
    showsHi: "रजिस्ट्री में GSTIN रद्द है, इसलिए SMS और WhatsApp API रुके।",
    rule: { code: "GSTIN registry status", en: "A cancelled or suspended GSTIN counts as no GSTIN.", hi: "रद्द या निलंबित GSTIN को GSTIN नहीं माना जाता।" },
    title: "General store with a cancelled GSTIN",
    shows: "The registry shows the GSTIN as cancelled, so SMS and WhatsApp API are blocked.",
    text: "General store in Bengaluru, 4 staff, 1 shop, GSTIN 29OKAXP4077P1ZL. Want SMS offers, WhatsApp and internet",
  },
  {
    id: "insurance", name: "Insurance agency", city: "Visakhapatnam", category: "services", context: "6 staff · 1 office", tags: ["Full journey", "KYC passes", "E-sign"], featured: true,
    nameHi: "बीमा एजेंसी", contextHi: "6 स्टाफ़ · 1 ऑफ़िस", tagsHi: ["पूरी यात्रा", "KYC पास", "ई-साइन"],
    showsHi: "GSTIN नमूना K09 से मेल खाता है, इसलिए KYC, ई-साइन, भुगतान और ट्रैकर सब पूरे होते हैं।",
    rule: { code: "KYC: GSTIN = certificate = registry", en: "The GSTIN typed in chat must match the GST certificate and the registry (specimen K09).", hi: "चैट में लिखा GSTIN, GST सर्टिफ़िकेट और रजिस्ट्री से मेल खाना चाहिए (नमूना K09)।" },
    title: "Insurance agency in Visakhapatnam: full journey",
    shows: "GSTIN matches specimen K09, so KYC, e-sign, payment and the tracker all go through.",
    text: "Insurance agency in Visakhapatnam, 6 staff, 1 office, GSTIN 37LDYXK0296F1ZB. Need internet, email and antivirus. We spend ₹4000 a month. Pincode 530017",
  },
  {
    id: "furniture", name: "Furniture workshop", city: "Nagpur", category: "mfg", context: "15 staff · 1 site", tags: ["Full journey", "CCTV", "Priority install"], featured: true,
    nameHi: "फ़र्नीचर वर्कशॉप", contextHi: "15 स्टाफ़ · 1 साइट", tagsHi: ["पूरी यात्रा", "CCTV", "प्राथमिकता इंस्टॉल"],
    showsHi: "GSTIN नमूना K03 से मेल खाता है; CCTV और मशीन मॉनिटरिंग के लिए साइट विज़िट।",
    rule: { code: "manufacturer playbook", en: "Manufacturers get the priority install crew; the GSTIN matches specimen K03.", hi: "मैन्युफ़ैक्चरर को प्राथमिकता इंस्टॉल टीम मिलती है; GSTIN नमूना K03 से मेल खाता है।" },
    title: "Furniture workshop in Nagpur: full journey",
    shows: "GSTIN matches specimen K03; CCTV and machine monitoring need a site visit.",
    text: "Furniture workshop in Nagpur, 15 staff, 1 site, GSTIN 27XUIXG0767D1ZP. Need internet, CCTV with 4 cameras and machine monitoring for 10 machines. We spend ₹6000 a month. Pincode 440001",
  },
  {
    id: "hindi", name: "Pharmacy (Hindi message)", city: "Indore", category: "health", context: "5 staff · 1 shop", tags: ["Hindi", "No GST", "CCTV"],
    nameHi: "दवा की दुकान", contextHi: "5 स्टाफ़ · 1 दुकान", tagsHi: ["हिंदी", "GST नहीं", "CCTV"],
    showsHi: "हिंदी और हिंदी अंकों में लिखा; हिंदी में जवाब के लिए ऐप को हि पर करें।",
    rule: { code: "language understanding", en: "Hindi words and Devanagari digits are parsed into the same profile.", hi: "हिंदी शब्द और देवनागरी अंक उसी प्रोफ़ाइल में बदले जाते हैं।" },
    title: "हिंदी में: इंदौर की दवा की दुकान",
    shows: "Typed in Hindi with Hindi digits; switch the app to हि to reply in Hindi.",
    text: "मेरी दवा की दुकान है इंदौर में, ५ कर्मचारी, GST नहीं है, इंटरनेट और सीसीटीवी कैमरा चाहिए",
  },
];

/** The hackathon pack's 12 KYC applicants and what each one shows in Smart KYC. */
export const KYC_DEMOS: { id: string; shows: string; showsHi: string }[] = [
  { id: "K01", shows: "GSTIN is cancelled in the registry and the Udyam number is missing from the certificate.", showsHi: "रजिस्ट्री में GSTIN रद्द है और सर्टिफ़िकेट पर उद्यम नंबर नहीं है।" },
  { id: "K02", shows: "Tilted photo; OCR reads an O as 0 in the GSTIN, and the checksum fixes it. Passes.", showsHi: "तिरछी फ़ोटो; OCR ने GSTIN में O को 0 पढ़ा, चेकसम ने ठीक किया। पास।" },
  { id: "K03", shows: "Clean manufacturer file. Passes.", showsHi: "साफ़ मैन्युफ़ैक्चरर फ़ाइल। पास।" },
  { id: "K04", shows: "Blurred GST certificate: asked to retake the photo.", showsHi: "धुँधला GST सर्टिफ़िकेट: फिर से फ़ोटो लेने को कहा गया।" },
  { id: "K05", shows: "LLP signed by someone who isn't a partner: order allowed, team asks for a letter.", showsHi: "LLP पर ऐसे व्यक्ति के साइन जो पार्टनर नहीं: ऑर्डर हो सकता है, टीम पत्र माँगेगी।" },
  { id: "K06", shows: "GSTIN differs from the registry by one digit; the real record is suggested.", showsHi: "GSTIN रजिस्ट्री से एक अंक अलग है; असली रिकॉर्ड सुझाया जाता है।" },
  { id: "K07", shows: "Legal name on the GST certificate doesn't match the registry.", showsHi: "GST सर्टिफ़िकेट पर कानूनी नाम रजिस्ट्री से मेल नहीं खाता।" },
  { id: "K08", shows: "OCR O/0 slip in the GSTIN, fixed by the checksum. Passes.", showsHi: "GSTIN में OCR की O/0 गलती, चेकसम से ठीक। पास।" },
  { id: "K09", shows: "Clean proprietorship. Passes.", showsHi: "साफ़ प्रोप्राइटरशिप। पास।" },
  { id: "K10", shows: "LLP 'owner' without partner status: goes to review.", showsHi: "LLP 'मालिक' बिना पार्टनर दर्जे के: जाँच में जाता है।" },
  { id: "K11", shows: "Electricity bill is 8 months old (limit 90 days).", showsHi: "बिजली का बिल 8 महीने पुराना है (सीमा 90 दिन)।" },
  { id: "K12", shows: "Clean proprietorship. Passes.", showsHi: "साफ़ प्रोप्राइटरशिप। पास।" },
];
