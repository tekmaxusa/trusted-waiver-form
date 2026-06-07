# Multi-merchant waiver platform — architecture

This document summarizes the refactor for **TrustedWaiver-style URLs**, **GitHub Pages folder routing**, and **future merchants**.

## A. Previous project (before refactor)

- **Stack:** Vite 6, React 19, Tailwind 4, jsPDF, single-page app with one root `index.html`.
- **Flow:** `App` rendered one `WaiverForm` + `SuccessPage`; copy was **Centennial-only** (header, footer, PDF header).
- **Backend:** POST to Google Apps Script with `WaiverSubmissionPayload` (no location metadata). Apps Script used a fixed email subject (“Centennial”) and a sheet row **without** a Location column.

## B. Folder structure (scalable)

```
src/
  merchants/
    types.ts                 # WaiverLocationConfig
    registry.ts              # resolveWaiverLocation(), listAllWaiverHrefPaths()
    sahelieyebrow/
      locations.ts           # SAHELI_EYEBROW_LOCATIONS (5 entries)
  routes/
    HomePage.tsx             # Index: links to each waiver path
    WaiverRoutePage.tsx      # :merchantSlug/:waiverSlug → App or 404
    NotFoundPage.tsx
  components/                # Shared UI
  utils/pdfGenerator.ts      # Shared PDF + pdfBrandingForLocation()
sahelieyebrow/
  waiver-from-centennial-location/index.html
  waiver-from-aurora-location/index.html
  … (5 waivers, each MPA entry for GitHub Pages)
index.html                   # Root “choose location” entry
google-apps-script/Code.gs   # Email subject, Sheets Location, recipient
```

**Future merchant example:** add `src/merchants/otherbrand/locations.ts`, append to `ALL_LOCATIONS` in `registry.ts`, add `otherbrand/waiver-form/index.html`, register path in `vite.config.ts` `WAIVER_HTML_PATHS`.

## C. Reusable components

| Piece | Role |
|--------|------|
| `WaiverForm`, `SignaturePad`, `SuccessPage` | Shared; take `location: WaiverLocationConfig`. |
| `generateWaiverPDF` + `pdfBrandingForLocation` | Location-specific PDF title, address line, footer, filename. |
| `resolveGasWebAppUrl` | Unchanged. |
| `App` | Header/footer/intro from `WaiverLocationConfig` only. |

## D. Scalability plan

1. **URL = merchant + waiver page:** React Router `:merchantSlug/:waiverSlug`.
2. **Registry:** `resolveWaiverLocation()` — extend `ALL_LOCATIONS`.
3. **Build entries:** Add paths to `WAIVER_HTML_PATHS` in `vite.config.ts`.
4. **Recipient email:** `NOTIFICATION_EMAIL` in Apps Script (can move to Script Properties later). Payload **`waiverMeta`** supports future routing.

## E. Checklist

- [x] Router, merchants, MPA HTML, PDF branding, payload `waiverMeta`.
- [x] `Code.gs`: `sahelieyebrowco@gmail.com`, subject with location, Sheets Location column.
- [ ] **You:** Redeploy Apps Script after editing `Code.gs`. If an existing Sheet has old headers, use a new tab or align headers to the 9-column format.

## Local URLs (dev, base `/`)

- `http://localhost:3000/` — picker  
- `http://localhost:3000/sahelieyebrow/waiver-from-centennial-location/` (and Aurora, Thornton, Denver, Parker)

## GitHub Pages

Example: `https://<user>.github.io/<repo>/sahelieyebrow/waiver-from-centennial-location/`
