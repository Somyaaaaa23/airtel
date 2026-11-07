# Udyam Digital – Accel Business advisor (prototype)

Phone-first journey for small businesses to find, price and buy an Accel Business bundle without a sales visit.
Built for Airtel SYNC 2026, Track A. All data is the hackathon's synthetic pack.

**This build:** welcome + OTP (mock) → AI advisor chat (English / Hindi) → rule-checked bundle → live quote → document list.
**Next builds:** Smart KYC (OCR + registry checks), order tracker, back-office dashboard with propensity score.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 33 tests: catalogue rules, advisor flow, Hindi/English parsing, GSTIN checksum
npm run build        # production build in dist/
npm run build:demo   # single self-contained HTML in dist-demo/ (used for the shareable demo link)
```

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

## Code map

```
src/engine/      catalogue loader, eligibility rules, recommender, quote, GSTIN checksum (pure TypeScript, no UI)
src/services/    free-text parser, mock GSTIN/Udyam registry APIs, mock feasibility API
src/advisor/     conversation flow (which question next) and explanation text
src/i18n/        all English and Hindi copy
src/screens/     Welcome, Advisor, Quote, end screens
src/data/        hackathon CSVs, city tiers, business types, demo scripts
```
