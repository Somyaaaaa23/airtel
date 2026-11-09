# Udyam Digital – Accel Business advisor (prototype)

Phone-first journey for small businesses to find, price and buy an Accel Business bundle without a sales visit.
Built for Airtel SYNC 2026, Track A. All data is the hackathon's synthetic pack.

**What makes it different:** the four SMB segments fail for different reasons (see `docs/deliverables.md`), so each gets its
own playbook. Micro retail (54% of leads, 4.1% convert, ₹20,000 to win a ₹2,470/month customer) gets a fully online
journey, ₹-per-day pricing, setup waived and first month at half price. Professional offices get launch pricing and a data-safety
check. Multi-site gets a relationship manager, per-site volume discount and a consolidation view. Manufacturers (best
converters, slowest go-live) get a priority install crew and a downtime-cost calculator. Every quote shows the **standard
rate struck through, your price, and the saving**, never below Accel's lowest published price (`src/engine/pricing.ts`).
The **command centre** reproduces the problem slide live from the data and adds a segment deep-dive with automatic
"why we're lacking" findings, a leak map with revenue at stake, and a what-if simulator (`src/engine/diagnose.ts`).

Look: one CSS-variable design system with light and dark themes (`src/styles.css`): Airtel red #D80000 for primary actions,
charcoal text, white/cream surfaces, cyan only for information. Playfair Display for headlines, Inter for everything else,
Noto Sans Devanagari for Hindi. `src/design/contrast.test.ts` checks every text/background pair for WCAG AA in both themes.
The staff command centre has its own calmer look: a red sidebar, a soft red page and white cards, always light (even in
dark mode), with all text in Playfair Display and numbers in Inter.

**Demo mode** (switch on the landing page) reveals the scenario library, the staff demo login and a Reset demo button.
The library previews each scenario's opening message, expected outcome and the rule it demonstrates, and **Run all** pushes
every scenario through the parser, registry and rules engine to check its claimed outcome (`src/services/scenarios.ts`).

**Accessibility:** 44px touch targets, visible focus rings on every surface, arrow-key navigation in menus, tabs and
toggles, focus kept inside dialogs, a skip link, skeleton loaders, and bilingual empty and error states.

**Layout:** landing page (one split card: red welcome panel, sign-in panel with Business owner / Accel team) → owner
sign-in (mobile number, "OTP sent" dialog, six OTP boxes, resend timer, Change number) → owner workspace with a top pill
menu (Overview, My services, Find my plan, Usage, Bills, Orders, Support; a drawer on phones). The Overview is a tile
dashboard: usage, billing cycle, setup progress, "Your next steps", services and the installation schedule. The plan journey
(chat → quote → consent → KYC → contract → payment → tracker) runs in a focused column under a sticky "Step X of 7" bar, with
"Talk to an expert" on every step. Demo scenarios appear only in demo mode, in a filterable library
(`src/components/demos.tsx`); they never sit in the way of the product.

**Journey:** start page (Business owner or Accel team) → mobile + OTP → name → **My Accel dashboard** → AI advisor chat
(English / Hindi) or "I just need a SIM" → quote with
Essential / Recommended / Pro → **DPDP consent** → **Smart KYC** (OCR + registry checks, linked to the application) →
**contract e-sign** → **first payment** → **order tracker**. Staff sign in with email and password to a **command centre**
with segment analysis, a leak finder, a simulator, a call-next list, a KYC review queue and an activation propensity score.

Submission material: `docs/deliverables.md` (checklist and demo script), `docs/architecture.md`, `docs/privacy-note.md`.


## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 112 tests: catalogue rules, plan tiers, advisor flow, Hindi/English parsing, GSTIN checksum, KYC, orders,
                     # propensity, design-token contrast, scenarios, price hold, command-centre data, Hindi coverage, keyboard, OTP codes
