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
| Preview / email | Editable `authorizationText` (one **total** only) + billing; email links to confirm page |
| Confirm page | Full preview + **underlined** auth text + signature; **no checkbox**; optional multi-slot docs; **I Authorize** → thank you |
| Document upload | **Plan B (now):** pax-only on confirm — slots = cardholder + each passenger (all optional); PDF/JPG/PNG ≤5MB; images compressed in browser; VPS/local disk `uploads/authorize/<inquiryId>/`; agent **View** (inline) + countdown from `expiresAt`. **Disk cleanup job** (`src/jobs/cleanupSupportDocuments.js`): deletes files by **mtime** older than `SUPPORT_DOC_TTL_DAYS` (default 3); does **not** touch Mongo (ghost meta OK → View **410 Document removed**). Safety: root must end with `uploads/authorize`, no symlink follow, never delete root, `SUPPORT_DOC_CLEANUP_DRY_RUN=true` for first verify. Interval: every 60m + once after boot (`server.js` like `verifyMail`). **Future:** manual Delete / DB `$pull`. **Future Plan A:** agent `docRequest` slots — same `supportDocuments[]`. |
| Auth display | Plain `authorizationText` in DB; `renderAuthorizationHtml()` underlines fills on preview / email / confirm / receipt |
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
| Gotoflyer T&Cs | `CRM_BACKEND/src/templates/partials/gotoflyerTerms.ejs` (confirm, below I Authorize) |
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

1. Agent StepPreview → editable authorization text (auto-fill, **one total**) + staff price breakdown  
2. Send → email: itinerary + passengers + **billing** + total + auth text + **Review & Authorize** link  
3. Confirm page (`/public/confirm/:id`) → full preview + read-only auth text + signature + optional **doc slots** (cardholder + passengers) + **I Authorize** (no checkbox)  
4. POST multipart → status `authorized` + `supportDocuments[]` + agreement meta (IP/UA); socket `inquiry:authorized`  
5. `thankYou.ejs` — **no** auto confirmation email  
6. Agent download / resend receipt; **View** supporting docs (no download) + countdown  
7. After TTL, disk job removes files; agent View → **410 Document removed** (DB meta may still list the card)

### Support doc disk cleanup (dev + VPS)

| Env | Meaning |
|-----|---------|
| `SUPPORT_DOC_TTL_DAYS` | File mtime older than this → delete (default **3**) |
| `SUPPORT_DOC_CLEANUP_DRY_RUN` | `true` = log only; first run on each machine |

| File | Role |
|------|------|
| `src/jobs/cleanupSupportDocuments.js` | Scan `AUTHORIZE_UPLOAD_ROOT`, unlink old files, empty subdirs |
| `src/server.js` | `startCleanupJob()` after listen (no await) |
| `src/config/index.js` | `config.supportDocs` |
| `utils/supportDocuments.js` | `expiresAt` uses same TTL for UI countdown on **new** uploads |

Does **not** `$pull` Mongo. Upload / confirm / wizard / mail unchanged.

### Auth text helper

- FE/BE: `buildAuthorizationText.js` — `buildAuthorizationText`, `renderAuthorizationHtml`, `fillsFromInquiry`  
- Field: `Inquiry.authorizationText` (plain); HTML only at render time  
- Upload: `authorizeUpload.middleware.js` + `utils/supportDocuments.js` → `Inquiry.supportDocuments[]` (legacy `supportDocument` still readable)  

### Plan A (agent-selected doc slots)

Agent StepPreview → checkboxes → send saves `docRequest`.  
`buildDocSlots()` filters confirm uploads. Default / untouched = `all_slots` (Plan B). Storage `supportDocuments[]` unchanged.

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

## Gotoflyer T&Cs

`gotoflyerTerms.ejs` — full Gotoflyer Terms & Conditions on confirm page **below** I Authorize (collapsed + Read more / Show less). Not mixed with auth paragraph or docs.

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
- [x] Support doc disk cleanup job (mtime + env TTL; dry-run flag)  

