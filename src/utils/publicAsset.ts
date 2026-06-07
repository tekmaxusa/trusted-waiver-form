/** Vite `public/` file URL, correct under GitHub Pages base (e.g. /saheli-waiver-form/). */
export function publicAssetUrl(filename: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const name = filename.replace(/^\//, '');
  return `${base}${name}`;
}