npm run build        # production build in dist/
npm run build:demo   # single self-contained HTML in dist-demo/ (used for the shareable demo link)
npm run build:backoffice   # retrain the propensity model and rebuild src/data/backoffice.json from smb_leads.csv
npm run ocr:specimens      # macOS only: re-run Apple Vision OCR on the KYC specimen images → src/data/kyc_ocr.json
npm run otp                # optional real-OTP server (textbee or Twilio); see "Real OTP" below
```

### Signing in

The app opens on a start page that asks who is signing in.

| Who | How to sign in | Lands on |
| --- | --- | --- |
| Business owner | Any valid Indian mobile number → **Send OTP** shows an "OTP sent" dialog → enter any 6 digits (demo OTP) → your name | **My Accel** dashboard: this month's data, calls and SMS (sample figures), services, next steps, latest order and next bill, plus "Find my plan" and "I just need a SIM" |
| Accel team | Email `administrator123@udyamdigital.in` (or just `administrator123`), password `123@123`. In demo mode, **Use demo login** fills them in | Command centre with a sidebar: Overview, Segments, Leak finder, Simulator, Operations, Lead scoring |

The staff account is a prototype check in the browser (`src/services/admin.ts`), not real security; production would use Accel's single sign-on.

**Demo mode** (switch on the landing page, remembered per device) shows the scenario library, the staff demo login and a
**Reset demo** button that clears every order, lead, consent, price hold and KYC draft stored in this browser.

## How it works

```
Owner types or taps ──► services/nlu.ts ─────► advisor/flow.ts ──────► engine/recommend.ts ──► screens/Quote.tsx
(EN / HI / Hinglish)    extracts business,     asks only what's        picks products,         toggles, qty, live
                        city, staff, needs,    still missing           checks every rule,      total, docs needed
                        GSTIN, PIN code              │                 explains each line
                                                     ▼
                              services/registry.ts (mock GSTIN / Udyam APIs)
                              services/feasibility.ts (mock fibre coverage by PIN code)
```

The language layer only **understands** the owner. The **rules engine decides** what can be sold, so the advisor can't
recommend something the catalogue forbids. Every decision has a reason code that the UI turns into plain English or Hindi.

### Catalogue rules enforced (`src/engine/eligibility.ts`)

| Rule (product_catalogue.csv) | Example |
| --- | --- |
| `available_city_tiers` | Biz Fibre 1G only in Tier-1 cities → Tier-2 clinic gets Biz Fibre 300 with a note |
| `min_employees` | Managed Firewall needs 10 staff → 6-person office gets Endpoint Security instead |
| `min_sites` | SD-WAN needs 3 sites → 2-site business gets Backup Failover per site |
| `requires_gstin` | No active GSTIN → WhatsApp API, SMS, toll-free, leased lines, IVR are left out, with the reason |
| `requires_one_of` | CCTV / Wi-Fi bring a broadband line; Static IP only with Biz Fibre; Firewall / Backup / SD-WAN need a wired line |
| Site feasibility | No fibre at the PIN code → 5G AirFiber; wired-only add-ons blocked |

GSTIN status comes from the registry: Cancelled or Suspended is treated as no GSTIN.
`engine.test.ts` sweeps 480 profiles (segment × tier × GST × size × fibre × speed) asking for every product and
checks every returned bundle against all rules.

### Pricing (`src/engine/quote.ts`)

Derived from the 368 activated bundles in `smb_leads.csv`:
- list price = midpoint of the catalogue price range (activated bundles sit at 48% of the range on average)
- setup = sum of setup fee × quantity (matches the data exactly)
- contract = longest minimum contract in the bundle (matches the data exactly)
- go-live estimate = slowest `typical_install_days` in the bundle (installs run in parallel)

### Mock services

- **GSTIN lookup:** format + checksum check (accepts `X` as the PAN's 4th character, per the dataset README), then registry status.
- **Udyam lookup:** `UDYAM-XX-00-0000000` format, district `00` accepted.
- **Fibre feasibility:** deterministic for demos. PIN codes whose digits sum to a multiple of 7 have no fibre (e.g. 800006, 452030); 302001 has fibre.

## Real OTP (free with textbee, or Twilio)

By default OTP is a demo: tapping **Send OTP** shows an "OTP sent" dialog and any 6 digits sign in (the screen doesn't say
so, which keeps the demo video clean). The same applies to signing the contract. To send real codes, run the OTP server
below and add `VITE_OTP_API=http://localhost:8787` to `.env`. Provider keys stay on the OTP server, never in the browser.

