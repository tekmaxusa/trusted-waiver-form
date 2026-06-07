let cachedJsonUrl: string | null | undefined;

function fromEnvOrStorage(): string | null {
  const env = import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined;
  if (env && String(env).trim().startsWith('https://script.google.com')) {
    return String(env).trim();
  }
  try {
    const stored = localStorage.getItem('saheli_waiver_gas_url');
    if (stored && stored.trim().startsWith('https://script.google.com')) {
      return stored.trim();
    }
  } catch {
    /* private mode */
  }
  return null;
}

/**
 * Apps Script web app URL: build-time env, localStorage, then same-origin
 * `gas-webapp.json` (written in CI from GitHub Actions secret).
 */
export async function resolveGasWebAppUrl(): Promise<string | null> {
  const direct = fromEnvOrStorage();
  if (direct) return direct;

  if (cachedJsonUrl !== undefined) return cachedJsonUrl;

  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}gas-webapp.json`, {cache: 'no-store'});
    if (!res.ok) {
      cachedJsonUrl = null;
      return null;
    }
    const j = (await res.json()) as {gasWebAppUrl?: string};
    const u = (j.gasWebAppUrl || '').trim();
    if (u.startsWith('https://script.google.com')) {
      cachedJsonUrl = u;
      return u;
    }
  } catch {
    /* network / parse */
  }
  cachedJsonUrl = null;
  return null;
}
