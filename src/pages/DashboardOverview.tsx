import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPackungen } from '@/lib/enrich';
import type { EnrichedPackungen } from '@/types/enriched';
import type { Medikamente } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPill, IconPackage, IconPlus, IconPencil, IconTrash,
  IconClock, IconAlertTriangle, IconMoon, IconSun, IconSunrise,
  IconSunset, IconChevronDown, IconChevronUp
} from '@tabler/icons-react';
import { MedikamenteDialog } from '@/components/dialogs/MedikamenteDialog';
import { PackungenDialog } from '@/components/dialogs/PackungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';

const APPGROUP_ID = '69dc87e32e6c6f57589b6e42';
const REPAIR_ENDPOINT = '/claude/build/repair';

function daysUntilDepletion(packung: EnrichedPackungen): number | null {
  if (!packung.fields.voraussichtliches_aufbrauch_datum) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depletionDate = new Date(packung.fields.voraussichtliches_aufbrauch_datum);
  depletionDate.setHours(0, 0, 0, 0);
  return Math.round((depletionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStockStatus(days: number | null): 'ok' | 'warning' | 'critical' | 'unknown' {
  if (days === null) return 'unknown';
  if (days <= 7) return 'critical';
  if (days <= 14) return 'warning';
  return 'ok';
}

function DosageLabel({ label }: { label?: string }) {
  if (!label || label === '0') return null;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
      {label}
    </span>
  );
}

function DosageRow({ morgens, mittags, abends, nacht, woechentlich }: {
  morgens?: string; mittags?: string; abends?: string; nacht?: string; woechentlich?: boolean;
}) {
  const hasAnyDose = [morgens, mittags, abends, nacht].some(d => d && d !== '0');
  if (!hasAnyDose && !woechentlich) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {woechentlich && (
        <Badge variant="outline" className="text-xs text-muted-foreground">Wöchentlich</Badge>
      )}
      {!woechentlich && (
        <>
          <div className="flex items-center gap-1">
            <IconSunrise size={14} className="text-amber-500 shrink-0" />
            <DosageLabel label={morgens} />
            {(!morgens || morgens === '0') && <span className="text-xs text-muted-foreground">–</span>}
          </div>
          <div className="flex items-center gap-1">
            <IconSun size={14} className="text-orange-500 shrink-0" />
            <DosageLabel label={mittags} />
            {(!mittags || mittags === '0') && <span className="text-xs text-muted-foreground">–</span>}
          </div>
          <div className="flex items-center gap-1">
            <IconSunset size={14} className="text-rose-500 shrink-0" />
            <DosageLabel label={abends} />
            {(!abends || abends === '0') && <span className="text-xs text-muted-foreground">–</span>}
          </div>
          <div className="flex items-center gap-1">
            <IconMoon size={14} className="text-indigo-500 shrink-0" />
            <DosageLabel label={nacht} />
            {(!nacht || nacht === '0') && <span className="text-xs text-muted-foreground">–</span>}
          </div>
        </>
      )}
    </div>
  );
}

interface MedikamentCardProps {
  medikament: Medikamente;
  packungen: EnrichedPackungen[];
  onEditMedikament: (m: Medikamente) => void;
  onDeleteMedikament: (m: Medikamente) => void;
  onAddPackung: (medikamentId: string) => void;
  onEditPackung: (p: EnrichedPackungen) => void;
  onDeletePackung: (p: EnrichedPackungen) => void;
}

function MedikamentCard({
  medikament, packungen, onEditMedikament, onDeleteMedikament, onAddPackung, onEditPackung, onDeletePackung
}: MedikamentCardProps) {
  const [expanded, setExpanded] = useState(true);

  const aktivePackungen = packungen.filter(p => {
    const days = daysUntilDepletion(p);
    return days === null || days > 0;
  });

  const criticalPackung = aktivePackungen.find(p => getStockStatus(daysUntilDepletion(p)) === 'critical');
  const warningPackung = aktivePackungen.find(p => getStockStatus(daysUntilDepletion(p)) === 'warning');

  const overallStatus = criticalPackung ? 'critical' : warningPackung ? 'warning' : aktivePackungen.length === 0 ? 'unknown' : 'ok';

  const statusColors = {
    ok: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="p-4 flex items-start gap-3">
        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[overallStatus]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{medikament.fields.name ?? '–'}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {[medikament.fields.wirkstoff, medikament.fields.hersteller].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditMedikament(medikament)}>
                <IconPencil size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteMedikament(medikament)}>
                <IconTrash size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
                {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <DosageRow
              morgens={medikament.fields.dosierung_morgens?.label}
              mittags={medikament.fields.dosierung_mittags?.label}
              abends={medikament.fields.dosierung_abends?.label}
              nacht={medikament.fields.dosierung_nacht?.label}
              woechentlich={medikament.fields.woechentlich}
            />
          </div>
        </div>
      </div>

      {/* Packungen */}
      {expanded && (
        <div className="border-t border-border bg-muted/20">
          {aktivePackungen.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <IconPackage size={14} className="shrink-0" />
              Keine aktiven Packungen
            </div>
          ) : (
            <div className="divide-y divide-border">
              {aktivePackungen.map(p => {
                const days = daysUntilDepletion(p);
                const status = getStockStatus(days);
                return (
                  <div key={p.record_id} className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconPackage size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {p.fields.startdatum ? `Seit ${formatDate(p.fields.startdatum)}` : '–'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">
                          {p.fields.verbleibende_menge ?? p.fields.anfangsmenge ?? '?'} Einh. verbleibend
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {status === 'critical' && (
                          <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                            <IconAlertCircle size={11} className="mr-0.5 shrink-0" />
                            {days !== null && days >= 0 ? `Noch ${days} Tage` : 'Abgelaufen'}
                          </Badge>
                        )}
                        {status === 'warning' && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                            <IconAlertTriangle size={11} className="mr-0.5 shrink-0" />
                            {days !== null ? `Noch ${days} Tage` : '–'}
                          </Badge>
                        )}
                        {status === 'ok' && days !== null && (
                          <span className="text-xs text-muted-foreground">bis {formatDate(p.fields.voraussichtliches_aufbrauch_datum!)}</span>
                        )}
                        {p.fields.nachbestellt && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200 ml-1">Nachbestellt</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEditPackung(p)}>
                        <IconPencil size={12} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDeletePackung(p)}>
                        <IconTrash size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-primary hover:text-primary"
              onClick={() => onAddPackung(medikament.record_id)}
            >
              <IconPlus size={12} className="mr-1 shrink-0" />
              Packung hinzufügen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardOverview() {
  const {
    medikamente, packungen, medikamenteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPackungen = enrichPackungen(packungen, { medikamenteMap });

  // All hooks before early returns!
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medikamente | null>(null);
  const [deleteMed, setDeleteMed] = useState<Medikamente | null>(null);

  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editPack, setEditPack] = useState<EnrichedPackungen | null>(null);
  const [deletePack, setDeletePack] = useState<EnrichedPackungen | null>(null);
  const [newPackMedId, setNewPackMedId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const packungsMap = useMemo(() => {
    const map: Record<string, EnrichedPackungen[]> = {};
    for (const p of enrichedPackungen) {
      const packMedId = Array.from(medikamenteMap.keys()).find(
        id => p.fields.medikament?.includes(id)
      );
      if (packMedId) {
        if (!map[packMedId]) map[packMedId] = [];
        map[packMedId].push(p);
      }
    }
    return map;
  }, [enrichedPackungen, medikamenteMap]);

  const filteredMedikamente = useMemo(() => {
    if (!searchTerm.trim()) return medikamente;
    const lower = searchTerm.toLowerCase();
    return medikamente.filter(m =>
      m.fields.name?.toLowerCase().includes(lower) ||
      m.fields.wirkstoff?.toLowerCase().includes(lower) ||
      m.fields.hersteller?.toLowerCase().includes(lower)
    );
  }, [medikamente, searchTerm]);

  const stats = useMemo(() => {
    const total = medikamente.length;
    let critical = 0;
    let warning = 0;
    let nachbestellung = 0;

    for (const p of enrichedPackungen) {
      const days = daysUntilDepletion(p);
      const status = getStockStatus(days);
      if (status === 'critical') critical++;
      else if (status === 'warning') warning++;
      if (p.fields.nachbestellt) nachbestellung++;
    }

    return { total, critical, warning, nachbestellung };
  }, [medikamente, enrichedPackungen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleOpenEditMed = (m: Medikamente) => { setEditMed(m); setMedDialogOpen(true); };
  const handleOpenDeleteMed = (m: Medikamente) => setDeleteMed(m);
  const handleDeleteMed = async () => {
    if (!deleteMed) return;
    await LivingAppsService.deleteMedikamenteEntry(deleteMed.record_id);
    setDeleteMed(null);
    fetchAll();
  };

  const handleAddPackung = (medId: string) => {
    setNewPackMedId(medId);
    setEditPack(null);
    setPackDialogOpen(true);
  };
  const handleOpenEditPack = (p: EnrichedPackungen) => { setEditPack(p); setNewPackMedId(null); setPackDialogOpen(true); };
  const handleOpenDeletePack = (p: EnrichedPackungen) => setDeletePack(p);
  const handleDeletePack = async () => {
    if (!deletePack) return;
    await LivingAppsService.deletePackungenEntry(deletePack.record_id);
    setDeletePack(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Medikamentenplan</h1>
          <p className="text-sm text-muted-foreground">Deine aktuelle Medikation &amp; Packungsbestände</p>
        </div>
        <Button onClick={() => { setEditMed(null); setMedDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Medikament
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Medikamente"
          value={String(stats.total)}
          description="Gesamt aktiv"
          icon={<IconPill size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Packungen"
          value={String(enrichedPackungen.length)}
          description="Gesamt verwaltet"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kritisch"
          value={String(stats.critical)}
          description="< 7 Tage Vorrat"
          icon={<IconAlertCircle size={18} className={stats.critical > 0 ? 'text-red-500' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Achtung"
          value={String(stats.warning)}
          description="< 14 Tage Vorrat"
          icon={<IconAlertTriangle size={18} className={stats.warning > 0 ? 'text-amber-500' : 'text-muted-foreground'} />}
        />
      </div>

      {/* Tagesplan Legende */}
      <div className="flex items-center gap-4 flex-wrap bg-muted/30 rounded-xl px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dosierung:</span>
        <div className="flex items-center gap-1.5">
          <IconSunrise size={14} className="text-amber-500" />
          <span className="text-xs text-muted-foreground">Morgens</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconSun size={14} className="text-orange-500" />
          <span className="text-xs text-muted-foreground">Mittags</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconSunset size={14} className="text-rose-500" />
          <span className="text-xs text-muted-foreground">Abends</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconMoon size={14} className="text-indigo-500" />
          <span className="text-xs text-muted-foreground">Nacht</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Bald leer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Kritisch</span>
          </div>
        </div>
      </div>

      {/* Suche */}
      <div className="relative">
        <input
          type="text"
          placeholder="Medikament suchen..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-9 pl-4 pr-4 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Medikamentenliste */}
      {filteredMedikamente.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <IconPill size={48} stroke={1.5} className="text-muted-foreground" />
          <p className="font-medium text-foreground">
            {searchTerm ? 'Kein Medikament gefunden' : 'Noch keine Medikamente'}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchTerm
              ? 'Versuche einen anderen Suchbegriff.'
              : 'Klicke auf „Medikament", um dein erstes Medikament hinzuzufügen.'}
          </p>
          {!searchTerm && (
            <Button size="sm" onClick={() => { setEditMed(null); setMedDialogOpen(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              Medikament hinzufügen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMedikamente.map(m => (
            <MedikamentCard
              key={m.record_id}
              medikament={m}
              packungen={packungsMap[m.record_id] ?? []}
              onEditMedikament={handleOpenEditMed}
              onDeleteMedikament={handleOpenDeleteMed}
              onAddPackung={handleAddPackung}
              onEditPackung={handleOpenEditPack}
              onDeletePackung={handleOpenDeletePack}
            />
          ))}
        </div>
      )}

      {/* Heutige Einnahmen Zusammenfassung */}
      {medikamente.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <IconClock size={16} className="text-primary shrink-0" />
            <h2 className="font-semibold text-foreground text-sm">Heutiger Einnahmeplan</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['morgens', 'mittags', 'abends', 'nacht'] as const).map(tageszeit => {
              const icons = {
                morgens: <IconSunrise size={15} className="text-amber-500 shrink-0" />,
                mittags: <IconSun size={15} className="text-orange-500 shrink-0" />,
                abends: <IconSunset size={15} className="text-rose-500 shrink-0" />,
                nacht: <IconMoon size={15} className="text-indigo-500 shrink-0" />,
              };
              const labels = { morgens: 'Morgens', mittags: 'Mittags', abends: 'Abends', nacht: 'Nacht' };
              const fieldMap = {
                morgens: 'dosierung_morgens',
                mittags: 'dosierung_mittags',
                abends: 'dosierung_abends',
                nacht: 'dosierung_nacht',
              } as const;
              const field = fieldMap[tageszeit];
              const meds = medikamente.filter(m => {
                const dose = m.fields[field]?.label;
                return dose && dose !== '0';
              });
              return (
                <div key={tageszeit} className="bg-muted/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    {icons[tageszeit]}
                    <span className="text-xs font-medium text-foreground">{labels[tageszeit]}</span>
                  </div>
                  {meds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Keine</p>
                  ) : (
                    <ul className="space-y-1">
                      {meds.map(m => (
                        <li key={m.record_id} className="text-xs flex items-center gap-1 min-w-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                            {m.fields[field]?.label}
                          </span>
                          <span className="truncate text-foreground">{m.fields.name}</span>
                          <span className="text-muted-foreground shrink-0">{m.fields.einheit?.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialoge */}
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
      />

      <PackungenDialog
        open={packDialogOpen}
        onClose={() => { setPackDialogOpen(false); setEditPack(null); setNewPackMedId(null); }}
        onSubmit={async (fields) => {
          if (editPack) {
            await LivingAppsService.updatePackungenEntry(editPack.record_id, fields);
          } else {
            await LivingAppsService.createPackungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editPack
            ? editPack.fields
            : newPackMedId
            ? { medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, newPackMedId) }
            : undefined
        }
        medikamenteList={medikamente}
        enablePhotoScan={AI_PHOTO_SCAN['Packungen']}
      />

      <ConfirmDialog
        open={!!deleteMed}
        title="Medikament löschen"
        description={`„${deleteMed?.fields.name ?? ''}" und alle zugehörigen Daten wirklich löschen?`}
        onConfirm={handleDeleteMed}
        onClose={() => setDeleteMed(null)}
      />

      <ConfirmDialog
        open={!!deletePack}
        title="Packung löschen"
        description="Diese Packung wirklich löschen?"
        onConfirm={handleDeletePack}
        onClose={() => setDeletePack(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
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
