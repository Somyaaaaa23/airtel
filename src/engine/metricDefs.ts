/** Plain definitions for every number in the command centre, shown in info tooltips. English and Hindi. */
import { LOST_TO_OWN_PROCESS } from "./lossCategories";

export type MetricId =
  | "leads" | "activated" | "leadToLive" | "chasingCalls" | "costPerActivation" | "monthlyValue" | "lostToProcess"
  | "atStake" | "activationRate" | "medianBundle" | "bundleToSpend" | "payback" | "daysToLive" | "churn" | "nps"
  | "kycClear" | "stageConv" | "auc" | "top30" | "newRevenue" | "fixFirst";

export const METRIC_DEFS: Record<MetricId, { en: string; hi: string }> = {
  leads: { en: "Leads created in the selected months, from every channel.", hi: "चुने गए महीनों में सभी चैनलों से आई लीड।" },
  activated: { en: "Share of those leads whose services went live.", hi: "उन लीड का हिस्सा जिनकी सेवाएँ चालू हुईं।" },
  activationRate: { en: "Activated leads divided by all leads in the group.", hi: "समूह की कुल लीड में से चालू हुई लीड।" },
  leadToLive: { en: "Average days from lead creation to services live, for activated leads.", hi: "चालू हुई लीड के लिए, लीड बनने से सेवा चालू होने तक औसत दिन।" },
  chasingCalls: { en: "Average follow-up calls the customer had to make before going live.", hi: "चालू होने से पहले ग्राहक को औसतन कितने फ़ॉलो-अप कॉल करने पड़े।" },
  costPerActivation: { en: "All sales and partner acquisition cost divided by activations.", hi: "कुल सेल्स और पार्टनर लागत को चालू हुई लीड से भाग।" },
  monthlyValue: { en: "Average monthly bundle value of activated customers.", hi: "चालू ग्राहकों का औसत मासिक बंडल मूल्य।" },
  lostToProcess: LOST_TO_OWN_PROCESS,
  atStake: { en: "Monthly revenue these drops would have brought: drops × chance a lead at that stage activates × the segment's median bill.", hi: "ये लीड बचतीं तो हर महीने कितनी कमाई होती: लीड × उस चरण से चालू होने की संभावना × सेगमेंट का मीडियन बिल।" },
  medianBundle: { en: "Middle monthly bill among activated customers in the segment.", hi: "सेगमेंट के चालू ग्राहकों का बीच वाला मासिक बिल।" },
  bundleToSpend: { en: "Median of bundle price divided by what the owner spends today.", hi: "बंडल कीमत और मालिक के मौजूदा ख़र्च के अनुपात का मीडियन।" },
  payback: { en: "Months of the median bill needed to recover the cost per activation.", hi: "प्रति ग्राहक लागत वसूलने में मीडियन बिल के कितने महीने लगते हैं।" },
  daysToLive: { en: "Average days from lead to services live in the segment.", hi: "सेगमेंट में लीड से सेवा चालू होने तक औसत दिन।" },
  churn: { en: "Share of activated customers who left within six months.", hi: "छह महीने में छोड़ने वाले चालू ग्राहकों का हिस्सा।" },
  nps: { en: "Average Net Promoter Score (0–10) from activated customers.", hi: "चालू ग्राहकों का औसत नेट प्रमोटर स्कोर (0–10)।" },
  kycClear: { en: "Share of quoted leads that completed KYC, with and without a GSTIN.", hi: "कोटेशन पाने वाली लीड में से KYC पूरा करने वालों का हिस्सा, GSTIN के साथ और बिना।" },
  stageConv: { en: "Share of leads at one step that reach the next step.", hi: "एक चरण की लीड में से अगले चरण तक पहुँचने वालों का हिस्सा।" },
  auc: { en: "Chance the model scores a random activated lead above a random dropped one (0.5 = guessing).", hi: "मॉडल किसी चालू लीड को छूटी लीड से ऊपर रखे, इसकी संभावना (0.5 = अंदाज़ा)।" },
  top30: { en: "Share of all activations found among the 30% of leads the model scores highest.", hi: "मॉडल के सबसे ऊँचे 30% स्कोर वाली लीड में कुल चालू लीड का हिस्सा।" },
  newRevenue: { en: "Recovered activations × their segment's median bill, per month. Uses the lever rates you set.", hi: "बची हुई लीड × उनके सेगमेंट का मीडियन बिल, हर महीने। आपकी चुनी दरों पर आधारित।" },
  fixFirst: { en: "The three fixable leaks with the most monthly revenue at stake across all segments.", hi: "सभी सेगमेंट में सबसे ज़्यादा मासिक कमाई दाँव पर लगाने वाले तीन ठीक हो सकने वाले लीक।" },
};