**textbee (free: 50 SMS a day, 300 a month).** Your Android phone sends the SMS from its own SIM.
1. Sign up at textbee.dev, install the textbee app on an Android phone (Android 7+), and register the phone by scanning
   the dashboard's QR code. Keep the app's gateway switched on.
2. Copy `server/.env.example` to `.env` and paste your textbee API key after `TEXTBEE_API_KEY=` (`.env` is git-ignored).
3. Run `npm run otp` in one terminal and `npm run dev` in another.

The OTP server (`server/otp-server.mjs`) creates each 6-digit code, keeps only a salted hash, expires it after 5 minutes,
allows 5 attempts and waits 30 seconds between sends (`server/otp-codes.mjs`, tested). With `OTP_PROVIDER=twilio`
it uses Twilio Verify instead. The sign-in screen asks for consent before sending and explains failures. The same OTP
signs the contract (`src/services/otp.ts`). Real OTP works only where the OTP server runs; the Vercel deployment keeps
mock OTP unless the server is deployed too.

## Consent, contract and payment

- **Consent** (`screens/Consent.tsx`, `services/consent.ts`): one checkbox per purpose (KYC and installation are required;
  updates and offers are optional), each with what / why / how long / who sees it. Every choice is logged with time and
  notice version; owners withdraw from the Privacy page. Staff see the log in the back office.
- **Privacy & your data** (`screens/Privacy.tsx`): the privacy note in English and Hindi, plus the owner's consents.
- **Contract** (`screens/Contract.tsx`): plan, key terms in plain words, signed by OTP or Aadhaar e-sign (mocked), so the
  signatory needn't meet anyone (53 leads dropped because the signatory wasn't available).
- **Payment** (`screens/Payment.tsx`): setup fee + first month by UPI or card (mocked). A demo switch forces a failure
  to show the retry (28 leads dropped at first payment). A failed payment is logged as a lead for the call list.

## Smart KYC (`src/engine/kyc.ts`, `src/screens/Kyc.tsx`)

Comes after the consent screen. Four document slots: GST certificate, Udyam certificate, signatory ID and address proof.
The owner confirms the fields OCR read, or corrects them (corrections are flagged for the review queue). Checks run against
the **application** too: the GSTIN typed in the chat, the state of the city named, and the name given at sign-in.
Without GST products, a business PAN is accepted (sent for review). When the owner is stuck, one tap logs a lead for an expert call.
The demos "Insurance agency in Visakhapatnam" and "Furniture workshop in Nagpur" use GSTINs from specimens K09 and K03;
the KYC screen marks that specimen "Matches your business". The plan decides what is required: GST-only products need a verified, active
GST certificate; otherwise GST *or* Udyam is enough.

**OCR.** `scripts/ocr_specimens.swift` runs Apple Vision on the 47 specimen images (after stripping the pink watermark) and
saves every text line with its position and confidence. `services/ocr.ts` serves those lines like an OCR API would. In the
browser you can load a specimen applicant (K01–K12) or upload one of the specimen files; other photos can't be read in
this prototype.

**Parsing.** `parseDocument` finds the document type from its title, pairs each value with its label by position
(correcting for tilted photos), joins addresses that wrap, fixes O/0 and I/1 slips in GSTINs only where the checksum
confirms the fix, and flags blurred photos from low OCR confidence.

**Checks**, each with a plain English / Hindi explanation and fix:

