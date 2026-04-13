import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Medikamente, Dosierung, Packungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { DosierungDialog } from '@/components/dialogs/DosierungDialog';
import { Button } from '@/components/ui/button';
import { IconPill, IconAdjustments, IconCircleCheck, IconChevronRight, IconClock, IconCalendar, IconNotes } from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Medikament' },
  { label: 'Packung' },
  { label: 'Dosierung' },
  { label: 'Zusammenfassung' },
];

function DosierungBadge({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 border min-w-0 flex-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-bold text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

export default function DosierungAnpassenPage() {
  const [searchParams] = useSearchParams();
  const initialStep = Math.max(1, Math.min(4, parseInt(searchParams.get('step') ?? '1', 10) || 1));

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedMedikament, setSelectedMedikament] = useState<Medikamente | null>(null);
  const [selectedPackung, setSelectedPackung] = useState<Packungen | null>(null);
  const [createdDosierung, setCreatedDosierung] = useState<Dosierung | null>(null);
  const [dosierungCreated, setDosierungCreated] = useState(false);

  const [medikamenteDialogOpen, setMedikamenteDialogOpen] = useState(false);
  const [packungenDialogOpen, setPackungenDialogOpen] = useState(false);
  const [dosierungDialogOpen, setDosierungDialogOpen] = useState(false);

  const { medikamente, packungen, dosierung, loading, error, fetchAll } = useDashboardData();

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setSelectedMedikament(null);
    setSelectedPackung(null);
    setCreatedDosierung(null);
    setDosierungCreated(false);
  }, []);

  const filteredPackungen: Packungen[] = packungen.filter(p =>
    selectedMedikament
      ? extractRecordId(p.fields.medikament) === selectedMedikament.record_id
      : false
  );

  const filteredDosierung: Dosierung[] = dosierung.filter(d =>
    selectedPackung
      ? extractRecordId(d.fields.packung_ref) === selectedPackung.record_id
      : false
  );

  const selectedPackungList: Packungen[] = selectedPackung ? [selectedPackung] : [];

  return (
    <IntentWizardShell
      title="Dosierung anpassen"
      subtitle="Passe die Dosierung eines aktiven Medikaments in wenigen Schritten an."
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
            <h2 className="text-lg font-semibold mb-1">Welches Medikament möchtest du anpassen?</h2>
            <p className="text-sm text-muted-foreground">Wähle das Medikament aus, für das du eine neue Dosierung eintragen möchtest.</p>
          </div>
          <EntitySelectStep
            items={medikamente.map(m => ({
              id: m.record_id,
              title: m.fields.name ?? '(Kein Name)',
              subtitle: [m.fields.wirkstoff, m.fields.hersteller ? 'Hersteller: ' + m.fields.hersteller : null]
                .filter(Boolean).join(' | '),
              icon: <IconPill size={18} className="text-primary" stroke={1.5} />,
              stats: [
                { label: 'Mo', value: m.fields.dosierung_morgens?.label ?? '—' },
                { label: 'Mi', value: m.fields.dosierung_mittags?.label ?? '—' },
                { label: 'Ab', value: m.fields.dosierung_abends?.label ?? '—' },
                { label: 'Na', value: m.fields.dosierung_nacht?.label ?? '—' },
              ],
            }))}
            onSelect={(id) => {
              const found = medikamente.find(m => m.record_id === id) ?? null;
              setSelectedMedikament(found);
            }}
            searchPlaceholder="Medikament suchen..."
            emptyText="Keine Medikamente gefunden."
            emptyIcon={<IconPill size={32} stroke={1.5} />}
            createLabel="Neues Medikament anlegen"
            onCreateNew={() => setMedikamenteDialogOpen(true)}
            createDialog={
              <MedikamenteDialog
                open={medikamenteDialogOpen}
                onClose={() => setMedikamenteDialogOpen(false)}
                onSubmit={async (fields) => {
                  const response = await LivingAppsService.createMedikamenteEntry(fields);
                  await fetchAll();
                  const entries = Object.entries(response as Record<string, unknown>);
                  if (entries.length > 0) {
                    const [newId] = entries[0];
                    const newMed = medikamente.find(m => m.record_id === newId);
                    if (newMed) setSelectedMedikament(newMed);
                  }
                }}
              />
            }
          />
          {selectedMedikament && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => setCurrentStep(2)} className="gap-2">
                Weiter
                <IconChevronRight size={16} stroke={2} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Packung auswählen */}
      {currentStep === 2 && selectedMedikament && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Welche Packung soll angepasst werden?</h2>
            <p className="text-sm text-muted-foreground">
              Packungen für <span className="font-medium text-foreground">{selectedMedikament.fields.name}</span>
            </p>
          </div>
          <EntitySelectStep
            items={filteredPackungen.map(p => ({
              id: p.record_id,
              title: 'Packung vom ' + (p.fields.anbruch_datum ?? '(kein Datum)'),
              subtitle: 'Anfangsmenge: ' + (p.fields.anfangsmenge != null ? String(p.fields.anfangsmenge) : '—'),
              icon: <IconAdjustments size={18} className="text-primary" stroke={1.5} />,
            }))}
            onSelect={(id) => {
              const found = packungen.find(p => p.record_id === id) ?? null;
              setSelectedPackung(found);
            }}
            searchPlaceholder="Packung suchen..."
            emptyText="Keine Packungen für dieses Medikament gefunden."
            emptyIcon={<IconAdjustments size={32} stroke={1.5} />}
            createLabel="Neue Packung anlegen"
            onCreateNew={() => setPackungenDialogOpen(true)}
            createDialog={
              <PackungenDialog
                open={packungenDialogOpen}
                onClose={() => setPackungenDialogOpen(false)}
                medikamenteList={medikamente}
                defaultValues={{
                  medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id),
                }}
                onSubmit={async (fields) => {
                  const response = await LivingAppsService.createPackungenEntry(fields);
                  await fetchAll();
                  const entries = Object.entries(response as Record<string, unknown>);
                  if (entries.length > 0) {
                    const [newId] = entries[0];
                    const newPack = packungen.find(p => p.record_id === newId);
                    if (newPack) setSelectedPackung(newPack);
                  }
                }}
              />
            }
          />
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            {selectedPackung && (
              <Button onClick={() => setCurrentStep(3)} className="gap-2">
                Weiter
                <IconChevronRight size={16} stroke={2} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Aktuelle Dosierung & Änderung */}
      {currentStep === 3 && selectedMedikament && selectedPackung && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Aktuelle Dosierung & Änderung</h2>
            <p className="text-sm text-muted-foreground">
              Aktuelle Dosierung von <span className="font-medium text-foreground">{selectedMedikament.fields.name}</span> und bestehende Änderungen für diese Packung.
            </p>
          </div>

          {/* Current dosage from Medikament */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-sm font-semibold">Aktuelle Dosierung (Stammdaten)</p>
            </div>
            <div className="p-4">
              <div className="flex gap-2 flex-wrap">
                <DosierungBadge label="Morgens" value={selectedMedikament.fields.dosierung_morgens?.label} />
                <DosierungBadge label="Mittags" value={selectedMedikament.fields.dosierung_mittags?.label} />
                <DosierungBadge label="Abends" value={selectedMedikament.fields.dosierung_abends?.label} />
                <DosierungBadge label="Nacht" value={selectedMedikament.fields.dosierung_nacht?.label} />
              </div>
            </div>
          </div>

          {/* Dosierung history for this Packung */}
          {filteredDosierung.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-sm font-semibold">Bisherige Dosierungsänderungen für diese Packung</p>
              </div>
              <div className="divide-y">
                {filteredDosierung.map(d => (
                  <div key={d.record_id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <IconCalendar size={14} className="text-muted-foreground shrink-0" stroke={1.5} />
                      <span className="text-sm font-medium">
                        Gültig ab: {d.fields.gueltig_ab ?? '—'}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <DosierungBadge label="Mo" value={d.fields.dosierung_morgens_aenderung?.label} />
                      <DosierungBadge label="Mi" value={d.fields.dosierung_mittags_aenderung?.label} />
                      <DosierungBadge label="Ab" value={d.fields.dosierung_abends_aenderung?.label} />
                      <DosierungBadge label="Na" value={d.fields.dosierung_nacht_aenderung?.label} />
                    </div>
                    {d.fields.bemerkungen_aenderung && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                        <IconNotes size={12} className="shrink-0 mt-0.5" stroke={1.5} />
                        {d.fields.bemerkungen_aenderung}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New dosage change */}
          {!dosierungCreated ? (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconAdjustments size={20} className="text-primary" stroke={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold">Neue Dosierungsänderung eintragen</p>
                <p className="text-xs text-muted-foreground mt-0.5">Trage die neuen Dosierwerte und das Gültigkeitsdatum ein.</p>
              </div>
              <Button onClick={() => setDosierungDialogOpen(true)} className="gap-2">
                <IconAdjustments size={16} stroke={1.5} />
                Dosierungsänderung eintragen
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-green-500/40 bg-green-50/60 dark:bg-green-950/20 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <IconCircleCheck size={20} className="text-green-600 dark:text-green-400" stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Dosierungsänderung gespeichert</p>
                {createdDosierung?.fields.gueltig_ab && (
                  <p className="text-xs text-muted-foreground truncate">Gültig ab: {createdDosierung.fields.gueltig_ab}</p>
                )}
              </div>
            </div>
          )}

          <DosierungDialog
            open={dosierungDialogOpen}
            onClose={() => setDosierungDialogOpen(false)}
            packungenList={selectedPackungList}
            defaultValues={{
              packung_ref: createRecordUrl(APP_IDS.PACKUNGEN, selectedPackung.record_id),
            }}
            onSubmit={async (fields) => {
              const response = await LivingAppsService.createDosierungEntry(fields);
              await fetchAll();
              const entries = Object.entries(response as Record<string, unknown>);
              let newDos: Dosierung | null = null;
              if (entries.length > 0) {
                const [newId] = entries[0];
                newDos = dosierung.find(d => d.record_id === newId) ?? null;
              }
              if (!newDos) {
                // fallback: reconstruct from fields
                newDos = {
                  record_id: '',
                  createdat: new Date().toISOString(),
                  updatedat: null,
                  fields: fields as Dosierung['fields'],
                };
              }
              setCreatedDosierung(newDos);
              setDosierungCreated(true);
            }}
          />

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!dosierungCreated}
              className="gap-2"
            >
              Weiter
              <IconChevronRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Zusammenfassung */}
      {currentStep === 4 && selectedMedikament && selectedPackung && (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <IconCircleCheck size={32} className="text-green-600 dark:text-green-400" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Dosierung erfolgreich angepasst</h2>
              <p className="text-sm text-muted-foreground mt-1">Die Dosierungsänderung wurde gespeichert.</p>
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-sm font-semibold">Zusammenfassung</p>
            </div>
            <div className="px-4 divide-y">
              <InfoRow
                icon={<IconPill size={16} className="text-primary" stroke={1.5} />}
                label="Medikament"
                value={selectedMedikament.fields.name ?? '—'}
              />
              {selectedMedikament.fields.wirkstoff && (
                <InfoRow
                  icon={<IconNotes size={16} className="text-primary" stroke={1.5} />}
                  label="Wirkstoff"
                  value={selectedMedikament.fields.wirkstoff}
                />
              )}
              <InfoRow
                icon={<IconCalendar size={16} className="text-primary" stroke={1.5} />}
                label="Packung: Anbruch-Datum"
                value={selectedPackung.fields.anbruch_datum ?? '—'}
              />
              {selectedPackung.fields.anfangsmenge != null && (
                <InfoRow
                  icon={<IconAdjustments size={16} className="text-primary" stroke={1.5} />}
                  label="Packung: Anfangsmenge"
                  value={String(selectedPackung.fields.anfangsmenge)}
                />
              )}
              {createdDosierung?.fields.gueltig_ab && (
                <InfoRow
                  icon={<IconClock size={16} className="text-primary" stroke={1.5} />}
                  label="Neue Dosierung: Gültig ab"
                  value={createdDosierung.fields.gueltig_ab}
                />
              )}
            </div>
          </div>

          {/* New dosage values */}
          {createdDosierung && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-sm font-semibold">Neue Dosierwerte</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <DosierungBadge
                    label="Morgens"
                    value={createdDosierung.fields.dosierung_morgens_aenderung?.label}
                  />
                  <DosierungBadge
                    label="Mittags"
                    value={createdDosierung.fields.dosierung_mittags_aenderung?.label}
                  />
                  <DosierungBadge
                    label="Abends"
                    value={createdDosierung.fields.dosierung_abends_aenderung?.label}
                  />
                  <DosierungBadge
                    label="Nacht"
                    value={createdDosierung.fields.dosierung_nacht_aenderung?.label}
                  />
                </div>
                {createdDosierung.fields.bemerkungen_aenderung && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground flex items-start gap-2">
                    <IconNotes size={14} className="shrink-0 mt-0.5" stroke={1.5} />
                    <span>{createdDosierung.fields.bemerkungen_aenderung}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild className="flex-1">
              <a href="#/dosierung">
                Fertig
              </a>
            </Button>
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Weitere Anpassung
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
