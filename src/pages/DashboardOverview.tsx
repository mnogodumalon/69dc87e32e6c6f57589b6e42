import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPackungen } from '@/lib/enrich';
import type { EnrichedPackungen } from '@/types/enriched';
import type { Medikamente } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPill, IconPackage, IconPlus, IconPencil, IconTrash,
  IconSun, IconCloud, IconMoon, IconZzz, IconAlertTriangle,
  IconCalendar, IconHistory, IconChevronRight, IconMedicineSyrup
} from '@tabler/icons-react';

const APPGROUP_ID = '69dc87e32e6c6f57589b6e42';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DosierungSlot = 'morgens' | 'mittags' | 'abends' | 'nacht';

const SLOT_CONFIG: { key: DosierungSlot; label: string; Icon: React.FC<{ size?: number; className?: string; stroke?: number }> }[] = [
  { key: 'morgens', label: 'Morgens', Icon: IconSun },
  { key: 'mittags', label: 'Mittags', Icon: IconCloud },
  { key: 'abends', label: 'Abends', Icon: IconMoon },
  { key: 'nacht', label: 'Nacht', Icon: IconZzz },
];

function getDosisLabel(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && 'key' in val) {
    const k = (val as { key: string; label: string }).key;
    if (k === 'd0') return null;
    return (val as { key: string; label: string }).label;
  }
  return null;
}

function DosierungBadges({ med }: { med: Medikamente }) {
  const slots = [
    { cfg: SLOT_CONFIG[0], val: med.fields.dosierung_morgens },
    { cfg: SLOT_CONFIG[1], val: med.fields.dosierung_mittags },
    { cfg: SLOT_CONFIG[2], val: med.fields.dosierung_abends },
    { cfg: SLOT_CONFIG[3], val: med.fields.dosierung_nacht },
  ];
  const active = slots.filter(s => getDosisLabel(s.val) !== null);
  if (active.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Keine Dosierung eingetragen</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(({ cfg, val }) => {
        const Icon = cfg.Icon;
        return (
          <span
            key={cfg.key}
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            <Icon size={11} stroke={2} />
            {cfg.label}: {getDosisLabel(val)}
          </span>
        );
      })}
    </div>
  );
}

interface MedikamentCardProps {
  med: Medikamente;
  packungen: EnrichedPackungen[];
  onEditMed: (med: Medikamente) => void;
  onDeleteMed: (med: Medikamente) => void;
  onAddPackung: (med: Medikamente) => void;
  onEditPackung: (p: EnrichedPackungen) => void;
  onDeletePackung: (p: EnrichedPackungen) => void;
}

