# Ankit Tours & Travels — Deccan Road Edition

Responsive public transportation website and authenticated owner portal for Ankit Tours & Travels, Kondhali/Nagpur.

The public experience now connects two businesses while keeping their actions distinct:

- **Ankit Tours & Travels** — fleet, packages, routes, availability enquiries, and travel bookings.
- **Replica Click Online Center & Mini Bank** — searchable online, printing, banking, farmer, education, ticketing, and government-service assistance.

Replica Click enquiries accept only contact details and a plain-language work description. They never request Aadhaar numbers, bank credentials, OTPs, PINs, passwords, or document uploads. Its catalogue lives in `assets/data/replica-services.json`; enquiries use the existing bookings API with source `replica-online-service`, then continue on WhatsApp.

## Current experience

- Public site: `index.html`
- Owner portal: `admin.html`
- Responsive Light/Dark/System themes
- Signature-style branded loader
- Code-native interactive 3D fleet visuals
- Owner-selectable fleet display: `3d`, `photo`, or `auto` (3D plus visitor photo switch)
- Local Nagpur/Kondhali/Tadoba/Pench/Shirdi route artwork instead of generic foreign stock scenes
- Expandable service, fare, availability, and booking-information cards
- Mobile navigation auto-hide, quote popup, and Call/Quote/WhatsApp dock
- English, Hindi, and Marathi interface text
- Neon PostgreSQL content and bookings with local JSON fallback for static development

## Local preview

Serve this directory over HTTP; opening with `file://` cannot exercise API behavior reliably. The public site falls back to `assets/data/site-data.json` when the API is unavailable.

## Owner authentication

Owner login is verified by `/api/owner/login` using the server-side `ADMIN_PIN` environment variable and an HttpOnly session. Never place the PIN in HTML, JavaScript, documentation, URLs, or Git history.

## Fleet visual fields

The `fleet` table includes:

- `display_mode`: `3d`, `photo`, or `auto`
- `model_color`: six-digit CSS hex colour used by the 3D vehicle
- `vehicle_type`: `suv`, `sedan`, or `traveller`
- `image`: optional HTTPS owner photograph

`api/fleet.js` adds these columns safely with `ALTER TABLE ... IF NOT EXISTS` for existing Neon deployments. `scripts/init-db.js` also contains the complete current schema for clean environments.

## Environment

Required production variables:

- `DATABASE_URL`
- `ADMIN_PIN`
- `SESSION_SECRET`

Do not commit environment files or database credentials.

## Deployment

The project is configured for Vercel through `vercel.json`. Before deploying, run syntax checks, inspect `git diff`, verify environment variables, and test public/owner flows at mobile and desktop sizes. A Vercel `READY` state alone does not confirm application security or data correctness.
