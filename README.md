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

Look: warm ivory workspace, white cards, midnight-blue text (#172B3A), coral #FF654F for brand and selection, deep orange
#F05A28 for primary actions, cyan #20C5D8 as the accent (active navigation, progress, small graphics). Playfair Display for
brand headlines only, Inter for everything else. All tokens live at the top of `src/styles.css`.

**Layout:** landing page with a role choice → owner sign-in (six OTP boxes, resend timer, demo banner when OTP is mocked) with
a compact demo panel beside it → owner workspace with a sidebar (Overview, My services, Find my plan, Usage & analytics,
Bills & payments, Orders & installation, Support) and a top bar. The plan journey (chat → quote → KYC → contract → payment →
tracker) runs in a focused column inside the workspace. Demo scenarios open in a filterable library
(`src/components/demos.tsx`) from the sign-in page or the top bar; they never sit in the way of the product.

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
npm test             # 65 tests: catalogue rules, plan tiers, advisor flow, Hindi/English parsing, GSTIN checksum, KYC, orders, propensity
npm run build        # production build in dist/
npm run build:demo   # single self-contained HTML in dist-demo/ (used for the shareable demo link)
npm run build:backoffice   # retrain the propensity model and rebuild src/data/backoffice.json from smb_leads.csv
npm run ocr:specimens      # macOS only: re-run Apple Vision OCR on the KYC specimen images → src/data/kyc_ocr.json
```

### Signing in

The app opens on a start page that asks who is signing in.

| Who | How to sign in | Lands on |
| --- | --- | --- |
| Business owner | Any valid Indian mobile number, then any 6 digits as the OTP (until Twilio is connected), then your name | **My Accel** dashboard: this month's data, calls and SMS (sample figures), services by channel, latest order and next bill, plus "Find my plan" and "I just need a SIM" |
| Accel team | Email `administrator123@udyamdigital.in` (or just `administrator123`), password `123@123` | Command centre with a sidebar: Overview, Segments, Leak finder, Simulator, Operations, Lead scoring |

The staff account is a prototype check in the browser (`src/services/admin.ts`), not real security; production would use Accel's single sign-on.

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

## Real OTP with Twilio (left for last)

OTP is mocked (any 6 digits) until you set it up. The browser never holds Twilio keys:

```bash
TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_VERIFY_SID=VA... node server/otp-twilio.mjs
VITE_OTP_API=http://localhost:8787 npm run dev
```

Create a Verify service in the Twilio console to get the `VA...` SID. A trial account only sends to verified numbers.
The same OTP is used to e-sign the contract (`src/services/otp.ts`).

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

## Order tracker (`src/engine/orders.ts`, `src/screens/Tracker.tsx`)

Placing an order turns the quote into dated tasks: order placed, KYC (a day later if it needs review), the technician visit
at a slot the owner picks, then each product on its `typical_install_days`. SIMs and cloud services don't wait for the visit.
Go-live matches the quote's estimate. Products slower than 21 days (leased lines) get an up-front note, since "installation
delayed beyond 21 days" is a drop reason. Every step adds a WhatsApp-style update, because activated customers made 3
chasing calls on average. Demo buttons step through the days.

## Segment playbooks and smart price

| Segment | Leak in the data | Route | Price framing | Offer |
| --- | --- | --- | --- | --- |
| Micro retail | Needs → quote 32%; bundle 2.7× spend; payback 8 months | Fully online | ₹ per day | Setup waived, first month half price |
| Professional offices | Owners without GSTIN clear KYC only 27% | Online + specialist call | ₹ per staff member | Launch price (bottom of range) for 3 months, half setup |
| Multi-site | Highest value (₹28,080/mo); install delays over-index | Relationship manager | ₹ per site | 2% per extra site (max 10%), half setup |
| Manufacturers | KYC → live only 54%; 20.5 days to live | Priority install crew | Downtime cost | Setup waived, installs 30% faster |

Standard rate = top of the published range; bundle price = midpoint (what activated customers paid); offers never go below the minimum.

## Command centre (`src/screens/BackOffice.tsx`, `CommandCentre.tsx`, staff view, English)

Sidebar sections: **Overview** (42% lost to our own process, loss split, segment bubble chart, funnel, segment table) ·
**Segments** (automatic findings with fixes, KPIs, KYC clearance with / without GSTIN, funnel vs all, drop reasons with lift
and ₹ at stake, playbook) · **Leak finder** (segment × step heat map, top leaks in ₹/month) · **Simulator** (drag how much
each fix recovers; activations, rate, cost per activation and revenue update by segment) · **Operations** · **Lead scoring**.

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

The demo panel (right side on desktop, ✦ button on phones) sends a typed message as an owner would:

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
src/engine/      catalogue, eligibility, recommender, quote, GSTIN checksum, KYC rules, order plan, propensity model (no UI)
src/services/    free-text parser, mock GSTIN/Udyam/feasibility/OCR APIs, order store, lead scoring
src/advisor/     conversation flow (which question next) and explanation text
src/i18n/        all English and Hindi copy
src/components/  design-system pieces: OwnerShell (sidebar + top bar), OtpInput, demo library, Modal, icons, segment cards
src/screens/     Start, owner sign-in (Welcome), owner workspace pages (Dashboard), Advisor, SIM path, Quote, Consent, Smart KYC, Contract,
                 Payment, Tracker, Privacy, staff sign-in, command centre
src/data/        hackathon CSVs, OCR output, back-office summary + model, city tiers, business types, demo scripts
public/kyc/      the 47 KYC specimen images (shown as thumbnails)
scripts/         OCR (Swift / Apple Vision) and back-office model builder
server/          optional OTP server for Twilio Verify
docs/            submission checklist, architecture diagram, privacy note
```
