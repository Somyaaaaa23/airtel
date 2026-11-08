# Udyam Digital: data privacy and security note

Design choices for the self-serve onboarding prototype, written against the Digital Personal Data Protection Act, 2023.
All data in the prototype is synthetic.

## 1. Consent: one purpose, one checkbox
- A consent screen comes before any document upload. Each purpose has its own checkbox and nothing is pre-ticked:
  **KYC** (required), **installation** (required), **order updates on WhatsApp/SMS** (optional) and **offers** (optional, off by default).
- Each purpose says what is collected, why, for how long and who sees it.
- Every grant and withdrawal is logged with the time and the notice version (`src/services/consent.ts`). Staff see the log in the back office.
- Owners can withdraw any consent from the "Privacy & your data" page. The page also names the Grievance Officer and promises a reply within 7 days.

## 2. Purpose limitation and data minimisation
- The advisor asks only what it needs to pick a plan: business type, size, city, current spend and needs. It never asks for a name or ID.
- KYC asks only for the documents the chosen plan needs. If nothing in the plan needs GST, a Udyam certificate or business PAN is accepted instead.
- No Aadhaar number is collected. An ID photo is enough, and e-sign goes through a licensed provider's Aadhaar OTP page.
- Documents are used for KYC only, never for marketing. Offers need their own opt-in.
- The propensity model uses only lead-time business facts (segment, size, channel, GST/Udyam status, spend). It uses no personal attributes.

## 3. Retention
| Data | Kept for |
| --- | --- |
| Document photos | Deleted as soon as verification finishes; the prototype keeps them only in browser memory and revokes them when you leave the screen |
| Checked KYC fields (name, GSTIN, address) | Contract period plus the time telecom rules require |
| Chat answers with no order | 90 days |
| Consent log | As long as the relationship lasts, plus the limitation period, as evidence of consent |

## 4. Security
- **Masking everywhere:** GSTIN, Udyam and ID numbers are masked on screen, in the back office and in logs (e.g. `32TTN••••••T1ZW`). The review queue shows extracted fields, not photos.
- **Least privilege:** the back office shows only what each role needs. Production adds SSO, role-based access and an audit log of every record opened.
- **Encryption** in transit (TLS 1.2+) and at rest. Data is stored in India.
- **Secrets stay server-side:** OTP runs through a small server (`server/otp-twilio.mjs`), so no Twilio keys ship in the app.
- **Rules first:** a rules engine, not the language model, decides eligibility. Customer documents are never sent to a language model.
- **Fraud signals:** GSTIN checksum, registry status, cross-document name/address matching and the 90-day bill check are all logged. Edits the owner makes to OCR fields are flagged for human review.

## 5. Data principal rights
Owners can access, correct and erase their data, withdraw consent and nominate a representative. Requests go through the
in-app privacy page or the Grievance Officer. Breaches are reported to the Data Protection Board and to affected users as the Act requires.
