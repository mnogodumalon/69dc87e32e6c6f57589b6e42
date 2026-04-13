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

export interface Dosierung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    packung_ref?: string; // applookup -> URL zu 'Packungen' Record
    gueltig_ab?: string; // Format: YYYY-MM-DD oder ISO String
    woechentlich_dosierung?: boolean;
    dosierung_morgens_aenderung?: LookupValue;
    dosierung_mittags_aenderung?: LookupValue;
    dosierung_abends_aenderung?: LookupValue;
    dosierung_nacht_aenderung?: LookupValue;
    bemerkungen_aenderung?: string;
  };
}

export interface Packungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    dosierungsaenderungen?: LookupValue[];
    anbruch_datum?: string; // Format: YYYY-MM-DD oder ISO String
    medikament?: string; // applookup -> URL zu 'Medikamente' Record
    anfangsmenge?: number;
    nachbestellt?: boolean;
    nachbestelldatum?: string; // Format: YYYY-MM-DD oder ISO String
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
  DOSIERUNG: '69dc8fe218597b396e6188f7',
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
  'dosierung': {
    dosierung_morgens_aenderung: [{ key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }, { key: "d0", label: "0" }],
    dosierung_mittags_aenderung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_abends_aenderung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
    dosierung_nacht_aenderung: [{ key: "d0", label: "0" }, { key: "d025", label: "0,25" }, { key: "d05", label: "0,5" }, { key: "d1", label: "1" }],
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
  'dosierung': {
    'packung_ref': 'applookup/select',
    'gueltig_ab': 'date/date',
    'woechentlich_dosierung': 'bool',
    'dosierung_morgens_aenderung': 'lookup/radio',
    'dosierung_mittags_aenderung': 'lookup/radio',
    'dosierung_abends_aenderung': 'lookup/radio',
    'dosierung_nacht_aenderung': 'lookup/radio',
    'bemerkungen_aenderung': 'string/textarea',
  },
  'packungen': {
    'dosierungsaenderungen': 'multiplelookup/select',
    'anbruch_datum': 'date/date',
    'medikament': 'applookup/select',
    'anfangsmenge': 'number',
    'nachbestellt': 'bool',
    'nachbestelldatum': 'date/date',
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
export type CreateDosierung = StripLookup<Dosierung['fields']>;
export type CreatePackungen = StripLookup<Packungen['fields']>;
export type CreateMedikamentenUebersicht = StripLookup<MedikamentenUebersicht['fields']>;