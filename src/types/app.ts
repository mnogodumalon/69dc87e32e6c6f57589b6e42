// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Medikamente {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    wirkstoff?: string;
    hersteller?: string;
    packungsgroesse?: number;
    einheit?: LookupValue;
    notizen?: string;
    woechentlich?: boolean;
    dosierung_morgens?: LookupValue;
    dosierung_mittags?: LookupValue;
    dosierung_abends?: LookupValue;
    dosierung_nacht?: LookupValue;
  };
}

export interface Packungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    medikament?: string; // applookup -> URL zu 'Medikamente' Record
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    anfangsmenge?: number;
    verbleibende_menge?: number;
    voraussichtliches_aufbrauch_datum?: string; // Format: YYYY-MM-DD oder ISO String
    nachbestellt?: boolean;
    nachbestelldatum?: string; // Format: YYYY-MM-DD oder ISO String
    woechentlich_packung?: boolean;
    dosierung_morgens_packung?: LookupValue;
    dosierung_mittags_packung?: LookupValue;
    dosierung_abends_packung?: LookupValue;
    dosierung_nacht_packung?: LookupValue;
    bemerkungen?: string;
  };
}

export interface MedikamentenUebersicht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    uebersicht_datum?: string; // Format: YYYY-MM-DD oder ISO String
    laufende_packungen?: string; // applookup -> URL zu 'Packungen' Record
    hinweis?: string;
  };
}

export const APP_IDS = {
  MEDIKAMENTE: '69dc87c2471f4e810f91d118',
  PACKUNGEN: '69dc87c631321f9f593c8572',
  MEDIKAMENTEN_UEBERSICHT: '69dc87c76ea165ea0a27ba4e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'medikamente': {
    einheit: [{ key: "tabletten", label: "Tabletten" }, { key: "kapseln", label: "Kapseln" }, { key: "ml", label: "ml" }, { key: "tropfen", label: "Tropfen" }, { key: "pflaster", label: "Pflaster" }, { key: "ampullen", label: "Ampullen" }],
    dosierung_morgens: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_mittags: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_abends: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_nacht: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
  },
  'packungen': {
    dosierung_morgens_packung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_mittags_packung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_abends_packung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_nacht_packung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'medikamente': {
    'name': 'string/text',
    'wirkstoff': 'string/text',
    'hersteller': 'string/text',
    'packungsgroesse': 'number',
    'einheit': 'lookup/select',
    'notizen': 'string/textarea',
    'woechentlich': 'bool',
    'dosierung_morgens': 'lookup/radio',
    'dosierung_mittags': 'lookup/radio',
    'dosierung_abends': 'lookup/radio',
    'dosierung_nacht': 'lookup/radio',
  },
  'packungen': {
    'medikament': 'applookup/select',
    'startdatum': 'date/date',
    'anfangsmenge': 'number',
    'verbleibende_menge': 'number',
    'voraussichtliches_aufbrauch_datum': 'date/date',
    'nachbestellt': 'bool',
    'nachbestelldatum': 'date/date',
    'woechentlich_packung': 'bool',
    'dosierung_morgens_packung': 'lookup/radio',
    'dosierung_mittags_packung': 'lookup/radio',
    'dosierung_abends_packung': 'lookup/radio',
    'dosierung_nacht_packung': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
  'medikamenten_uebersicht': {
    'uebersicht_datum': 'date/date',
    'laufende_packungen': 'applookup/select',
    'hinweis': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMedikamente = StripLookup<Medikamente['fields']>;
export type CreatePackungen = StripLookup<Packungen['fields']>;
export type CreateMedikamentenUebersicht = StripLookup<MedikamentenUebersicht['fields']>;