| Check | Catches |
| --- | --- |
| Readable, right document, required fields present | K04 blurred GST certificate; K01 Udyam number missing |
| GSTIN format + checksum, with the nearest registry GSTIN | K06 GSTIN differs from the registry at one character |
| GSTIN registry status (Active needed for GST-only products) | K01 GSTIN cancelled |
| Legal / trade name and address against the GST registry | K07 legal name doesn't match |
| Udyam number, name and city against the Udyam registry | |
| Same business name on every document (allows one OCR slip per 15 letters) | |
| Signatory is the proprietor, a partner or a director; otherwise review | K05, K10, K11 go to review for an authorisation letter |
| ID not expired; bill dated within 90 days of 2026-07-15 | K11 bill from Oct 2025 |
| Bill address matches the registered address | |
| Certificate GSTIN = GSTIN typed in the chat | Wrong certificate for the quoted business |
| GSTIN state code = state of the city named and of the GST address | |
| Signatory ID name = name given at sign-in | |

Clean files (K02, K03, K08, K09, K12) pass. `engine/kyc.test.ts` runs all 12 applicants.

The review step opens with a **pass/fail list**; every failed check has a **Fix it** button that jumps to the right step
and document (`engine/kycFix.ts`). Uploading opens a **camera guide** (framing, blur and glare tips) that warns when the last
photo couldn't be read. **Resume later** saves the documents, edits and step per phone and quote (`services/kycDraft.ts`).

## Order tracker (`src/engine/orders.ts`, `src/screens/Tracker.tsx`)

Placing an order turns the quote into dated tasks: order placed, KYC (a day later if it needs review), the technician visit
at a slot the owner picks, then each product on its `typical_install_days`. SIMs and cloud services don't wait for the visit.
Go-live matches the quote's estimate. Products slower than 21 days (leased lines) get an up-front note, since "installation
delayed beyond 21 days" is a drop reason. Every step adds a WhatsApp-style update, because activated customers made 3
chasing calls on average. Demo buttons step through the days. The tracker shows **"Next update expected by …"**, a
**Notify me on WhatsApp** switch saved on the order, and **Need help?**, which files a call-back lead.

## Segment playbooks and smart price

| Segment | Leak in the data | Route | Price framing | Offer |
| --- | --- | --- | --- | --- |
| Micro retail | Needs → quote 32%; bundle 2.7× spend; payback 8 months | Fully online | ₹ per day | Setup waived, first month half price |
| Professional offices | Owners without GSTIN clear KYC only 27% | Online + specialist call | ₹ per staff member | Launch price (bottom of range) for 3 months, half setup |
| Multi-site | Highest value (₹28,080/mo); install delays over-index | Relationship manager | ₹ per site | 2% per extra site (max 10%), half setup |
| Manufacturers | KYC → live only 54%; 20.5 days to live | Priority install crew | Downtime cost | Setup waived, installs 30% faster |

Standard rate = top of the published range; bundle price = midpoint (what activated customers paid); offers never go below the minimum.

**Quote tools:** a per-day / per-month toggle, **Share on WhatsApp** (a bilingual summary via wa.me) and **Hold this price for
48 hours** with a live countdown (`services/priceHold.ts`). The advisor shows an editable **"What I understood"** card,
Back / Skip / Start over, and a **"Left out and why"** section with the rules engine's reason codes on every recommendation.

## Command centre (`src/screens/BackOffice.tsx`, `CommandCentre.tsx`, staff view, English)

Kept simple on purpose: the essentials first, details one click away.

- **Overview:** 4 headline numbers (leads, activation rate, lead to live, cost per activation), the main insight
  ("42% of the businesses we lost were lost to our own process") with the loss split, and **Fix these 3 first**: the
  fixable leaks with the most ₹ per month at stake. The bubble chart, funnel and segment table sit behind
  **Show funnel and segment breakdown**. A **From / To month** range filters the numbers, funnel and loss split.
- **Segments:** pick a segment; the top 3 automatic "why it's lacking" findings with fixes (more on demand), 4 key numbers
  (more behind **More numbers**), funnel vs all segments, the top 5 drop reasons with ₹ at stake, and the segment playbook.
- **Leak finder:** segment × step heat map and the biggest fixable leaks in ₹ per month.
- **Simulator:** drag how much each fix recovers; activations, rate, cost per activation and revenue update by segment.
- **Operations** and **Lead scoring** (below).

