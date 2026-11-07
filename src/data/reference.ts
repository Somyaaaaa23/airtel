import type { Segment, Tier } from "../engine/types";
import cityList from "./cities.json";

/** Business types seen in smb_leads.csv, with the segment the dataset assigns them. */
export interface BusinessType { id: string; en: string; hi: string; segment: Segment; kw: RegExp }

export const BUSINESS_TYPES: BusinessType[] = [
  { id: "kirana", en: "Kirana store", hi: "किराना स्टोर", segment: "micro", kw: /kirana|grocery|general store|किराना|परचून/i },
  { id: "pharmacy", en: "Pharmacy", hi: "फ़ार्मेसी / केमिस्ट", segment: "micro", kw: /pharmacy|chemist|medical store|दवा|फ़ार्मेसी|फार्मेसी|केमिस्ट|मेडिकल/i },
  { id: "salon", en: "Salon", hi: "सैलून / पार्लर", segment: "micro", kw: /salon|parlou?r|barber|सैलून|पार्लर/i },
  { id: "bakery", en: "Bakery", hi: "बेकरी", segment: "micro", kw: /bakery|बेकरी/i },
  { id: "sweet", en: "Sweet shop", hi: "मिठाई की दुकान", segment: "micro", kw: /sweet|mithai|halwai|मिठाई|हलवाई/i },
  { id: "boutique", en: "Boutique", hi: "बुटीक", segment: "micro", kw: /boutique|tailor|बुटीक|दर्जी/i },
  { id: "hardware", en: "Hardware store", hi: "हार्डवेयर स्टोर", segment: "micro", kw: /hardware|हार्डवेयर/i },
  { id: "mobile_repair", en: "Mobile repair shop", hi: "मोबाइल रिपेयर शॉप", segment: "micro", kw: /mobile (?:repair|shop)|मोबाइल (?:रिपेयर|की दुकान)/i },
  { id: "optician", en: "Optician", hi: "चश्मे की दुकान", segment: "micro", kw: /optician|optical|spectacles|चश्म/i },
  { id: "stationery", en: "Stationery shop", hi: "स्टेशनरी", segment: "micro", kw: /stationery|स्टेशनरी/i },
  { id: "dental", en: "Dental clinic", hi: "डेंटल क्लिनिक", segment: "prof", kw: /dental|dentist|डेंटल|दांत/i },
  { id: "clinic", en: "Physiotherapy clinic", hi: "फ़िज़ियोथेरेपी क्लिनिक", segment: "prof", kw: /physio|फ़िज़ियो|फिजियो/i },
  { id: "lab", en: "Diagnostic lab", hi: "डायग्नोस्टिक लैब", segment: "prof", kw: /diagnostic|pathology|\blab\b|लैब|पैथोलॉजी/i },
  { id: "ca", en: "CA firm", hi: "सीए फ़र्म", segment: "prof", kw: /\bca\b|chartered accountant|accountant|सीए|अकाउंटेंट/i },
  { id: "law", en: "Law office", hi: "वकील का ऑफ़िस", segment: "prof", kw: /\blaw\b|lawyer|advocate|legal|वकील|लॉ फ़र्म/i },
  { id: "coaching", en: "Coaching centre", hi: "कोचिंग सेंटर", segment: "prof", kw: /coaching|tuition|institute|कोचिंग|ट्यूशन/i },
  { id: "insurance", en: "Insurance agency", hi: "बीमा एजेंसी", segment: "prof", kw: /insurance|बीमा|इंश्योरेंस/i },
  { id: "travel", en: "Travel agency", hi: "ट्रैवल एजेंसी", segment: "prof", kw: /travel|tour|ट्रैवल/i },
  { id: "realestate", en: "Real estate agency", hi: "रियल एस्टेट / प्रॉपर्टी", segment: "prof", kw: /real estate|property|broker|प्रॉपर्टी|रियल एस्टेट/i },
  { id: "architect", en: "Architecture studio", hi: "आर्किटेक्ट स्टूडियो", segment: "prof", kw: /architect|interior|आर्किटेक्ट/i },
  { id: "restaurant_chain", en: "Restaurant chain", hi: "रेस्टोरेंट चेन", segment: "multi", kw: /restaurant|cafe|café|dhaba|रेस्टोरेंट|कैफ़े|ढाबा/i },
  { id: "hotel", en: "Budget hotel group", hi: "होटल", segment: "multi", kw: /hotel|lodge|guest ?house|होटल|लॉज/i },
  { id: "gym", en: "Gym chain", hi: "जिम", segment: "multi", kw: /\bgym|fitness|जिम/i },
  { id: "preschool", en: "Pre-school chain", hi: "प्ले स्कूल", segment: "multi", kw: /pre-?school|play ?school|school|प्ले स्कूल|स्कूल/i },
  { id: "retail_chain", en: "Retail chain", hi: "रिटेल चेन", segment: "multi", kw: /retail chain|apparel|showroom|electronics|शोरूम|इलेक्ट्रॉनिक्स/i },
  { id: "printing", en: "Printing press", hi: "प्रिंटिंग प्रेस", segment: "mfg", kw: /printing|\bpress\b|प्रिंटिंग/i },
  { id: "furniture", en: "Furniture workshop", hi: "फ़र्नीचर वर्कशॉप", segment: "mfg", kw: /furniture|carpent|फ़र्नीचर|फर्नीचर/i },
  { id: "textile", en: "Textile unit", hi: "टेक्सटाइल यूनिट", segment: "mfg", kw: /textile|garment|weaving|टेक्सटाइल|कपड़ा मिल/i },
  { id: "packaging", en: "Packaging unit", hi: "पैकेजिंग यूनिट", segment: "mfg", kw: /packaging|पैकेजिंग/i },
  { id: "plastic", en: "Plastic moulding unit", hi: "प्लास्टिक मोल्डिंग यूनिट", segment: "mfg", kw: /plastic|moulding|molding|प्लास्टिक/i },
  { id: "autoparts", en: "Auto-parts unit", hi: "ऑटो-पार्ट्स यूनिट", segment: "mfg", kw: /auto ?parts|auto-parts|ऑटो पार्ट्स|ऑटो-पार्ट्स/i },
  { id: "food", en: "Food processing unit", hi: "फ़ूड प्रोसेसिंग यूनिट", segment: "mfg", kw: /food processing|फ़ूड प्रोसेसिंग|फूड प्रोसेसिंग/i },
  { id: "other_shop", en: "Other shop", hi: "अन्य दुकान", segment: "micro", kw: /\bshop\b|\bstore\b|dukaa?n|दुकान/i },
  { id: "other_office", en: "Other office", hi: "अन्य ऑफ़िस", segment: "prof", kw: /\boffice\b|consult|agency|ऑफ़िस|ऑफिस/i },
  { id: "factory", en: "Other factory / workshop", hi: "अन्य फ़ैक्ट्री / वर्कशॉप", segment: "mfg", kw: /factory|manufactur|workshop|\bunit\b|फ़ैक्ट्री|फैक्ट्री|कारखाना/i },
];

/** Shown as quick-pick chips; everything else is reachable by typing. */
export const QUICK_TYPES = ["kirana", "pharmacy", "salon", "dental", "ca", "coaching", "restaurant_chain", "hotel", "printing", "factory", "other_shop", "other_office"];

export interface City { city: string; state: string; tier: Tier; hi?: string }
const HI_CITY: Record<string, string> = {
  Ahmedabad: "अहमदाबाद", Bengaluru: "बेंगलुरु", Bhopal: "भोपाल", Chennai: "चेन्नई", Coimbatore: "कोयंबटूर",
  Delhi: "दिल्ली", Hyderabad: "हैदराबाद", Indore: "इंदौर", Jaipur: "जयपुर", Kochi: "कोच्चि", Kolkata: "कोलकाता",
  Lucknow: "लखनऊ", Ludhiana: "लुधियाना", Mumbai: "मुंबई", Mysuru: "मैसूरु", Nagpur: "नागपुर", Nashik: "नासिक",
  Patna: "पटना", Pune: "पुणे", Surat: "सूरत", Vadodara: "वडोदरा", Visakhapatnam: "विशाखापत्तनम",
};
export const CITIES: City[] = (cityList as City[]).map((c) => ({ ...c, hi: HI_CITY[c.city] }));
