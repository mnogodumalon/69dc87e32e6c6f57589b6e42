import type { Dosierung, MedikamentenUebersicht, Packungen } from './app';

export type EnrichedDosierung = Dosierung & {
  packung_refName: string;
};

export type EnrichedPackungen = Packungen & {
  medikamentName: string;
};

export type EnrichedMedikamentenUebersicht = MedikamentenUebersicht & {
  laufende_packungenName: string;
};
