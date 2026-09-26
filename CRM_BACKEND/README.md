# Travel CRM Backend (Phase 1)

Inquiry + customer confirmation API. No real booking / payment / PNR.

## Setup

1. Copy env and fill values:

```bash
copy .env.example .env
```

2. Start MongoDB and Redis locally.

3. Install & seed & run:

```bash
npm install
npm run seed
npm run dev
```

- API: `http://localhost:5000/api`
- Health: `GET /api/health`
- Public confirm: `GET /public/confirm/:inquiryId?token=...`

## Auth

- `POST /api/auth/login` → `{ accessToken, user }` + httpOnly `refreshToken` cookie
- `POST /api/auth/refresh` → new access token
- `POST /api/auth/logout`
- `GET /api/auth/me`

Access token → frontend Redux. Refresh → cookie (`path=/api/auth`).

## Main routes

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/calls` | Disposition; `new_booking` creates draft inquiry |
| GET | `/api/calls` | Call list |
| GET | `/api/inquiries` | Inquiry list |
| GET | `/api/inquiries/lookup?q=` | By ref / email / phone |
| GET | `/api/inquiries/:id` | Detail |
| POST | `/api/inquiries/:id/send` | Persist wizard + email customer |
| POST | `/api/inquiries/:id/close` | Agent close wait / cancel + reason |
| POST | `/api/search/flights` | Duffel (or mock) |
| GET/POST | `/public/confirm/:id` | Customer EJS confirm + thank-you |

## Roles

`admin` | `agent` | `viewer` (read-only writes blocked)

Settings/users: **admin only**.
