# Submission checklist

Sources: `Airtel_SYNC_Case.pdf` (what teams submit, build challenge) and `Udyam Digital Prototype Screens & Features.pdf` (screen spec).

## What teams submit (case, page 3)
| Deliverable | Status |
| --- | --- |
| Working prototype + code repository | Done: this repo (`npm run dev`, or `npm run build:demo` for one shareable HTML file) |
| Demo video, 3 minutes max | **To do (you):** suggested script below |
| Solution architecture diagram | Done: `docs/architecture.md` (Mermaid; renders on GitHub, screenshot it for the slides) |
| Business case, 10 slides or fewer | **To do:** numbers to use are in the back office (funnel, CAC ₹15,053, 17.6 days, drop reasons, AUC 0.70) |
| 1-page data privacy and security note | Done: `docs/privacy-note.md`, also in the app as "Privacy & your data" |

## Build challenge and screen spec
| # | Screen / feature | Status |
| --- | --- | --- |
| 1 | Welcome, language, phone OTP, "Find my plan" / "I just need a SIM" | Done. OTP is mock until Twilio keys are added (see README). Regional language: **to do** (Hindi + English only) |
| 2 | AI advisor: chips, rules engine, plain-language reasons, budget-aware | Done |
| 3 | Quote: one price, add-on toggles, dependencies, Essential / Recommended / Pro, feasibility, talk to an expert | Done |
| 4 | DPDP consent: per-purpose checkboxes, what / why / how long / who, withdraw, grievance contact | Done |
| 5 | Smart KYC: only needed documents, OCR, owner confirms or edits fields, all checklist checks incl. state and applicant name match, linked to the chat GSTIN | Done (OCR for the 12 specimen applicants) |
| 5b | Sign by OTP or e-sign | Done (Aadhaar e-sign mocked) |
| 6 | First payment, UPI / card, retry on failure | Done (mocked) |
| 7 | Tracker: KYC → scheduled → engineer → installed → live, dates from install days, WhatsApp updates | Done |
| 8 | My Accel: one bill, one support number | Done (basic card on the tracker) |
| 9 | Lead dashboard: funnel + leads the bot couldn't close, with reasons | Done |
| 10 | Propensity score with Hot / Warm / Cold and a call-next list | Done |
| 11 | KYC review queue, approve / reject, masked IDs | Done |
| 12 | Partner view | Not built (optional) |
| — | WhatsApp or voice front end | Not built (stretch) |

## Left for you
1. **Twilio OTP:** add keys and run `server/otp-twilio.mjs` (README → "Real OTP with Twilio").
2. **UI polish.**
3. Demo video and business-case slides.
4. Optional: one regional language (Marathi is the next most common in the leads data after Hindi and English).

## Suggested 3-minute demo path
1. Welcome: phone → OTP → name "Anita Kulkarni" → Find my plan.
2. Side panel: "Insurance agency in Visakhapatnam" → answer 3 chips → quote (show the Essential / Recommended / Pro tabs and an add-on toggle).
3. Consent: tick the two required purposes → KYC: tap **K09 · Matches your business** → every check passes → confirm.
4. Contract: sign with OTP → Payment: tick "make the next attempt fail" → fail → retry → tracker. Pick a visit slot and step a few days.
5. Back office: approve a review case (run the SIM path as "Nisha Arora" with K10 first), show the call-next list and the propensity deciles.
6. Optional: show K06 (altered GSTIN) or K04 (blurred photo) failing in KYC, and the Hindi toggle.