function MedikamentCard({ med, packungen, onEditMed, onDeleteMed, onAddPackung, onEditPackung, onDeletePackung }: MedikamentCardProps) {
  const [showPackungen, setShowPackungen] = useState(false);

  const laufendePackungen = packungen.filter(p => {
    const medId = extractRecordId(p.fields.medikament);
    return medId === med.record_id;
  });

  const niedrigBestand = laufendePackungen.some(p => {
    const anfang = p.fields.anfangsmenge ?? 0;
    return anfang <= 10 && !p.fields.nachbestellt;
  });

  const einheit = med.fields.einheit?.label ?? '';
  const woechentlich = med.fields.woechentlich;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <IconPill size={18} className="text-primary" stroke={1.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground truncate">{med.fields.name ?? '–'}</h3>
              {niedrigBestand && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                  <IconAlertTriangle size={10} stroke={2} />
                  Bestand prüfen
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {med.fields.wirkstoff ?? ''}{med.fields.wirkstoff && med.fields.hersteller ? ' · ' : ''}{med.fields.hersteller ?? ''}
            </p>
            {einheit && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {med.fields.packungsgroesse ? `${med.fields.packungsgroesse} ${einheit}` : einheit}
                {woechentlich && <span className="ml-2 text-blue-600">wöchentlich</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEditMed(med)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={14} stroke={1.5} />
          </button>
          <button
            onClick={() => onDeleteMed(med)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Löschen"
          >
            <IconTrash size={14} stroke={1.5} />
          </button>
        </div>
      </div>

      {/* Dosierung */}
      <div className="px-4 pb-3">
        <DosierungBadges med={med} />
      </div>

      {/* Packungen Toggle */}
      <div className="border-t border-border/60 mt-auto">
        <button
          onClick={() => setShowPackungen(!showPackungen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <IconPackage size={13} stroke={1.5} />
            {laufendePackungen.length} Packung{laufendePackungen.length !== 1 ? 'en' : ''}
          </span>
          <span className="text-xs">{showPackungen ? '▲' : '▼'}</span>
        </button>

        {showPackungen && (
          <div className="px-3 pb-3 space-y-1.5">
            {laufendePackungen.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2 italic">Keine Packungen</p>
            ) : (
              laufendePackungen.map(p => (
                <div key={p.record_id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">
                        Anfang: {p.fields.anfangsmenge ?? '–'} {einheit}
                      </span>
                      {p.fields.nachbestellt && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5 text-green-600 border-green-300">
                          Nachbestellt
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {p.fields.anbruch_datum && (
                        <span className="flex items-center gap-1">
                          <IconCalendar size={10} stroke={1.5} />
                          Anbruch: {formatDate(p.fields.anbruch_datum)}
                        </span>
                      )}
                      {p.fields.nachbestelldatum && (
                        <span className="flex items-center gap-1">
                          <IconHistory size={10} stroke={1.5} />
                          Bestellt: {formatDate(p.fields.nachbestelldatum)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditPackung(p)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconPencil size={12} stroke={1.5} />
                    </button>
                    <button
                      onClick={() => onDeletePackung(p)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <IconTrash size={12} stroke={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => onAddPackung(med)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 py-1.5 rounded-lg hover:bg-primary/5 transition-colors border border-dashed border-primary/30"
            >
              <IconPlus size={12} stroke={2} />
              Packung hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const {
    packungen, medikamentenUebersicht, medikamente, dosierung,
    packungenMap, medikamenteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPackungen = enrichPackungen(packungen, { medikamenteMap });

  // All hooks before early returns
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medikamente | null>(null);
  const [deleteMed, setDeleteMed] = useState<Medikamente | null>(null);

  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editPackung, setEditPackung] = useState<EnrichedPackungen | null>(null);
  const [deletePackung, setDeletePackung] = useState<EnrichedPackungen | null>(null);
  const [newPackungForMed, setNewPackungForMed] = useState<string | null>(null); // medikament record_id

  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'alle' | 'taeglich' | 'woechentlich'>('alle');

  // Suppress unused variable warnings — enriched data used for type completeness
  void medikamentenUebersicht;
  void dosierung;
  void packungenMap;

  const filteredMedikamente = useMemo(() => {
    let result = medikamente;
    if (activeTab === 'taeglich') result = result.filter(m => !m.fields.woechentlich);
    if (activeTab === 'woechentlich') result = result.filter(m => m.fields.woechentlich);
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter(m =>
        (m.fields.name ?? '').toLowerCase().includes(q) ||
        (m.fields.wirkstoff ?? '').toLowerCase().includes(q) ||
        (m.fields.hersteller ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [medikamente, filterText, activeTab]);

  const stats = useMemo(() => {
    const total = medikamente.length;
    const woePerWoche = medikamente.filter(m => m.fields.woechentlich).length;
    const taeglich = total - woePerWoche;
    const niedrigBestand = enrichedPackungen.filter(p => {
      const anfang = p.fields.anfangsmenge ?? 0;
      return anfang <= 10 && !p.fields.nachbestellt;
    }).length;
    return { total, taeglich, woePerWoche, niedrigBestand };
  }, [medikamente, enrichedPackungen]);

  const handleOpenAddMed = () => {
    setEditMed(null);
    setMedDialogOpen(true);
  };

  const handleEditMed = (med: Medikamente) => {
    setEditMed(med);
    setMedDialogOpen(true);
  };

  const handleDeleteMed = (med: Medikamente) => setDeleteMed(med);

  const handleConfirmDeleteMed = async () => {
    if (!deleteMed) return;
    await LivingAppsService.deleteMedikamenteEntry(deleteMed.record_id);
    setDeleteMed(null);
    fetchAll();
  };

  const handleAddPackung = (med: Medikamente) => {
    setNewPackungForMed(med.record_id);
    setEditPackung(null);
    setPackDialogOpen(true);
  };

  const handleEditPackung = (p: EnrichedPackungen) => {
    setEditPackung(p);
    setNewPackungForMed(null);
    setPackDialogOpen(true);
  };

  const handleDeletePackung = (p: EnrichedPackungen) => setDeletePackung(p);

  const handleConfirmDeletePackung = async () => {
    if (!deletePackung) return;
    await LivingAppsService.deletePackungenEntry(deletePackung.record_id);
    setDeletePackung(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Intent Workflows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/packung-anbrechen"
          className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 min-w-0"
        >
          <IconMedicineSyrup size={22} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">Packung anbrechen</p>
            <p className="text-xs text-muted-foreground truncate">Medikament wählen, Packung öffnen & Dosierung festlegen</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" stroke={1.5} />
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Medikamente"
          value={String(stats.total)}
          description="Gesamt"
          icon={<IconPill size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Täglich"
          value={String(stats.taeglich)}
          description="Einnahmen"
          icon={<IconSun size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Wöchentlich"
          value={String(stats.woePerWoche)}
          description="Einnahmen"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestand prüfen"
          value={String(stats.niedrigBestand)}
          description="Packungen"
          icon={<IconAlertTriangle size={18} className={stats.niedrigBestand > 0 ? 'text-amber-500' : 'text-muted-foreground'} />}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Medikament suchen..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {(['alle', 'taeglich', 'woechentlich'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'alle' ? 'Alle' : tab === 'taeglich' ? 'Täglich' : 'Wöchentlich'}
            </button>
          ))}
        </div>
        <Button onClick={handleOpenAddMed} size="sm" className="shrink-0">
          <IconPlus size={14} className="mr-1.5" stroke={2} />
          <span className="hidden sm:inline">Medikament</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Dosierungsplan Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Medikamentenplan</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
            {SLOT_CONFIG.map(s => {
              const Icon = s.Icon;
              return (
                <span key={s.key} className="flex items-center gap-1">
                  <Icon size={12} stroke={1.5} />
                  {s.label}
                </span>
              );
            })}
          </div>
        </div>

        {filteredMedikamente.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-2xl bg-muted/20">
            <IconPill size={40} className="text-muted-foreground" stroke={1} />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Keine Medikamente gefunden</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filterText ? 'Suche anpassen oder' : 'Füge dein erstes'}{' '}
                <button onClick={handleOpenAddMed} className="text-primary hover:underline">
                  {filterText ? 'Medikament hinzufügen' : 'Medikament hinzufügen'}
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedikamente.map(med => (
              <MedikamentCard
                key={med.record_id}
                med={med}
                packungen={enrichedPackungen}
                onEditMed={handleEditMed}
                onDeleteMed={handleDeleteMed}
                onAddPackung={handleAddPackung}
                onEditPackung={handleEditPackung}
                onDeletePackung={handleDeletePackung}
              />
            ))}
          </div>
        )}
      </div>

      {/* Medikament Dialog */}
      <MedikamenteDialog
        open={medDialogOpen}
        onClose={() => { setMedDialogOpen(false); setEditMed(null); }}
        onSubmit={async (fields) => {
          if (editMed) {
            await LivingAppsService.updateMedikamenteEntry(editMed.record_id, fields);
          } else {
            await LivingAppsService.createMedikamenteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMed?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Medikamente']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Medikamente']}
      />

      {/* Packung Dialog */}
      <PackungenDialog
        open={packDialogOpen}
        onClose={() => { setPackDialogOpen(false); setEditPackung(null); setNewPackungForMed(null); }}
        onSubmit={async (fields) => {
          if (editPackung) {
            await LivingAppsService.updatePackungenEntry(editPackung.record_id, fields);
          } else {
            const finalFields = newPackungForMed
              ? { ...fields, medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, newPackungForMed) }
              : fields;
            await LivingAppsService.createPackungenEntry(finalFields);
          }
          fetchAll();
        }}
        defaultValues={
          editPackung
            ? editPackung.fields
            : newPackungForMed
            ? { medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, newPackungForMed) }
            : undefined
        }
        medikamenteList={medikamente}
        enablePhotoScan={AI_PHOTO_SCAN['Packungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Packungen']}
      />

      {/* Delete Medikament */}
      <ConfirmDialog
        open={!!deleteMed}
        title="Medikament löschen"
        description={`„${deleteMed?.fields.name ?? 'Medikament'}" wirklich löschen? Zugehörige Packungen bleiben erhalten.`}
        onConfirm={handleConfirmDeleteMed}
        onClose={() => setDeleteMed(null)}
      />

      {/* Delete Packung */}
      <ConfirmDialog
        open={!!deletePackung}
        title="Packung löschen"
        description="Diese Packung wirklich löschen?"
        onConfirm={handleConfirmDeletePackung}
        onClose={() => setDeletePackung(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
