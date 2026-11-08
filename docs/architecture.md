# Solution architecture

```mermaid
flowchart LR
  subgraph Owner["Owner (phone web app, EN / HI)"]
    W[Welcome + OTP<br/>name, entry path] --> A[AI advisor chat]
    W --> S[SIM fast path]
    A --> Q[Quote<br/>Essential / Recommended / Pro]
    S --> Q
    Q --> C[DPDP consent<br/>per purpose]
    C --> K[Smart KYC]
    K --> CT[Contract<br/>OTP / Aadhaar e-sign]
    CT --> P[Payment<br/>UPI / card, retry]
    P --> T[Order tracker<br/>+ My Accel]
  end

  subgraph Engine["Decision layer (pure TypeScript)"]
    NLU[NLU: EN / HI / Hinglish<br/>services/nlu.ts]
    R[Rules engine + recommender<br/>reads product_catalogue.csv]
    KV[KYC validator<br/>engine/kyc.ts]
    OP[Order planner<br/>typical_install_days]
    PM[Propensity model<br/>logistic regression]
  end

  subgraph Services["Mock APIs (swap for real ones)"]
    OTP[OTP: Twilio Verify<br/>server/otp-twilio.mjs]
    GST[(GSTIN registry)]
    UD[(Udyam registry)]
    FE[Fibre feasibility by PIN]
    OCR[OCR: Apple Vision output<br/>for specimens]
    WA[WhatsApp / SMS updates]
    PAY[Payment gateway]
  end

  subgraph BO["Back office (staff)"]
    CN[Call next: Hot / Warm / Cold]
    RQ[KYC review queue<br/>approve / reject]
    DB[Funnel, drop reasons,<br/>channels, consent log]
  end

  A --> NLU --> R
  A --> GST
  A --> FE
  R --> Q
  K --> OCR --> KV
  KV --> GST & UD
  W & CT --> OTP
  P --> PAY
  T --> OP
  T --> WA
  K -. stuck / expert / payment failed .-> CN
  KV -. warn / edited fields .-> RQ
  RQ -. approve / reject .-> T
  PM --> CN
  LEADS[(smb_leads.csv)] --> PM
  LEADS --> DB
  C --> LOG[(Consent log)] --> DB
```

**Data flow in one line:** the language layer only *understands* the owner. The rules engine *decides* what can be sold.
KYC checks documents against the application and the registries. Anything a machine can't settle goes to a human
queue, ranked by propensity.

| Component | Prototype | Production swap |
| --- | --- | --- |
| OTP | Mock (any 6 digits) or Twilio Verify via `server/otp-twilio.mjs` | Same server, or the operator's SMS gateway |
| GSTIN / Udyam lookup | CSV-backed mock with the real API shape | GSTN / Udyam APIs via a GSP |
| OCR | Apple Vision text for the 47 specimens | Any OCR API returning lines + boxes |
| E-sign | Mock Aadhaar e-sign, real OTP sign | Licensed ESP (Aadhaar eSign) |
| Payment | Mock UPI / card with forced failure | Payment gateway, UPI intent |
| Storage | Browser localStorage | Orders, leads and consent services with audit logs |
