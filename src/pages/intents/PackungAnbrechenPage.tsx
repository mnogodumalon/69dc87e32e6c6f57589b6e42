import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Medikamente, Packungen, Dosierung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { DosierungDialog } from '@/components/dialogs/DosierungDialog';
import { Button } from '@/components/ui/button';
import {
  IconPill,
  IconPackage,
  IconClipboardList,
  IconCircleCheck,
  IconPlus,
  IconArrowRight,
  IconRefresh,
  IconCalendar,
  IconMoon,
  IconSun,
  IconSunrise,
  IconSunset,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Medikament' },
  { label: 'Packung' },
  { label: 'Dosierung' },
  { label: 'Zusammenfassung' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDosierLabel(val?: { key: string; label: string } | string): string {
  if (!val) return '—';
  if (typeof val === 'object' && 'label' in val) return val.label;
  return String(val);
}

export default function PackungAnbrechenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Data state
  const [medikamente, setMedikamente] = useState<Medikamente[]>([]);
  const [packungen, setPackungen] = useState<Packungen[]>([]);
  const [dosierungen, setDosierungen] = useState<Dosierung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Selections
  const [selectedMedikament, setSelectedMedikament] = useState<Medikamente | null>(null);
  const [selectedPackung, setSelectedPackung] = useState<Packungen | null>(null);
  const [selectedDosierung, setSelectedDosierung] = useState<Dosierung | null>(null);

  // Dialog open state
  const [medikamentDialogOpen, setMedikamentDialogOpen] = useState(false);
  const [packungDialogOpen, setPackungDialogOpen] = useState(false);
  const [dosierungDialogOpen, setDosierungDialogOpen] = useState(false);

  const fetchAll = async () => {
    setError(null);
    try {
      const [med, pack, dos] = await Promise.all([
        LivingAppsService.getMedikamente(),
        LivingAppsService.getPackungen(),
        LivingAppsService.getDosierung(),
      ]);
      setMedikamente(med);
      setPackungen(pack);
      setDosierungen(dos);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  // Deep-link handling: auto-select from URL params after data loads
  useEffect(() => {
    if (loading) return;

    const medikamentId = searchParams.get('medikamentId');
    const packungId = searchParams.get('packungId');

    if (packungId && !selectedPackung) {
      const pack = packungen.find(p => p.record_id === packungId);
      if (pack) {
        setSelectedPackung(pack);
        // Also try to find matching medikament
        const medId = extractRecordId(pack.fields.medikament);
        if (medId && !selectedMedikament) {
          const med = medikamente.find(m => m.record_id === medId);
          if (med) setSelectedMedikament(med);
        }
        setStep(3);
        return;
      }
    }

    if (medikamentId && !selectedMedikament) {
      const med = medikamente.find(m => m.record_id === medikamentId);
      if (med) {
        setSelectedMedikament(med);
        setStep(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Packungen gefiltert nach ausgewähltem Medikament
  const filteredPackungen = useMemo(() => {
    if (!selectedMedikament) return [];
    return packungen.filter(p => {
      const medId = extractRecordId(p.fields.medikament);
      return medId === selectedMedikament.record_id;
    });
  }, [packungen, selectedMedikament]);

  // Dosierungen gefiltert nach ausgewählter Packung
  const filteredDosierungen = useMemo(() => {
    if (!selectedPackung) return [];
    return dosierungen.filter(d => {
      const packId = extractRecordId(d.fields.packung_ref);
      return packId === selectedPackung.record_id;
    });
  }, [dosierungen, selectedPackung]);

  function handleMedikamentSelect(id: string) {
    const med = medikamente.find(m => m.record_id === id);
    if (med) {
      setSelectedMedikament(med);
      setSelectedPackung(null);
      setSelectedDosierung(null);
      setStep(2);
    }
  }

  function handlePackungSelect(id: string) {
    const pack = packungen.find(p => p.record_id === id);
    if (pack) {
      setSelectedPackung(pack);
      setSelectedDosierung(null);
      setStep(3);
    }
  }

  function handleDosierungSelect(id: string) {
    const dos = dosierungen.find(d => d.record_id === id);
    if (dos) {
      setSelectedDosierung(dos);
    }
  }

  function handleReset() {
    setSelectedMedikament(null);
    setSelectedPackung(null);
    setSelectedDosierung(null);
    setStep(1);
  }

  const einheitLabel = selectedMedikament?.fields.einheit
    ? (typeof selectedMedikament.fields.einheit === 'object'
        ? selectedMedikament.fields.einheit.label
        : String(selectedMedikament.fields.einheit))
    : '';

  return (
    <IntentWizardShell
      title="Packung anbrechen & Dosierung festlegen"
      subtitle="Öffne eine neue Packung und lege den Dosierungsplan fest"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Medikament auswählen ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPill size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Medikament auswählen</h2>
              <p className="text-xs text-muted-foreground">Welches Medikament möchtest du anbrechen?</p>
            </div>
          </div>

          <EntitySelectStep
            items={medikamente.map(m => ({
              id: m.record_id,
              title: m.fields.name ?? '(Kein Name)',
              subtitle: m.fields.wirkstoff ?? undefined,
              stats: [
                ...(m.fields.hersteller ? [{ label: 'Hersteller', value: m.fields.hersteller }] : []),
                ...(m.fields.packungsgroesse != null
                  ? [{
                      label: 'Packungsgröße',
                      value: `${m.fields.packungsgroesse}${einheitLabel ? ' ' + (typeof m.fields.einheit === 'object' ? m.fields.einheit.label : '') : ''}`,
                    }]
                  : []),
              ],
            }))}
            onSelect={handleMedikamentSelect}
            searchPlaceholder="Medikament suchen..."
            emptyIcon={<IconPill size={32} />}
            emptyText="Noch kein Medikament vorhanden. Lege jetzt eines an."
            createLabel="Neues Medikament anlegen"
            onCreateNew={() => setMedikamentDialogOpen(true)}
            createDialog={
              <MedikamenteDialog
                open={medikamentDialogOpen}
                onClose={() => setMedikamentDialogOpen(false)}
                onSubmit={async (fields) => {
                  const res = await LivingAppsService.createMedikamenteEntry(fields);
                  await fetchAll();
                  // Auto-select newly created medikament
                  if (res && typeof res === 'object') {
                    const entries = Object.entries(res as Record<string, unknown>);
                    const newId = entries.length > 0 ? entries[0][0] : null;
                    if (newId) {
                      const newMed = medikamente.find(m => m.record_id === newId);
                      if (newMed) {
                        setSelectedMedikament(newMed);
                        setStep(2);
                      }
                    }
                  }
                }}
              />
            }
          />
        </div>
      )}

      {/* ── Step 2: Packung anlegen ── */}
      {step === 2 && selectedMedikament && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="rounded-xl border bg-muted/40 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPill size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Medikament</p>
              <p className="font-semibold text-sm truncate">{selectedMedikament.fields.name ?? '—'}</p>
              {selectedMedikament.fields.wirkstoff && (
                <p className="text-xs text-muted-foreground truncate">{selectedMedikament.fields.wirkstoff}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="ml-auto shrink-0 text-xs" onClick={() => setStep(1)}>
              Ändern
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPackage size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Packung auswählen oder anlegen</h2>
              <p className="text-xs text-muted-foreground">Wähle eine vorhandene Packung oder breche eine neue an</p>
            </div>
          </div>

          {/* Existing packungen for this medikament */}
          {filteredPackungen.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vorhandene Packungen</p>
              {filteredPackungen.map(pack => (
                <button
                  key={pack.record_id}
                  onClick={() => handlePackungSelect(pack.record_id)}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-colors overflow-hidden group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconPackage size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {pack.fields.anbruch_datum ? `Angebrochen am ${formatDate(pack.fields.anbruch_datum)}` : 'Packung'}
                    </p>
                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {pack.fields.anfangsmenge != null && (
                        <span>
                          Menge: <span className="font-medium text-foreground">
                            {pack.fields.anfangsmenge}{einheitLabel ? ` ${einheitLabel}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <IconArrowRight size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setPackungDialogOpen(true)}
          >
            <IconPlus size={16} />
            Neue Packung anlegen
          </Button>

          <PackungenDialog
            open={packungDialogOpen}
            onClose={() => setPackungDialogOpen(false)}
            medikamenteList={medikamente}
            defaultValues={{
              medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, selectedMedikament.record_id),
              anbruch_datum: new Date().toISOString().slice(0, 10),
            }}
            onSubmit={async (fields) => {
              const res = await LivingAppsService.createPackungenEntry(fields);
              await fetchAll();
              // Auto-select newly created packung
              if (res && typeof res === 'object') {
                const entries = Object.entries(res as Record<string, unknown>);
                const newId = entries.length > 0 ? entries[0][0] : null;
                if (newId) {
                  // After fetchAll, find newly created packung
                  const refreshed = await LivingAppsService.getPackungen();
                  setPackungen(refreshed);
                  const newPack = refreshed.find(p => p.record_id === newId);
                  if (newPack) {
                    setSelectedPackung(newPack);
                    setStep(3);
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* ── Step 3: Dosierung festlegen ── */}
      {step === 3 && selectedMedikament && selectedPackung && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconPill size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Medikament</p>
                <p className="font-semibold text-sm truncate">{selectedMedikament.fields.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <IconPackage size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Packung</p>
                <p className="text-sm font-medium truncate">
                  {selectedPackung.fields.anbruch_datum
                    ? `Angebrochen am ${formatDate(selectedPackung.fields.anbruch_datum)}`
                    : 'Packung'}
                  {selectedPackung.fields.anfangsmenge != null
                    ? ` · ${selectedPackung.fields.anfangsmenge}${einheitLabel ? ' ' + einheitLabel : ''}`
                    : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto shrink-0 text-xs" onClick={() => setStep(2)}>
                Ändern
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardList size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Dosierung festlegen</h2>
              <p className="text-xs text-muted-foreground">Lege den Einnahmeplan für diese Packung fest</p>
            </div>
          </div>

          {/* Existing dosierungen for this packung */}
          {filteredDosierungen.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vorhandene Dosierungen</p>
              {filteredDosierungen.map(dos => (
                <button
                  key={dos.record_id}
                  onClick={() => handleDosierungSelect(dos.record_id)}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors overflow-hidden group ${
                    selectedDosierung?.record_id === dos.record_id
                      ? 'border-primary bg-primary/5'
                      : 'bg-card hover:bg-accent hover:border-primary/30'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <IconClipboardList size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {dos.fields.gueltig_ab ? `Gültig ab ${formatDate(dos.fields.gueltig_ab)}` : 'Dosierung'}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <IconSunrise size={11} />
                        Morgens: <span className="font-medium text-foreground ml-1">{getDosierLabel(dos.fields.dosierung_morgens_aenderung)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconSun size={11} />
                        Mittags: <span className="font-medium text-foreground ml-1">{getDosierLabel(dos.fields.dosierung_mittags_aenderung)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconSunset size={11} />
                        Abends: <span className="font-medium text-foreground ml-1">{getDosierLabel(dos.fields.dosierung_abends_aenderung)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconMoon size={11} />
                        Nacht: <span className="font-medium text-foreground ml-1">{getDosierLabel(dos.fields.dosierung_nacht_aenderung)}</span>
                      </span>
                    </div>
                  </div>
                  {selectedDosierung?.record_id === dos.record_id && (
                    <IconCircleCheck size={18} className="text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setDosierungDialogOpen(true)}
          >
            <IconPlus size={16} />
            Dosierung anlegen
          </Button>

          <DosierungDialog
            open={dosierungDialogOpen}
            onClose={() => setDosierungDialogOpen(false)}
            packungenList={packungen}
            defaultValues={{
              packung_ref: createRecordUrl(APP_IDS.PACKUNGEN, selectedPackung.record_id),
              gueltig_ab: new Date().toISOString().slice(0, 10),
            }}
            onSubmit={async (fields) => {
              const res = await LivingAppsService.createDosierungEntry(fields);
              await fetchAll();
              // Auto-select newly created dosierung
              if (res && typeof res === 'object') {
                const entries = Object.entries(res as Record<string, unknown>);
                const newId = entries.length > 0 ? entries[0][0] : null;
                if (newId) {
                  const refreshed = await LivingAppsService.getDosierung();
                  setDosierungen(refreshed);
                  const newDos = refreshed.find(d => d.record_id === newId);
                  if (newDos) {
                    setSelectedDosierung(newDos);
                  }
                }
              }
            }}
          />

          {/* Live summary card when dosierung selected */}
          {selectedDosierung && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Aktueller Einnahmeplan</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <IconSunrise size={14} />, label: 'Morgens', val: getDosierLabel(selectedDosierung.fields.dosierung_morgens_aenderung) },
                  { icon: <IconSun size={14} />, label: 'Mittags', val: getDosierLabel(selectedDosierung.fields.dosierung_mittags_aenderung) },
                  { icon: <IconSunset size={14} />, label: 'Abends', val: getDosierLabel(selectedDosierung.fields.dosierung_abends_aenderung) },
                  { icon: <IconMoon size={14} />, label: 'Nacht', val: getDosierLabel(selectedDosierung.fields.dosierung_nacht_aenderung) },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg bg-background border p-2.5">
                    <span className="text-muted-foreground">{icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedDosierung.fields.gueltig_ab && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconCalendar size={13} />
                  <span>Gültig ab {formatDate(selectedDosierung.fields.gueltig_ab)}</span>
                </div>
              )}
              {selectedDosierung.fields.bemerkungen_aenderung && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  {selectedDosierung.fields.bemerkungen_aenderung}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
              Zurück
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!selectedDosierung}
              onClick={() => setStep(4)}
            >
              Weiter
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Zusammenfassung ── */}
      {step === 4 && selectedMedikament && selectedPackung && selectedDosierung && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <IconCircleCheck size={22} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Alles festgelegt!</h2>
              <p className="text-xs text-muted-foreground">Die Packung wurde angebrochen und der Dosierungsplan ist hinterlegt</p>
            </div>
          </div>

          {/* Medikament summary */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b">
              <IconPill size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medikament</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs text-muted-foreground">Name</span>
                <span className="text-sm font-semibold text-right">{selectedMedikament.fields.name ?? '—'}</span>
              </div>
              {selectedMedikament.fields.wirkstoff && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground">Wirkstoff</span>
                  <span className="text-sm text-right">{selectedMedikament.fields.wirkstoff}</span>
                </div>
              )}
              {selectedMedikament.fields.hersteller && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground">Hersteller</span>
                  <span className="text-sm text-right">{selectedMedikament.fields.hersteller}</span>
                </div>
              )}
            </div>
          </div>

          {/* Packung summary */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b">
              <IconPackage size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packung</span>
            </div>
            <div className="p-4 space-y-2">
              {selectedPackung.fields.anbruch_datum && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground">Anbruchdatum</span>
                  <span className="text-sm font-medium text-right">{formatDate(selectedPackung.fields.anbruch_datum)}</span>
                </div>
              )}
              {selectedPackung.fields.anfangsmenge != null && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground">Anfangsmenge</span>
                  <span className="text-sm font-medium text-right">
                    {selectedPackung.fields.anfangsmenge}
                    {einheitLabel ? ` ${einheitLabel}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dosierung summary */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b">
              <IconClipboardList size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dosierung</span>
            </div>
            <div className="p-4 space-y-3">
              {selectedDosierung.fields.gueltig_ab && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground">Gültig ab</span>
                  <span className="text-sm font-medium text-right">{formatDate(selectedDosierung.fields.gueltig_ab)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { icon: <IconSunrise size={13} />, label: 'Morgens', val: getDosierLabel(selectedDosierung.fields.dosierung_morgens_aenderung) },
                  { icon: <IconSun size={13} />, label: 'Mittags', val: getDosierLabel(selectedDosierung.fields.dosierung_mittags_aenderung) },
                  { icon: <IconSunset size={13} />, label: 'Abends', val: getDosierLabel(selectedDosierung.fields.dosierung_abends_aenderung) },
                  { icon: <IconMoon size={13} />, label: 'Nacht', val: getDosierLabel(selectedDosierung.fields.dosierung_nacht_aenderung) },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
                    <span className="text-muted-foreground">{icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedDosierung.fields.bemerkungen_aenderung && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Bemerkungen</p>
                  <p className="text-sm">{selectedDosierung.fields.bemerkungen_aenderung}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReset}
            >
              <IconRefresh size={16} />
              Weiteren Anbruch erfassen
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => navigate('/packungen')}
            >
              Zur Übersicht
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
