import { useState, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { DosierungDialog } from '@/components/dialogs/DosierungDialog';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Medikamente, Packungen } from '@/types/app';
import { Button } from '@/components/ui/button';
import {
  IconPill,
  IconPackage,
  IconPlus,
  IconCheck,
  IconChevronRight,
  IconClipboardList,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Medikament' },
  { label: 'Packung' },
  { label: 'Dosierung' },
  { label: 'Zusammenfassung' },
];

function DosierungBadge({ label }: { label?: string }) {
  if (!label) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
      {label}
    </span>
  );
}

export default function NeuePackungPage() {
  const { medikamente, packungen, loading, error, fetchAll } = useDashboardData();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMedikament, setSelectedMedikament] = useState<Medikamente | null>(null);
  const [createdPackung, setCreatedPackung] = useState<Packungen | null>(null);
  const [dosierungCreated, setDosierungCreated] = useState(false);

  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [packungDialogOpen, setPackungDialogOpen] = useState(false);
  const [dosierungDialogOpen, setDosierungDialogOpen] = useState(false);

  const handleSelectMedikament = useCallback((id: string) => {
    const med = medikamente.find(m => m.record_id === id) ?? null;
    setSelectedMedikament(med);
  }, [medikamente]);

  const handleMedikamentCreated = useCallback(async (fields: Medikamente['fields']) => {
    await LivingAppsService.createMedikamenteEntry(fields);
    await fetchAll();
  }, [fetchAll]);

  const handlePackungCreated = useCallback(async (fields: Packungen['fields']) => {
    const response = await LivingAppsService.createPackungenEntry(fields);
    await fetchAll();
    // Extract the newly created record_id from the API response
    if (response && typeof response === 'object') {
      const entries = Object.entries(response as Record<string, unknown>);
      if (entries.length > 0) {
        const [newRecordId] = entries[0] as [string, unknown];
        setCreatedPackung({ record_id: newRecordId, createdat: '', updatedat: null, fields: fields as Packungen['fields'] });
      } else {
        // fallback: use fields directly with a placeholder ID
        setCreatedPackung({ record_id: '', createdat: '', updatedat: null, fields: fields as Packungen['fields'] });
      }
    }
  }, [fetchAll]);

  const handleDosierungCreated = useCallback(async (fields: Packungen['fields']) => {
    await LivingAppsService.createDosierungEntry(fields as any);
    setDosierungCreated(true);
  }, []);

  // ALL hooks before early returns
  // (no additional hooks needed)

  const packungDefaultValues: Packungen['fields'] | undefined = selectedMedikament
    ? { medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id) }
    : undefined;

  const dosierungDefaultValues = createdPackung && createdPackung.record_id
    ? { packung_ref: createRecordUrl(APP_IDS.PACKUNGEN, createdPackung.record_id) }
    : undefined;

  // Pack createdPackung into a list for the DosierungDialog
  const packungenForDialog: Packungen[] = createdPackung
    ? [createdPackung, ...packungen.filter(p => p.record_id !== createdPackung.record_id)]
    : packungen;

  return (
    <IntentWizardShell
      title="Neue Packung einlegen"
      subtitle="Lege Schritt für Schritt eine neue Medikamenten-Packung an."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Medikament auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Medikament auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle das Medikament aus, für das du eine neue Packung anlegen möchtest.
            </p>
          </div>

          <EntitySelectStep
            items={medikamente.map(m => ({
              id: m.record_id,
              title: m.fields.name ?? '(Kein Name)',
              subtitle: [m.fields.wirkstoff, m.fields.hersteller].filter(Boolean).join(' | '),
              icon: <IconPill size={18} className="text-primary" stroke={1.5} />,
            }))}
            onSelect={id => {
              handleSelectMedikament(id);
            }}
            searchPlaceholder="Medikament suchen..."
            emptyIcon={<IconPill size={32} stroke={1.5} />}
            emptyText="Keine Medikamente gefunden. Erstelle zuerst ein Medikament."
            createLabel="Neues Medikament anlegen"
            onCreateNew={() => setMedDialogOpen(true)}
            createDialog={
              <MedikamenteDialog
                open={medDialogOpen}
                onClose={() => setMedDialogOpen(false)}
                onSubmit={handleMedikamentCreated}
              />
            }
          />

          {selectedMedikament && (
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <IconCheck size={18} className="text-primary" stroke={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedMedikament.fields.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[selectedMedikament.fields.wirkstoff, selectedMedikament.fields.hersteller].filter(Boolean).join(' | ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              disabled={!selectedMedikament}
              onClick={() => setCurrentStep(2)}
              className="gap-2"
            >
              Weiter
              <IconChevronRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Packung anlegen */}
      {currentStep === 2 && selectedMedikament && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Packung anlegen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lege eine neue Packung für{' '}
              <span className="font-medium text-foreground">{selectedMedikament.fields.name}</span> an.
            </p>
          </div>

          {/* Context: selected Medikament */}
          <div className="rounded-xl border bg-muted/40 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPill size={16} className="text-primary" stroke={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Ausgewähltes Medikament</p>
              <p className="text-sm font-medium truncate">{selectedMedikament.fields.name}</p>
            </div>
          </div>

          {!createdPackung ? (
            <div className="flex flex-col items-center gap-4 py-8 rounded-xl border border-dashed bg-muted/20">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconPackage size={24} className="text-primary" stroke={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Noch keine Packung angelegt</p>
                <p className="text-xs text-muted-foreground mt-1">Klicke auf "Packung erstellen", um fortzufahren.</p>
              </div>
              <Button onClick={() => setPackungDialogOpen(true)} className="gap-2">
                <IconPlus size={16} stroke={2} />
                Packung erstellen
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
                <IconCheck size={16} className="text-green-600" stroke={2} />
                <span className="text-sm font-medium text-green-700">Packung erfolgreich erstellt</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Medikament</p>
                  <p className="text-sm font-medium truncate">{selectedMedikament.fields.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Anbruch-Datum</p>
                  <p className="text-sm font-medium">{createdPackung.fields.anbruch_datum ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Anfangsmenge</p>
                  <p className="text-sm font-medium">
                    {createdPackung.fields.anfangsmenge != null
                      ? `${createdPackung.fields.anfangsmenge} ${selectedMedikament.fields.einheit?.label ?? ''}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <PackungenDialog
            open={packungDialogOpen}
            onClose={() => setPackungDialogOpen(false)}
            onSubmit={handlePackungCreated}
            defaultValues={packungDefaultValues}
            medikamenteList={medikamente}
          />

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            <Button
              disabled={!createdPackung}
              onClick={() => setCurrentStep(3)}
              className="gap-2"
            >
              Weiter
              <IconChevronRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Dosierungsänderung erfassen (optional) */}
      {currentStep === 3 && selectedMedikament && createdPackung && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Dosierungsänderung erfassen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Du kannst jetzt optional eine Dosierungsänderung für diese Packung eintragen.
            </p>
          </div>

          {/* Current dosage info */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Aktuelle Dosierung — {selectedMedikament.fields.name}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Morgens</p>
                <DosierungBadge label={selectedMedikament.fields.dosierung_morgens?.label} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Mittags</p>
                <DosierungBadge label={selectedMedikament.fields.dosierung_mittags?.label} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Abends</p>
                <DosierungBadge label={selectedMedikament.fields.dosierung_abends?.label} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Nacht</p>
                <DosierungBadge label={selectedMedikament.fields.dosierung_nacht?.label} />
              </div>
            </div>
          </div>

          {dosierungCreated ? (
            <div className="rounded-xl border bg-green-50 border-green-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <IconCheck size={18} className="text-green-600" stroke={2} />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Dosierungsänderung gespeichert</p>
                <p className="text-xs text-green-700 mt-0.5">Die Änderung wurde erfolgreich eingetragen.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 rounded-xl border border-dashed bg-muted/20">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconClipboardList size={22} className="text-primary" stroke={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Dosierungsänderung hinzufügen</p>
                <p className="text-xs text-muted-foreground mt-1">Optional — du kannst diesen Schritt auch überspringen.</p>
              </div>
              <Button onClick={() => setDosierungDialogOpen(true)} variant="outline" className="gap-2">
                <IconPlus size={16} stroke={2} />
                Dosierungsänderung hinzufügen
              </Button>
            </div>
          )}

          <DosierungDialog
            open={dosierungDialogOpen}
            onClose={() => setDosierungDialogOpen(false)}
            onSubmit={handleDosierungCreated as any}
            defaultValues={dosierungDefaultValues as any}
            packungenList={packungenForDialog}
          />

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <div className="flex items-center gap-2">
              {!dosierungCreated && (
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setCurrentStep(4)}
                >
                  Überspringen
                </Button>
              )}
              <Button onClick={() => setCurrentStep(4)} className="gap-2">
                Weiter
                <IconChevronRight size={16} stroke={2} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Zusammenfassung */}
      {currentStep === 4 && selectedMedikament && createdPackung && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Zusammenfassung</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Alles erledigt! Hier ist eine Übersicht über die neu angelegte Packung.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {/* Medikament */}
            <div className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconPill size={18} className="text-primary" stroke={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Medikament</p>
                <p className="text-sm font-semibold truncate">{selectedMedikament.fields.name}</p>
                {selectedMedikament.fields.wirkstoff && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Wirkstoff: {selectedMedikament.fields.wirkstoff}
                  </p>
                )}
                {selectedMedikament.fields.hersteller && (
                  <p className="text-xs text-muted-foreground truncate">
                    Hersteller: {selectedMedikament.fields.hersteller}
                  </p>
                )}
              </div>
            </div>

            {/* Packung */}
            <div className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconPackage size={18} className="text-primary" stroke={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Packung</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Anbruch-Datum</p>
                    <p className="text-sm font-medium">{createdPackung.fields.anbruch_datum ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Anfangsmenge</p>
                    <p className="text-sm font-medium">
                      {createdPackung.fields.anfangsmenge != null
                        ? `${createdPackung.fields.anfangsmenge} ${selectedMedikament.fields.einheit?.label ?? ''}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dosierungsänderung */}
            <div className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconClipboardList size={18} className="text-primary" stroke={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Dosierungsänderung</p>
                {dosierungCreated ? (
                  <div className="flex items-center gap-2">
                    <IconCheck size={14} className="text-green-600 shrink-0" stroke={2} />
                    <p className="text-sm font-medium text-green-700">Dosierungsänderung eingetragen</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Dosierungsänderung</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(3)}>
              Zurück
            </Button>
            <a href="#/packungen">
              <Button className="gap-2">
                <IconCheck size={16} stroke={2} />
                Fertig
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
