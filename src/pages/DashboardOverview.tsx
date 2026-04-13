import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPackungen } from '@/lib/enrich';
import type { EnrichedPackungen } from '@/types/enriched';
import type { Medikamente } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
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
  IconPill,
  IconPackage,
  IconPlus,
  IconPencil,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconShoppingCart,
  IconSun,
  IconCloud,
  IconMoon,
  IconStars,
  IconTool,
  IconRefresh,
  IconAlertCircle,
} from '@tabler/icons-react';

const APPGROUP_ID = '69dc87e32e6c6f57589b6e42';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DosierungZeit = 'morgens' | 'mittags' | 'abends' | 'nacht';

function getDosis(med: Medikamente, zeit: DosierungZeit): string {
  const fieldMap: Record<DosierungZeit, keyof Medikamente['fields']> = {
    morgens: 'dosierung_morgens',
    mittags: 'dosierung_mittags',
    abends: 'dosierung_abends',
    nacht: 'dosierung_nacht',
  };
  const val = med.fields[fieldMap[zeit]];
  if (!val) return '0';
  if (typeof val === 'object' && 'label' in val) return (val as { label: string }).label;
  return String(val);
}

function hasDosis(med: Medikamente): boolean {
  return (
    getDosis(med, 'morgens') !== '0' ||
    getDosis(med, 'mittags') !== '0' ||
    getDosis(med, 'abends') !== '0' ||
    getDosis(med, 'nacht') !== '0'
  );
}

interface MedikamentCardProps {
  med: Medikamente;
  packungen: EnrichedPackungen[];
  onEdit: (med: Medikamente) => void;
  onDelete: (med: Medikamente) => void;
  onAddPackung: (med: Medikamente) => void;
  onEditPackung: (p: EnrichedPackungen) => void;
  onDeletePackung: (p: EnrichedPackungen) => void;
}

