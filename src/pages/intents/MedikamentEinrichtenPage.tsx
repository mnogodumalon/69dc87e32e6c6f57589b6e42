import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Medikamente, Packungen, Dosierung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { DosierungDialog } from '@/components/dialogs/DosierungDialog';
import { Button } from '@/components/ui/button';
import {
  IconPill,
  IconPackage,
  IconClockHour4,
  IconCircleCheck,
  IconPlus,
  IconArrowRight,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Medikament' },
  { label: 'Packung' },
  { label: 'Dosierung' },
  { label: 'Zusammenfassung' },
];

export default function MedikamentEinrichtenPage() {
  const [searchParams] = useSearchParams();

  const initialStep = (() => {
    const p = parseInt(searchParams.get('step') ?? '', 10);
    if (p >= 1 && p <= 4) return p;
    return 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Data
  const [medikamente, setMedikamente] = useState<Medikamente[]>([]);
  const [packungen, setPackungen] = useState<Packungen[]>([]);

  // Wizard selections
  const [selectedMedikament, setSelectedMedikament] = useState<Medikamente | null>(null);
  const [selectedPackung, setSelectedPackung] = useState<Packungen | null>(null);
  const [selectedDosierung, setSelectedDosierung] = useState<Dosierung | null>(null);

  // Dialog state
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [dosDialogOpen, setDosDialogOpen] = useState(false);

  // Step 1: track if packung was skipped
  const [packungSkipped, setPackungSkipped] = useState(false);

  const fetchMedikamente = useCallback(async () => {
    const data = await LivingAppsService.getMedikamente();
    setMedikamente(data);
    return data;
  }, []);

  const fetchPackungen = useCallback(async () => {
    const data = await LivingAppsService.getPackungen();
    setPackungen(data);
    return data;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMedikamente(), fetchPackungen()]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [fetchMedikamente, fetchPackungen]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedMedikament(null);
    setSelectedPackung(null);
    setSelectedDosierung(null);
    setPackungSkipped(false);
  };

  // Step 0 → 1: select existing medikament
  const handleSelectMedikament = (id: string) => {
    const med = medikamente.find(m => m.record_id === id) ?? null;
    setSelectedMedikament(med);
    setCurrentStep(2);
  };

  // After creating new medikament: auto-select it
  const handleMedikamentCreated = async () => {
    const fresh = await fetchMedikamente();
    // Pick the most recently created one (last in list by createdat)
    const sorted = [...fresh].sort((a, b) => b.createdat.localeCompare(a.createdat));
    if (sorted.length > 0) {
      setSelectedMedikament(sorted[0]);
      setCurrentStep(2);
    }
    setMedDialogOpen(false);
  };

  // Step 1 → 2: after packung created, find the newest one linked to this medikament
  const handlePackungCreated = async () => {
    const fresh = await fetchPackungen();
    if (selectedMedikament) {
      const medUrl = createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id);
      const linked = fresh.filter(p => p.fields.medikament === medUrl);
      const sorted = [...linked].sort((a, b) =>
        (b.createdat ?? '').localeCompare(a.createdat ?? '')
      );
      if (sorted.length > 0) {
        setSelectedPackung(sorted[0]);
      }
    }
    setPackDialogOpen(false);
  };

  // Step 2 → 3: after dosierung created
  const handleDosierungCreated = async (fields: Dosierung['fields']) => {
    // Store the dosierung from the fields we just submitted
    // We don't have an ID yet, so store a synthetic record for summary
    setSelectedDosierung({ record_id: '', createdat: '', updatedat: null, fields });
    setDosDialogOpen(false);
    setCurrentStep(4);
  };

  const medikamentName = selectedMedikament?.fields?.name ?? '–';
  const medikamentWirkstoff = selectedMedikament?.fields?.wirkstoff ?? '';

  return (
    <IntentWizardShell
      title="Medikament einrichten"
      subtitle="Richte ein neues Medikament mit Packung und Dosierung ein — alles in einem Schritt."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Medikament wählen ─────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconPill size={18} className="text-primary" stroke={2} />
            </div>
            <div>
              <h2 className="font-semibold text-base">Medikament wählen</h2>
              <p className="text-xs text-muted-foreground">
                Wähle ein bestehendes Medikament oder lege ein neues an.
              </p>
            </div>
          </div>

          <EntitySelectStep
            items={medikamente.map(m => ({
              id: m.record_id,
              title: m.fields.name ?? '(kein Name)',
              subtitle: [m.fields.wirkstoff, m.fields.hersteller].filter(Boolean).join(' · '),
              icon: <IconPill size={16} className="text-primary" stroke={2} />,
            }))}
            onSelect={handleSelectMedikament}
            searchPlaceholder="Medikament suchen..."
            emptyIcon={<IconPill size={32} stroke={1.5} />}
            emptyText="Noch keine Medikamente vorhanden."
            createLabel="Neues Medikament anlegen"
            onCreateNew={() => setMedDialogOpen(true)}
            createDialog={
              <MedikamenteDialog
                open={medDialogOpen}
                onClose={() => setMedDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createMedikamenteEntry(fields);
                  await handleMedikamentCreated();
                }}
                enablePhotoScan={false}
                enablePhotoLocation={false}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Packung anlegen ───────────────────────────────────── */}
      {currentStep === 2 && selectedMedikament && (
        <div className="space-y-4">
          {/* Context card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPill size={16} className="text-primary" stroke={2} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Medikament</p>
              <p className="font-medium text-sm truncate">{medikamentName}</p>
              {medikamentWirkstoff && (
                <p className="text-xs text-muted-foreground truncate">{medikamentWirkstoff}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconPackage size={18} className="text-primary" stroke={2} />
            </div>
            <div>
              <h2 className="font-semibold text-base">Packung anlegen</h2>
              <p className="text-xs text-muted-foreground">
                Erfasse die neue Packung für dieses Medikament.
              </p>
            </div>
          </div>

          {selectedPackung ? (
            // Packung already created — show summary
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <IconCircleCheck size={18} className="text-green-600 shrink-0" stroke={2} />
                <span className="font-medium text-sm text-green-700">Packung erfasst</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                <span className="text-muted-foreground">Startdatum</span>
                <span>{selectedPackung.fields.startdatum ?? '–'}</span>
                <span className="text-muted-foreground">Anfangsmenge</span>
                <span>{selectedPackung.fields.anfangsmenge ?? '–'}</span>
                {selectedPackung.fields.bemerkungen && (
                  <>
                    <span className="text-muted-foreground">Bemerkungen</span>
                    <span className="truncate">{selectedPackung.fields.bemerkungen}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPackDialogOpen(true)}
                >
                  <IconRefresh size={14} className="mr-1.5" stroke={2} />
                  Andere Packung anlegen
                </Button>
                <Button size="sm" onClick={() => setCurrentStep(3)}>
                  Weiter
                  <IconArrowRight size={14} className="ml-1.5" stroke={2} />
                </Button>
              </div>
            </div>
          ) : (
            // No packung yet — action buttons
            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => setPackDialogOpen(true)}
              >
                <IconPlus size={16} className="mr-2" stroke={2} />
                Packung anlegen
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPackungSkipped(true);
                  setCurrentStep(3);
                }}
              >
                Überspringen (Packung existiert bereits)
              </Button>
            </div>
          )}

          <PackungenDialog
            open={packDialogOpen}
            onClose={() => setPackDialogOpen(false)}
            onSubmit={async (fields) => {
              const medUrl = createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id);
              await LivingAppsService.createPackungenEntry({ ...fields, medikament: medUrl });
              await handlePackungCreated();
            }}
            defaultValues={{
              medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id),
            }}
            medikamenteList={medikamente}
            enablePhotoScan={false}
            enablePhotoLocation={false}
          />
        </div>
      )}

      {/* ── STEP 3: Dosierung festlegen ───────────────────────────────── */}
      {currentStep === 3 && selectedMedikament && (
        <div className="space-y-4">
          {/* Context cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconPill size={16} className="text-primary" stroke={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Medikament</p>
                <p className="font-medium text-sm truncate">{medikamentName}</p>
              </div>
            </div>
            {selectedPackung && !packungSkipped && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconPackage size={16} className="text-primary" stroke={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Packung</p>
                  <p className="font-medium text-sm">
                    {selectedPackung.fields.startdatum ?? '–'}
                    {selectedPackung.fields.anfangsmenge != null
                      ? ` · ${selectedPackung.fields.anfangsmenge} Stück`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconClockHour4 size={18} className="text-primary" stroke={2} />
            </div>
            <div>
              <h2 className="font-semibold text-base">Dosierung festlegen</h2>
              <p className="text-xs text-muted-foreground">
                Lege die Dosierungsänderung für diese Packung fest.
              </p>
            </div>
          </div>

          {selectedDosierung ? (
            // Dosierung already created
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <IconCircleCheck size={18} className="text-green-600 shrink-0" stroke={2} />
                <span className="font-medium text-sm text-green-700">Dosierung erfasst</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                <span className="text-muted-foreground">Gültig ab</span>
                <span>{selectedDosierung.fields.gueltig_ab ?? '–'}</span>
                {selectedDosierung.fields.dosierung_morgens_aenderung && (
                  <>
                    <span className="text-muted-foreground">Morgens</span>
                    <span>
                      {typeof selectedDosierung.fields.dosierung_morgens_aenderung === 'object'
                        ? selectedDosierung.fields.dosierung_morgens_aenderung.label
                        : selectedDosierung.fields.dosierung_morgens_aenderung}
                    </span>
                  </>
                )}
                {selectedDosierung.fields.dosierung_mittags_aenderung && (
                  <>
                    <span className="text-muted-foreground">Mittags</span>
                    <span>
                      {typeof selectedDosierung.fields.dosierung_mittags_aenderung === 'object'
                        ? selectedDosierung.fields.dosierung_mittags_aenderung.label
                        : selectedDosierung.fields.dosierung_mittags_aenderung}
                    </span>
                  </>
                )}
                {selectedDosierung.fields.dosierung_abends_aenderung && (
                  <>
                    <span className="text-muted-foreground">Abends</span>
                    <span>
                      {typeof selectedDosierung.fields.dosierung_abends_aenderung === 'object'
                        ? selectedDosierung.fields.dosierung_abends_aenderung.label
                        : selectedDosierung.fields.dosierung_abends_aenderung}
                    </span>
                  </>
                )}
                {selectedDosierung.fields.dosierung_nacht_aenderung && (
                  <>
                    <span className="text-muted-foreground">Nacht</span>
                    <span>
                      {typeof selectedDosierung.fields.dosierung_nacht_aenderung === 'object'
                        ? selectedDosierung.fields.dosierung_nacht_aenderung.label
                        : selectedDosierung.fields.dosierung_nacht_aenderung}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setCurrentStep(4)}>
                  Weiter zur Zusammenfassung
                  <IconArrowRight size={14} className="ml-1.5" stroke={2} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => setDosDialogOpen(true)}
                disabled={!selectedPackung && !packungSkipped}
              >
                <IconPlus size={16} className="mr-2" stroke={2} />
                Dosierung anlegen
              </Button>
              {!selectedPackung && !packungSkipped && (
                <p className="text-xs text-muted-foreground text-center">
                  Bitte lege zuerst eine Packung an oder gehe zurück zu Schritt 2.
                </p>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setCurrentStep(4)}
              >
                Überspringen
              </Button>
            </div>
          )}

          <DosierungDialog
            open={dosDialogOpen}
            onClose={() => setDosDialogOpen(false)}
            onSubmit={async (fields) => {
              const packungRef = selectedPackung
                ? createRecordUrl(APP_IDS.PACKUNGEN, selectedPackung.record_id)
                : undefined;
              const finalFields = packungRef ? { ...fields, packung_ref: packungRef } : fields;
              await LivingAppsService.createDosierungEntry(finalFields);
              await handleDosierungCreated(finalFields);
            }}
            defaultValues={
              selectedPackung
                ? {
                    packung_ref: createRecordUrl(
                      APP_IDS.PACKUNGEN,
                      selectedPackung.record_id
                    ),
                  }
                : undefined
            }
            packungenList={packungen}
            enablePhotoScan={false}
            enablePhotoLocation={false}
          />
        </div>
      )}

      {/* ── STEP 4: Zusammenfassung ───────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <IconCircleCheck size={18} className="text-green-600" stroke={2} />
            </div>
            <div>
              <h2 className="font-semibold text-base">Einrichtung abgeschlossen</h2>
              <p className="text-xs text-muted-foreground">
                Hier ist eine Übersicht über alles, was du eingerichtet hast.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {/* Medikament */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconPill size={16} className="text-primary shrink-0" stroke={2} />
                <span className="font-semibold text-sm">Medikament</span>
              </div>
              {selectedMedikament ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="truncate">{selectedMedikament.fields.name ?? '–'}</span>
                  {selectedMedikament.fields.wirkstoff && (
                    <>
                      <span className="text-muted-foreground">Wirkstoff</span>
                      <span className="truncate">{selectedMedikament.fields.wirkstoff}</span>
                    </>
                  )}
                  {selectedMedikament.fields.hersteller && (
                    <>
                      <span className="text-muted-foreground">Hersteller</span>
                      <span className="truncate">{selectedMedikament.fields.hersteller}</span>
                    </>
                  )}
                  {selectedMedikament.fields.einheit && (
                    <>
                      <span className="text-muted-foreground">Einheit</span>
                      <span>
                        {typeof selectedMedikament.fields.einheit === 'object'
                          ? selectedMedikament.fields.einheit.label
                          : selectedMedikament.fields.einheit}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Kein Medikament ausgewählt.</p>
              )}
            </div>

            {/* Packung */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconPackage size={16} className="text-primary shrink-0" stroke={2} />
                <span className="font-semibold text-sm">Packung</span>
              </div>
              {selectedPackung ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Startdatum</span>
                  <span>{selectedPackung.fields.startdatum ?? '–'}</span>
                  <span className="text-muted-foreground">Anfangsmenge</span>
                  <span>
                    {selectedPackung.fields.anfangsmenge != null
                      ? String(selectedPackung.fields.anfangsmenge)
                      : '–'}
                  </span>
                  {selectedPackung.fields.bemerkungen && (
                    <>
                      <span className="text-muted-foreground">Bemerkungen</span>
                      <span className="truncate">{selectedPackung.fields.bemerkungen}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {packungSkipped ? 'Übersprungen.' : 'Keine Packung angelegt.'}
                </p>
              )}
            </div>

            {/* Dosierung */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconClockHour4 size={16} className="text-primary shrink-0" stroke={2} />
                <span className="font-semibold text-sm">Dosierung</span>
              </div>
              {selectedDosierung ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Gültig ab</span>
                  <span>{selectedDosierung.fields.gueltig_ab ?? '–'}</span>
                  {selectedDosierung.fields.dosierung_morgens_aenderung && (
                    <>
                      <span className="text-muted-foreground">Morgens</span>
                      <span>
                        {typeof selectedDosierung.fields.dosierung_morgens_aenderung === 'object'
                          ? selectedDosierung.fields.dosierung_morgens_aenderung.label
                          : selectedDosierung.fields.dosierung_morgens_aenderung}
                      </span>
                    </>
                  )}
                  {selectedDosierung.fields.dosierung_mittags_aenderung && (
                    <>
                      <span className="text-muted-foreground">Mittags</span>
                      <span>
                        {typeof selectedDosierung.fields.dosierung_mittags_aenderung === 'object'
                          ? selectedDosierung.fields.dosierung_mittags_aenderung.label
                          : selectedDosierung.fields.dosierung_mittags_aenderung}
                      </span>
                    </>
                  )}
                  {selectedDosierung.fields.dosierung_abends_aenderung && (
                    <>
                      <span className="text-muted-foreground">Abends</span>
                      <span>
                        {typeof selectedDosierung.fields.dosierung_abends_aenderung === 'object'
                          ? selectedDosierung.fields.dosierung_abends_aenderung.label
                          : selectedDosierung.fields.dosierung_abends_aenderung}
                      </span>
                    </>
                  )}
                  {selectedDosierung.fields.dosierung_nacht_aenderung && (
                    <>
                      <span className="text-muted-foreground">Nacht</span>
                      <span>
                        {typeof selectedDosierung.fields.dosierung_nacht_aenderung === 'object'
                          ? selectedDosierung.fields.dosierung_nacht_aenderung.label
                          : selectedDosierung.fields.dosierung_nacht_aenderung}
                      </span>
                    </>
                  )}
                  {selectedDosierung.fields.bemerkungen_aenderung && (
                    <>
                      <span className="text-muted-foreground">Bemerkungen</span>
                      <span className="truncate">{selectedDosierung.fields.bemerkungen_aenderung}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine Dosierung angelegt.</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                window.location.href = '/#/medikamente';
              }}
            >
              <IconCircleCheck size={16} className="mr-2" stroke={2} />
              Fertig
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              <IconPlus size={16} className="mr-2" stroke={2} />
              Weiteres Medikament einrichten
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
