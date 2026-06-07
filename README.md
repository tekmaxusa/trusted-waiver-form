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

## Walang email / troubleshooting

1. **GitHub secret** — Dapat naka-set ang **`VITE_GAS_WEBAPP_URL`** (buong URL, nagsisimula sa `https://script.google.com/.../exec`). Pag walang secret o maling URL, walang maipopost sa Apps Script.
2. **Tingnan ang `gas-webapp.json`** — Buksan sa browser:  
   `https://<user>.github.io/<repo-name>/gas-webapp.json`  
   Dapat may `"gasWebAppUrl":"https://script.google.com/..."`. Kung `""` lang, kulang ang secret o kailangan i-run ulit ang deploy workflow.
3. **Apps Script** — Web app dapat **Execute as: Me**, **Who has access: Anyone**. Pagkatapos mag-edit ng script, **bagong version** ng deployment.
4. **Saan padadala ang email** — Naka-define sa `google-apps-script/Code.gs` ang **`NOTIFICATION_EMAIL`** (sa repo hal. `yu.jeremiah612@gmail.com`). I-edit iyon kung ibang inbox ang dapat tumanggap, tapos i-redeploy ang web app.
5. **Execution log** — Sa Apps Script editor: **Executions** — tingnan kung may error pag submit (hal. payload parse, quota, MailApp).
6. **Browser** — Ang POST ay `no-cors`, kaya hindi makikita sa Network tab kung 200 o error ang sagot ng Google; kaya mahalaga ang secret + Executions log.