function DosisZelle({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  const active = value !== '0' && value !== '—';
  return (
    <div className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl ${active ? 'bg-primary/10' : 'bg-muted/40'}`}>
      <span className={`${active ? 'text-primary' : 'text-muted-foreground/50'}`}>{icon}</span>
      <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-muted-foreground/50'}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function MedikamentCard({ med, packungen, onEdit, onDelete, onAddPackung, onEditPackung, onDeletePackung }: MedikamentCardProps) {
  const aktuellePackung = packungen
    .filter(p => {
      const url = p.fields.medikament;
      if (!url) return false;
      return url.endsWith(med.record_id);
    })
    .sort((a, b) => (b.fields.anbruch_datum ?? '').localeCompare(a.fields.anbruch_datum ?? ''))
    .at(0);

  const niedrigerBestand =
    aktuellePackung &&
    aktuellePackung.fields.anfangsmenge != null &&
    aktuellePackung.fields.anfangsmenge <= 10;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconPill size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{med.fields.name ?? '—'}</h3>
            {med.fields.woechentlich && (
              <Badge variant="secondary" className="text-[10px] shrink-0">Wöchentlich</Badge>
            )}
          </div>
          {med.fields.wirkstoff && (
            <p className="text-xs text-muted-foreground truncate">{med.fields.wirkstoff}</p>
          )}
          {med.fields.einheit && (
            <p className="text-xs text-muted-foreground">
              {med.fields.packungsgroesse != null ? `${med.fields.packungsgroesse} ` : ''}
              {typeof med.fields.einheit === 'object' && 'label' in med.fields.einheit
                ? (med.fields.einheit as { label: string }).label
                : String(med.fields.einheit)}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(med)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={14} />
          </button>
          <button
            onClick={() => onDelete(med)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Löschen"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {/* Dosierungsplan */}
      {hasDosis(med) && (
        <div className="px-4 pb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tagesplan</p>
          <div className="grid grid-cols-4 gap-1">
            <DosisZelle label="Morgens" icon={<IconSun size={13} stroke={1.5} />} value={getDosis(med, 'morgens')} />
            <DosisZelle label="Mittags" icon={<IconCloud size={13} stroke={1.5} />} value={getDosis(med, 'mittags')} />
            <DosisZelle label="Abends" icon={<IconMoon size={13} stroke={1.5} />} value={getDosis(med, 'abends')} />
            <DosisZelle label="Nacht" icon={<IconStars size={13} stroke={1.5} />} value={getDosis(med, 'nacht')} />
          </div>
        </div>
      )}

      {/* Aktuelle Packung */}
      <div className="px-4 pb-3 mt-auto">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Aktuelle Packung</p>
        {aktuellePackung ? (
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${niedrigerBestand ? 'bg-amber-50 border border-amber-200' : 'bg-muted/40'}`}
          >
            <IconPackage size={14} className={niedrigerBestand ? 'text-amber-500 shrink-0' : 'text-muted-foreground shrink-0'} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`text-xs font-medium ${niedrigerBestand ? 'text-amber-700' : 'text-foreground'}`}>
                  {aktuellePackung.fields.anfangsmenge != null ? `${aktuellePackung.fields.anfangsmenge} Einheiten` : 'Keine Menge'}
                </span>
                {niedrigerBestand && (
                  <span className="text-[10px] text-amber-600 font-medium">Niedrig!</span>
                )}
                {aktuellePackung.fields.nachbestellt && (
                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 shrink-0">
                    <IconCheck size={10} className="mr-0.5" />Bestellt
                  </Badge>
                )}
              </div>
              {aktuellePackung.fields.anbruch_datum && (
                <p className="text-[10px] text-muted-foreground">
                  Anbruch: {formatDate(aktuellePackung.fields.anbruch_datum)}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onEditPackung(aktuellePackung)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Packung bearbeiten"
              >
                <IconPencil size={12} />
              </button>
              <button
                onClick={() => onDeletePackung(aktuellePackung)}
                className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Packung löschen"
              >
                <IconTrash size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onAddPackung(med)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors"
          >
            <IconPlus size={13} />
            Packung hinzufügen
          </button>
        )}
      </div>

      {/* Footer Aktionen */}
      <div className="border-t border-border px-4 py-2 flex gap-2">
        <button
          onClick={() => onAddPackung(med)}
          className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary py-1 transition-colors"
        >
          <IconPlus size={12} />Packung
        </button>
        {niedrigerBestand && !aktuellePackung?.fields.nachbestellt && (
          <button
            onClick={async () => {
              if (!aktuellePackung) return;
              await LivingAppsService.updatePackungenEntry(aktuellePackung.record_id, {
                nachbestellt: true,
                nachbestelldatum: new Date().toISOString().slice(0, 10),
              });
              window.dispatchEvent(new Event('dashboard-refresh'));
            }}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-amber-600 hover:text-amber-700 py-1 transition-colors"
          >
            <IconShoppingCart size={12} />Nachbestellen
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const {
    medikamente, dosierung: _dosierung, packungen, medikamentenUebersicht: _medikamentenUebersicht,
    medikamenteMap, packungenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPackungen = enrichPackungen(packungen, { medikamenteMap });

  // ---- State (ALL hooks BEFORE early returns) ----
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medikamente | null>(null);
  const [deleteMed, setDeleteMed] = useState<Medikamente | null>(null);

  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editPack, setEditPack] = useState<EnrichedPackungen | null>(null);
  const [deletePack, setDeletePack] = useState<EnrichedPackungen | null>(null);
  const [prefillMedikamentUrl, setPrefillMedikamentUrl] = useState<string | undefined>(undefined);

  const stats = useMemo(() => {
    const niedrig = enrichedPackungen.filter(
      p => p.fields.anfangsmenge != null && p.fields.anfangsmenge <= 10 && !p.fields.nachbestellt
    ).length;
    const nachbestellt = enrichedPackungen.filter(p => p.fields.nachbestellt).length;
    return { total: medikamente.length, niedrig, nachbestellt };
  }, [medikamente, enrichedPackungen]);

  // Unused warning suppression for packungenMap (used in enrich)
  void packungenMap;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ---- Handlers ----
  const handleMedCreate = async (fields: Medikamente['fields']) => {
    await LivingAppsService.createMedikamenteEntry(fields);
    fetchAll();
  };

  const handleMedEdit = async (fields: Medikamente['fields']) => {
    if (!editMed) return;
    await LivingAppsService.updateMedikamenteEntry(editMed.record_id, fields);
    fetchAll();
  };

  const handleMedDelete = async () => {
    if (!deleteMed) return;
    await LivingAppsService.deleteMedikamenteEntry(deleteMed.record_id);
    setDeleteMed(null);
    fetchAll();
  };

  const handlePackCreate = async (fields: EnrichedPackungen['fields']) => {
    await LivingAppsService.createPackungenEntry(fields);
    fetchAll();
  };

  const handlePackEdit = async (fields: EnrichedPackungen['fields']) => {
    if (!editPack) return;
    await LivingAppsService.updatePackungenEntry(editPack.record_id, fields);
    fetchAll();
  };

  const handlePackDelete = async () => {
    if (!deletePack) return;
    await LivingAppsService.deletePackungenEntry(deletePack.record_id);
    setDeletePack(null);
    fetchAll();
  };

  const openAddPackung = (med: Medikamente) => {
    setEditPack(null);
    setPrefillMedikamentUrl(createRecordUrl(APP_IDS.MEDIKAMENTE, med.record_id));
    setPackDialogOpen(true);
  };

  const openEditPackung = (p: EnrichedPackungen) => {
    setEditPack(p);
    setPrefillMedikamentUrl(undefined);
    setPackDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Medikamenten-Übersicht</h1>
          <p className="text-sm text-muted-foreground">Dein täglicher Einnahmeplan</p>
        </div>
        <Button
          onClick={() => { setEditMed(null); setMedDialogOpen(true); }}
          size="sm"
          className="gap-1.5"
        >
          <IconPlus size={16} />
          Medikament
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          title="Medikamente"
          value={String(stats.total)}
          description="Gesamt"
          icon={<IconPill size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Vorrat niedrig"
          value={String(stats.niedrig)}
          description="Nachbestellen"
          icon={<IconAlertTriangle size={18} className={stats.niedrig > 0 ? 'text-amber-500' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Nachbestellt"
          value={String(stats.nachbestellt)}
          description="In Bestellung"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Medikamente-Karten */}
      {medikamente.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <IconPill size={32} className="text-muted-foreground" stroke={1.5} />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Keine Medikamente</p>
            <p className="text-sm text-muted-foreground">Füge dein erstes Medikament hinzu.</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditMed(null); setMedDialogOpen(true); }}
            className="gap-1.5"
          >
            <IconPlus size={16} />Medikament hinzufügen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medikamente.map(med => (
            <MedikamentCard
              key={med.record_id}
              med={med}
              packungen={enrichedPackungen}
              onEdit={m => { setEditMed(m); setMedDialogOpen(true); }}
              onDelete={m => setDeleteMed(m)}
              onAddPackung={openAddPackung}
              onEditPackung={openEditPackung}
              onDeletePackung={p => setDeletePack(p)}
            />
          ))}
        </div>
      )}

      {/* Medikamente Dialog */}
      <MedikamenteDialog
        open={medDialogOpen}
        onClose={() => { setMedDialogOpen(false); setEditMed(null); }}
        onSubmit={editMed ? handleMedEdit : handleMedCreate}
        defaultValues={editMed?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Medikamente']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Medikamente']}
      />

      {/* Packungen Dialog */}
      <PackungenDialog
        open={packDialogOpen}
        onClose={() => { setPackDialogOpen(false); setEditPack(null); setPrefillMedikamentUrl(undefined); }}
        onSubmit={editPack ? handlePackEdit : handlePackCreate}
        defaultValues={editPack ? editPack.fields : (prefillMedikamentUrl ? { medikament: prefillMedikamentUrl } : undefined)}
        medikamenteList={medikamente}
        enablePhotoScan={AI_PHOTO_SCAN['Packungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Packungen']}
      />

      {/* Bestätigungsdialoge */}
      <ConfirmDialog
        open={!!deleteMed}
        title="Medikament löschen"
        description={`„${deleteMed?.fields.name ?? 'Dieses Medikament'}" wirklich löschen?`}
        onConfirm={handleMedDelete}
        onClose={() => setDeleteMed(null)}
      />
      <ConfirmDialog
        open={!!deletePack}
        title="Packung löschen"
        description="Diese Packung wirklich löschen?"
        onConfirm={handlePackDelete}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
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
