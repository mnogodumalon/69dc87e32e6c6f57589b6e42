import type { EnrichedDosierung, EnrichedMedikamentenUebersicht, EnrichedPackungen } from '@/types/enriched';
import type { Dosierung, Medikamente, MedikamentenUebersicht, Packungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface PackungenMaps {
  medikamenteMap: Map<string, Medikamente>;
}

export function enrichPackungen(
  packungen: Packungen[],
  maps: PackungenMaps
): EnrichedPackungen[] {
  return packungen.map(r => ({
    ...r,
    medikamentName: resolveDisplay(r.fields.medikament, maps.medikamenteMap, 'name'),
  }));
}

interface MedikamentenUebersichtMaps {
  packungenMap: Map<string, Packungen>;
}

export function enrichMedikamentenUebersicht(
  medikamentenUebersicht: MedikamentenUebersicht[],
  maps: MedikamentenUebersichtMaps
): EnrichedMedikamentenUebersicht[] {
  return medikamentenUebersicht.map(r => ({
    ...r,
    laufende_packungenName: resolveDisplay(r.fields.laufende_packungen, maps.packungenMap, 'dosierungsaenderungen'),
  }));
}

interface DosierungMaps {
  packungenMap: Map<string, Packungen>;
}

export function enrichDosierung(
  dosierung: Dosierung[],
  maps: DosierungMaps
): EnrichedDosierung[] {
  return dosierung.map(r => ({
    ...r,
    packung_refName: resolveDisplay(r.fields.packung_ref, maps.packungenMap, 'dosierungsaenderungen'),
  }));
}
