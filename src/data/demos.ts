/** Demo businesses for judges and the demo video. GSTINs come from the mock registry. */
export interface Demo { id: string; title: string; shows: string; text: string; pincode?: string }

export const DEMOS: Demo[] = [
  {
    id: "kirana", title: "Kirana in Patna, no GST",
    shows: "WhatsApp API is left out (needs GST); CCTV brings its own fibre line.",
    text: "Kirana store in Patna, 3 staff, 1 shop, no GST. Need CCTV with 4 cameras, WhatsApp for orders and UPI billing. We spend ₹800 a month",
  },
  {
    id: "dental", title: "Dental clinic in Kochi asks for 1 Gbps",
    shows: "1 Gbps is sold only in Tier-1 cities, so the advisor offers 300 Mbps.",
    text: "Dental clinic in Kochi, 12 staff, 1 clinic, GSTIN 32TTNXB7384T1ZW. Need 1 Gbps internet, IVR phone line, email and antivirus",
  },
  {
    id: "restaurant", title: "Restaurant chain in Mumbai, 6 outlets",
    shows: "SD-WAN, billing and CCTV sized per outlet; GSTIN verified.",
    text: "Restaurant chain in Mumbai with 6 outlets, 60 staff, GSTIN 27DIDXN3795G1ZF. Connect all branches, billing, CCTV and wifi for customers",
  },
  {
    id: "factory", title: "Packaging unit, no fibre at the site",
    shows: "Leased line can't reach PIN 800006, so 5G AirFiber; wired-only add-ons are blocked.",
    text: "Packaging unit in Patna, 30 staff, 1 site, GSTIN 10EHQXC2517S1ZN. Need a dedicated leased line, static IP, firewall and machine monitoring for 8 machines. Pincode 800006",
  },
  {
    id: "cancelled", title: "General store with a cancelled GSTIN",
    shows: "The registry shows the GSTIN as cancelled, so SMS and WhatsApp API are blocked.",
    text: "General store in Bengaluru, 4 staff, 1 shop, GSTIN 29OKAXP4077P1ZL. Want SMS offers, WhatsApp and internet",
  },
  {
    id: "hindi", title: "हिंदी में: इंदौर की दवा की दुकान",
    shows: "Typed in Hindi with Hindi digits; switch the app to हि to reply in Hindi.",
    text: "मेरी दवा की दुकान है इंदौर में, ५ कर्मचारी, GST नहीं है, इंटरनेट और सीसीटीवी कैमरा चाहिए",
  },
];
