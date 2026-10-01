# CRM Flight Capture Extension (Educational)

**Local learning only.** Prefer authorized APIs (Duffel / Flight MCP) in production.
Do not scrape OTAs for client work without written permission.

## Supported sites

| Site | Open from CRM | Content script |
|------|---------------|----------------|
| Kiwi.com | Open Kiwi (extension) | `content/kiwi.js` |
| [Google Flights](https://www.google.com/travel/flights?gl=IN&hl=en) | Open Google Flights | `content/google.js` |

Both send the same payload to CRM via `background.js` → `content/crm.js` → `crm:flight-captured`.

## Load / reload

1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder
2. After any change: click **Reload** on the extension card
3. CRM: `VITE_ENABLE_KIWI_EXT=true` in `CRM_FRONTEND/.env` + restart Vite

## Test Google Flights

1. Wizard → Flight Search → **Open Google Flights**
2. Search a route on Google
3. When results show, **Send to CRM** on a card
4. CRM should focus and open Select Flight with mapped offer

Google DOM changes often — if buttons missing, check Console for `[Google Capture]`.
