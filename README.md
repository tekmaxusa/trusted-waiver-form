# Saheli Centennial — Client Waiver

Vite + React waiver form. Waiver PDFs are posted to [Google Apps Script](https://developers.google.com/apps-script) for email and optional Sheets logging (see `google-apps-script/Code.gs`).

## Local development

```bash
npm ci
cp .env.example .env.local
# Set VITE_GAS_WEBAPP_URL in .env.local to your deployed web app URL.
# Or copy public/gas-webapp.example.json to public/gas-webapp.json and set gasWebAppUrl.
npm run dev
```

## Deploy to GitHub Pages

Target repository: [tekmaxusa/saheli-waiver-form](https://github.com/tekmaxusa/saheli-waiver-form).

1. Push this repo to GitHub (default branch `main`).
2. **Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions**.
3. **Settings → Secrets and variables → Actions:** add secret **`VITE_GAS_WEBAPP_URL`** (your Apps Script `/exec` URL). The workflow copies it into `public/gas-webapp.json` during the build so the live site can load the endpoint from the same origin as well as from Vite’s env.
4. Push to `main` or run the workflow manually (**Actions → Deploy to GitHub Pages → Run workflow**).

The live site will be at `https://tekmaxusa.github.io/saheli-waiver-form/` (paths and assets use the repo name as the base path).

## GitHub Actions

Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
