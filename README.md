# Replica Click — Service Centre redesign

Independent redesign of Replica Click and Ankit Tours & Travels, Kondhali. The source project at `../ankit tours nagpur` is preserved. Source inspected at commit `62f9a30` on 7 September 2026.

## Open the new version

```powershell
cd 'D:\Data Science & Analytics\ankit tours nagpur redesign'
node scripts/preview.mjs
```

Open http://127.0.0.1:4185/. Owner workspace: http://127.0.0.1:4185/admin.html. Choose **Preview the workspace** to inspect sample content without logging in. Preview is read-only and has no database connection. Enquiry forms produce WhatsApp messages; sending remains your explicit action in WhatsApp.

## Active source

```text
web/                   New shared public and owner interface
  app.js               Public pages, catalogue, enquiry and travel views
  catalog.js           Bilingual catalogue, groups and publication rules
  shared.js            Shared navigation, footer and dialog behavior
  owner.js             Authenticated owner forms and read-only design preview
  preferences.js       Explicit light / dark / device and EN / MR / both
  site.css, owner.css  New responsive visual system
assets/                Original supplied logo and service inventory
api/, lib/             Existing Vercel / Neon contracts, corrected in this copy
scripts/               Static preview, build, verification and database setup
docs/                  Audit, full inventory, design contract and verification
legacy/                Inherited frontend and old documentation (inactive)
dist/                  Generated deployment output (gitignored)
```

## What works

- Four service areas, 72 assistance services plus six travel services.
- Search in English or Marathi, category expand/collapse, featured filter, owner prices and visibility.
- Every service opens a labelled enquiry form and a reviewable WhatsApp message.
- Travel forms collect route/date/passengers/vehicle; print forms collect size/colour/copies/pages.
- Optional document sharing uses the device share sheet or manual WhatsApp attachment. **No server file upload or private document storage is implemented.**
- Owner forms cover custom services (including travel), prices, pins, visibility, service groups, vehicles, packages, gallery, reviews and drivers; bookings have a detail view and status update.
- Read-only preview uses sample records. Authenticated editing uses the original server-side PIN and HttpOnly session contract when a database is configured.
- Public production reads never substitute local samples for unavailable publication data.

## Build and checks

```powershell
node scripts/build.mjs
node --experimental-vm-modules scripts/verify.mjs
```

The project keeps the existing dependency and lockfile. The local preview and build require only Node.js. To run server APIs, install the locked packages with `npm ci`, configure an **independent staging database** and `ADMIN_PIN`, and use Vercel's development environment (`npm run dev:api`). Do not run `init-db` against the existing production database for a design review.

The Vercel configuration builds `dist/`; the 12 existing function entry points remain in `api/`. No hosting link, production credential, Git remote, or live database was copied. This version has not been deployed.

Read [the audit and implementation guide](docs/REDESIGN_AUDIT_AND_PLAN.md), [complete service inventory](docs/SERVICE_INVENTORY.md), and [verification record](docs/VERIFICATION.md) before connecting staging or publishing.
