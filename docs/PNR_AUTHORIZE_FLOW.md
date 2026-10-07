# PNR → Authorize Flow (branch: `backup`)

Source of truth for the Gotoflyer-style inquiry rebuild.

Related: [pnrconverter.com](https://www.pnrconverter.com/) · [API intro](https://www.pnrconverter.com/api-introduction)

---

## Locked product decisions

| Topic | Decision |
|--------|----------|
| Branch | `backup` only |
| Search | Multi-line GDS paste → decode → itinerary table |
| Old search APIs | **Removed** (Duffel / SerpApi / Flight MCP + dead FE) |
| Price | `supplier + markup = total`; merchant fee **0** on send/draft |
| Pax sees | **Total only** |
| Card | type, holder, last4, expiry persisted; **CVV never stored** (optional UI-only) |
| Preview / email | Authorization + DEMO Gotoflyer T&Cs |
| Status | **`authorized`** (migrates `customer_confirmed` on boot) |
| After authorize | No auto receipt email; agent **Download** / **Resend**; signature = cardholder name |
| Timestamp field | `confirmedAt` kept (means authorized-at) |

---

## Wizard spine

0. Customer  
1. PNR paste / convert  
2. Itinerary + supplier/markup  
3. Passengers  
4. Billing (+ card; CVV optional not saved)  
5. Authorize preview → Send  

---

## Phases

| Phase | Status |
|-------|--------|
| P0 Local parser + `/api/pnr/convert` + paste UI | **DONE** |
| P1 Pricing strip + multi-segment email/preview | **DONE** |
| P2 Billing card fields (no CVV store) | **DONE** |
| P3 Authorize email/page/thank-you/`authorized` | **DONE** |
| P4 Download + resend receipt packet | **DONE** |
| P5 Remove old flight search FE/BE | **DONE** |

---

## Key files

| Layer | Path |
|--------|------|
| Docs | `docs/PNR_AUTHORIZE_FLOW.md` |
| Parser | `CRM_BACKEND/src/integrations/pnr/gdsParser.js` |
| Adapter | `CRM_BACKEND/src/integrations/pnr/pnrConverterAdapter.js` |
| Billing sanitize | `CRM_BACKEND/src/utils/sanitizeBilling.js` |
| Status migrate | `CRM_BACKEND/src/scripts/migrateAuthorizedStatus.js` (boot) |
| DEMO T&Cs | `CRM_BACKEND/src/templates/partials/gotoflyerTerms.ejs` |
| Email / public | `inquiryEmail.ejs`, `confirmPage.ejs`, `thankYou.ejs`, `confirmationEmail.ejs` |
| HTTP | `POST /api/pnr/convert` |
| FE convert | `inquiryApi.convertPnr` |
| FE steps | `StepPnrSearch`, `StepPnrQuote`, `StepBilling`, `StepPreview` |

### Offer shape

```js
selectedOffer.raw = {
  source: 'pnr',
  segments,
  tripSummary,
  warnings,
  decodeSource, // 'local-parser' | 'pnr-converter-api'
  pnrRaw,
}
```

---

## Customer flow

1. Agent sends → authorization email (multi-segment table + **I Authorize**)  
2. Public page (`/public/confirm/:id` URL unchanged) → DEMO T&Cs + **I Authorize**  
3. Status → `authorized`; socket `inquiry:authorized`  
4. Thank-you page — **no** auto confirmation email  
5. Agent download / resend receipt (cardholder signature line)

---

## Future: real PNR Converter API key

Touch **only** adapter + env:

| What | Where |
|------|--------|
| Env | `PNR_CONVERTER_API_KEY`, optional `PNR_CONVERTER_BASE_URL` |
| Headers | `buildAuthHeaders()` |
| Body field | `fetchFromPnrConverter()` |
| Response map | `adaptPnrConverterResponse()` |

Without key → local parser (working flow). With key → richer logos/duration when mapped.

---

## DEMO T&Cs

`gotoflyerTerms.ejs` uses **DEMO Travel Agency** placeholder. Replace with final Gotoflyer legal copy before production.

---

## What must not break

- Call → new booking wizard handoff  
- Draft autosave / resume  
- Auth multi-session  
- Inquiry list → detail  
- Old inquiries readable (status migrated to `authorized`)  

---

## Checklist

- [x] On `backup`  
- [x] `node --test` for gdsParser  
- [x] Merchant fee 0 on authorize send  
- [x] Authorize / download / resend  
- [x] Old search removed  
- [ ] Manual E2E: paste sample → authorize → download  
