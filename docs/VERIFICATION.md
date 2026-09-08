# Redesign verification

Date: 7 September 2026. Scope: separate local redesign. No live database or external messaging was used.

## Completed

- `node scripts/build.mjs`: passed. Deployment output generated under `dist/`.
- `node --experimental-vm-modules scripts/verify.mjs`: **36 checks passed**.
- All active JavaScript modules and backend handlers passed Node syntax checks.
- All 78 services verified: 6 travel, 43 banking/citizen, 7 print/photo, 22 online. Each built-in assistance entry has corresponding Marathi text and a unique stable ID.
- Catalogue behavior verified with controlled data: price overrides, pinned ordering, hidden built-in/custom entries, custom travel entries, group hiding, local fallback and hosted fail-closed behavior.
- Mocked API boundary tests verified fleet/packages/gallery/testimonials: public feeds only return visible records, owner feeds reject unauthenticated calls, authenticated feeds include hidden records with private/no-store caching. These mocks verify handler behavior, **not** a live Neon connection.
- The API entry count remains **12**.
- Build asset references and all emitted public routes resolve. `legacy/`, `api/`, `lib/`, `docs/` and environment files are excluded from static output.
- HTTP 200 confirmed for home, travel, banking, print/photo, online, contact, admin, owner script, shared stylesheet and supplied logo at localhost:4185.
- Static preview rejects API writes with HTTP 503 and does not import or call database handlers.
- Original project remains at commit `62f9a30`. Its Git worktree is unchanged; checksums for original homepage, admin page, service catalogue and theme controller match the values captured before redesign work.

## Testing limits

No browser screenshot/responsive interaction audit was performed in this run. The CSS includes layouts for 1160, 900, 580 and 420px plus owner-specific responsive rules; their presence and syntax are not a substitute for device QA.

No production deployment, live PIN login, live owner CRUD, database migration, real enquiry save, actual WhatsApp send or device file-share test was performed. The local owner preview is read-only by design. It contains sample data and exposes no customer records. These connected workflows need the independent staging environment described in the README.

## Staging acceptance checklist

1. Configure a separate Neon database and owner PIN; initialize against that confirmed staging URL.
2. Sign in, add a hidden service, edit English/Marathi names and price, show it, pin it, then verify public search and enquiry context.
3. Hide a vehicle/package/photo/review, reload the workspace and show it again. Public unauthenticated `?all=1` must return 401.
4. Update driver display name, experience, eligible vehicles and status. Check that public responses/markup omit private phone, legal name and notes.
5. Submit a test enquiry to staging; verify full bilingual text, reference and state changes in the owner inbox/activity log.
6. On supported mobile hardware, share a non-sensitive sample PDF; check recipient selection and attachment. On desktop, verify the manual WhatsApp attachment instructions.
7. Exercise 320/375/768/1440px widths, keyboard navigation, 200% text size, EN/MR/both, light/dark/device, reduced motion, category collapse, search, dialog cancellation and focus restoration.
8. Verify publication failures do not restore sample prices/hidden services. Verify the Contact page remains available independently of service APIs.
9. Have the owner approve actual prices, opening hours, vehicle photos and customer testimonials before public deployment.