Every metric has an **i** with its definition (`engine/metricDefs.ts`), **Export CSV** downloads the current tab, and
"lost to our own process" is defined once in `engine/lossCategories.ts`, shared by the data build, the screens and the tests.

### Operations and lead scoring

Built from `smb_leads.csv` by `scripts/build_backoffice.ts`:
- quarter KPIs, funnel with stage conversion, channel economics
- drop reasons, each tagged with the part of this journey that answers it (63.5% of lost leads)
- **propensity model** (`engine/propensity.ts`): logistic regression on lead-time facts only (channel, segment, size,
  GST/Udyam, current internet, spend, products asked about). Held-out AUC 0.70; the top 30% of scores hold 54% of
  activations. Shows deciles, the strongest drivers, and a back-test table.
- **call next**: open leads from the app (expert asked, stuck at KYC, payment failed) and 15 win-back leads from last
  quarter, each labelled Hot / Warm / Cold (top 30% / next 30% of held-out scores)
- **KYC review queue**: flagged files with extracted fields side by side (IDs masked), approve / reject with a reason;
  the owner's tracker updates
- applications placed in the owner app on this device (kept in `localStorage`), each with its score and a next action
- consent log

## Demo businesses

Turn on **Demo mode** on the landing page, then open the scenario library (from the landing page, the sign-in page or the
workspace top bar). It opens with the first scenario selected and previews the opening message, the expected outcome and
the rule it demonstrates. Search, filter by industry, then **Run scenario**, **Run in Hindi**, or **Run all**, which runs
every scenario through the parser, registry and rules engine and shows pass or fail (all 8 pass). Each scenario sends a typed
message as an owner would:

| Demo | What it shows |
| --- | --- |
| Kirana in Patna, no GST | WhatsApp API left out; CCTV brings its own fibre line |
| Dental clinic in Kochi wants 1 Gbps | Tier-1-only product → 300 Mbps with explanation; GSTIN verified |
| Restaurant chain in Mumbai, 6 outlets | SD-WAN, billing, Wi-Fi per outlet |
| Packaging unit, no fibre (PIN 800006) | Leased line impossible → AirFiber; Static IP and Firewall blocked; Endpoint Security substituted |
| General store, cancelled GSTIN | Registry status blocks GST-only products |
| Hindi message from an Indore pharmacy | Devanagari text and digits understood |
| Insurance agency in Visakhapatnam: full journey | GSTIN matches specimen K09, so KYC, e-sign, payment and the tracker all go through |
| Furniture workshop in Nagpur: full journey | Manufacturer playbook: setup waived, priority install crew; GSTIN matches specimen K03 |

## Code map

```
src/engine/      catalogue, eligibility, recommender, quote, pricing, GSTIN checksum, KYC rules and fix targets, order plan,
                 journey steps, loss categories, metric definitions, propensity model (no UI)
src/services/    free-text parser, mock GSTIN/Udyam/feasibility/OCR APIs, OTP client, order/lead/consent stores, demo mode,
                 price hold, WhatsApp share, KYC drafts, scenario runner, lead scoring
src/advisor/     conversation flow (which question next) and explanation text
src/i18n/        all English and Hindi copy
src/components/  design-system pieces: OwnerShell (top pill menu + drawer), OtpInput, demo library, Modal, InfoTip, icons,
                 segment cards, Left out and why, error boundary
src/a11y/        keyboard helpers (arrow keys, focus kept in dialogs)
src/design/      WCAG contrast check for the colour tokens
src/screens/     Start, owner sign-in (Welcome), owner workspace pages (Dashboard), Advisor, SIM path, Quote, Consent, Smart KYC, Contract,
                 Payment, Tracker, Privacy, staff sign-in, command centre
src/data/        hackathon CSVs, OCR output, back-office summary + model, city tiers, business types, demo scripts
public/kyc/      the 47 KYC specimen images (shown as thumbnails)
scripts/         OCR (Swift / Apple Vision) and back-office model builder
server/          optional OTP server (textbee or Twilio Verify) and its code store; .env.example template
docs/            submission checklist, architecture diagram, privacy note
```
