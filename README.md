# Saheli Eyebrow Threading — Multi-location waivers

Vite + React waiver forms for **five salon locations** (TrustedWaiver-style URLs). PDFs post to [Google Apps Script](https://developers.google.com/apps-script) for email and Sheets (see `google-apps-script/Code.gs`). Design and routing are described in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local development

```bash
npm ci
cp .env.example .env.local
# Set VITE_GAS_WEBAPP_URL in .env.local to your deployed web app URL.
# Or copy public/gas-webapp.example.json to public/gas-webapp.json and set gasWebAppUrl.
npm run dev
```

Open:

- `http://localhost:3000/` — links to each waiver  
- `http://localhost:3000/sahelieyebrow/waiver-from-centennial-location/` (and Aurora, Thornton, Denver, Parker — same path pattern as TrustedWaiver)

## Deploy to GitHub Pages

Target repository: [tekmaxusa/saheli-waiver-form](https://github.com/tekmaxusa/saheli-waiver-form).

1. Push this repo to GitHub (default branch `main`).
2. **Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions**.
3. **Optional GitHub secret** — **`VITE_GAS_WEBAPP_URL`** overrides the committed `public/gas-webapp.json` during the build. If you do not set the secret, the repo’s committed `gas-webapp.json` (your default Apps Script `/exec` URL) is used so the live site still receives waivers.
4. Push to `main` or run the workflow manually (**Actions → Deploy to GitHub Pages → Run workflow**).

The live site will be at `https://tekmaxusa.github.io/saheli-waiver-form/` (paths and assets use the repo name as the base path).

## GitHub Actions

Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## Email not received / troubleshooting

1. **GitHub secret** — **`VITE_GAS_WEBAPP_URL`** must be set to your full URL (starts with `https://script.google.com/...` and ends with `/exec`). If it is missing or wrong, nothing is posted to Apps Script.
2. **`gas-webapp.json`** — In your browser open `https://<user>.github.io/<repo-name>/gas-webapp.json`. You should see `"gasWebAppUrl":"https://script.google.com/..."`. If it is empty, add or fix the secret and run the deploy workflow again.
3. **Apps Script** — Web app should use **Execute as: Me** and **Who has access: Anyone**. After editing the script, create a **new version** of the deployment.
4. **Where email goes** — Set in `google-apps-script/Code.gs` as **`NOTIFICATION_EMAIL`**. Change it there if a different inbox should receive waivers, then redeploy the web app.
5. **Execution log** — In the Apps Script editor, open **Executions** and check for errors when you submit (e.g. payload parse, quota, MailApp).
6. **Browser** — The form POST uses `no-cors`, so the Network tab will not show whether Google returned success or failure; rely on the secret, `gas-webapp.json`, and the Executions log.
