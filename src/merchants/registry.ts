import type {WaiverLocationConfig} from './types';
import {SAHELI_EYEBROW_LOCATIONS} from './sahelieyebrow/locations';

/** All registered waiver routes (add imports from other merchants here). */
const ALL_LOCATIONS: WaiverLocationConfig[] = [...SAHELI_EYEBROW_LOCATIONS];

export function resolveWaiverLocation(
  merchantSlug: string | undefined,
  waiverPageSlug: string | undefined
): WaiverLocationConfig | null {
  if (!merchantSlug || !waiverPageSlug) return null;
  const m = merchantSlug.toLowerCase();
  const w = waiverPageSlug.toLowerCase();
  return (
    ALL_LOCATIONS.find(
      (loc) => loc.merchantSlug.toLowerCase() === m && loc.waiverPageSlug.toLowerCase() === w
    ) ?? null
  );
}

export function listAllWaiverHrefPaths(): string[] {
  return ALL_LOCATIONS.map((l) => `${l.merchantSlug}/${l.waiverPageSlug}`);
}
