import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPackungen } from '@/lib/enrich';
import type { EnrichedPackungen } from '@/types/enriched';
import type { Medikamente, Packungen } from '@/types/app';
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
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconPill,
  IconPackage, IconAlertTriangle, IconCircleCheck,
  IconClock, IconChevronRight, IconStethoscope,
} from '@tabler/icons-react';

const APPGROUP_ID = '69dc87e32e6c6f57589b6e42';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode =
  | { type: 'createMedikament' }
  | { type: 'editMedikament'; record: Medikamente }
  | { type: 'createPackung'; medikamentId: string }
  | { type: 'editPackung'; record: Packungen }
  | null;

export default function DashboardOverview() {
  const {
    medikamente, packungen,
    medikamenteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPackungen = enrichPackungen(packungen, { medikamenteMap });

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'medikament' | 'packung'; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Map: medikamentId → enriched packungen (sorted by startdatum desc)
  const packungByMedikament = useMemo(() => {
    const m = new Map<string, EnrichedPackungen[]>();
    enrichedPackungen.forEach(p => {
      const medId = getMedikamentId(p.fields.medikament);
      if (!medId) return;
      if (!m.has(medId)) m.set(medId, []);
      m.get(medId)!.push(p);
    });
    // Sort each list: newest startdatum first
    m.forEach((list) => {
      list.sort((a, b) => (b.fields.startdatum ?? '').localeCompare(a.fields.startdatum ?? ''));
    });
    return m;
  }, [enrichedPackungen]);

  const filteredMedikamente = useMemo(() => {
    if (!searchQuery.trim()) return medikamente;
    const q = searchQuery.toLowerCase();
    return medikamente.filter(m =>
      (m.fields.name ?? '').toLowerCase().includes(q) ||
      (m.fields.wirkstoff ?? '').toLowerCase().includes(q) ||
      (m.fields.hersteller ?? '').toLowerCase().includes(q)
    );
  }, [medikamente, searchQuery]);

  // Stats
  const totalMedikamente = medikamente.length;
  const totalPackungen = packungen.length;
  const niedrigBestand = packungen.filter(p => {
    const rest = p.fields.verbleibende_menge ?? 0;
    const anfang = p.fields.anfangsmenge ?? 1;
    return anfang > 0 && rest / anfang < 0.25;
  }).length;
  const nachbestellungen = packungen.filter(p => !p.fields.nachbestellt && (p.fields.verbleibende_menge ?? 0) < 10).length;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'medikament') {
      await LivingAppsService.deleteMedikamenteEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deletePackungenEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/medikament-einrichten"
          className="flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <IconStethoscope size={22} className="text-primary shrink-0" stroke={1.5} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground truncate">Neues Medikament einrichten</div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Medikament anlegen, Packung erfassen und Dosierung festlegen – Schritt für Schritt.</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" stroke={1.5} />
        </a>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Medikamente"
          value={String(totalMedikamente)}
          description="Stammdaten"
          icon={<IconPill size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Packungen"
          value={String(totalPackungen)}
          description="Aktive Bestände"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Niedriger Bestand"
          value={String(niedrigBestand)}
          description="< 25 % verbleibend"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Nachbestellung"
          value={String(nachbestellungen)}
          description="Ausstehend"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Suchleiste + Aktion */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Medikament suchen…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[160px] max-w-sm h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" onClick={() => setDialog({ type: 'createMedikament' })}>
          <IconPlus size={15} className="mr-1 shrink-0" />
          <span>Medikament</span>
        </Button>
      </div>

      {/* Medikamenten-Kacheln */}
      {filteredMedikamente.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <IconPill size={48} stroke={1.5} />
          <p className="text-sm">Keine Medikamente gefunden.</p>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'createMedikament' })}>
            <IconPlus size={14} className="mr-1" />Erstes Medikament anlegen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMedikamente.map(med => {
            const packungen = packungByMedikament.get(med.record_id) ?? [];
            const aktivePackung = packungen[0] ?? null;
            return (
              <MedikamentCard
                key={med.record_id}
                medikament={med}
                aktivePackung={aktivePackung}
                allePackungen={packungen}
                onEditMedikament={() => setDialog({ type: 'editMedikament', record: med })}
                onDeleteMedikament={() => setDeleteTarget({ type: 'medikament', id: med.record_id })}
                onAddPackung={() => setDialog({ type: 'createPackung', medikamentId: med.record_id })}
                onEditPackung={(p) => setDialog({ type: 'editPackung', record: p })}
                onDeletePackung={(id) => setDeleteTarget({ type: 'packung', id })}
              />
            );
          })}
        </div>
      )}

      {/* Dialoge */}
      {dialog?.type === 'createMedikament' && (
        <MedikamenteDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.createMedikamenteEntry(fields); fetchAll(); }}
          enablePhotoScan={AI_PHOTO_SCAN['Medikamente']}
        />
      )}
      {dialog?.type === 'editMedikament' && (
        <MedikamenteDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.updateMedikamenteEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          enablePhotoScan={AI_PHOTO_SCAN['Medikamente']}
        />
      )}
      {dialog?.type === 'createPackung' && (
        <PackungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.createPackungenEntry(fields); fetchAll(); }}
          defaultValues={{ medikament: createRecordUrl(APP_IDS.MEDIKAMENTE, dialog.medikamentId) }}
          medikamenteList={medikamente}
          enablePhotoScan={AI_PHOTO_SCAN['Packungen']}
        />
      )}
      {dialog?.type === 'editPackung' && (
        <PackungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.updatePackungenEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          medikamenteList={medikamente}
          enablePhotoScan={AI_PHOTO_SCAN['Packungen']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={
          deleteTarget?.type === 'medikament'
            ? 'Medikament und alle zugehörigen Daten wirklich löschen?'
            : 'Packung wirklich löschen?'
        }
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ---- Hilfsfunktionen ----

function getMedikamentId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/([a-f0-9]{24})$/i);
  return m ? m[1] : null;
}

function getBestandStatus(verbleibend: number | undefined, anfang: number | undefined): 'ok' | 'warn' | 'critical' {
  if (anfang == null || anfang === 0) return 'ok';
  const ratio = (verbleibend ?? 0) / anfang;
  if (ratio > 0.5) return 'ok';
  if (ratio > 0.25) return 'warn';
  return 'critical';
}

function DosierungBadge({ label, value }: { label: string; value: string | undefined }) {
  if (!value || value === '0') return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
      <span className="text-muted-foreground font-normal">{label}</span>
      {value}
    </span>
  );
}

interface MedikamentCardProps {
  medikament: Medikamente;
  aktivePackung: EnrichedPackungen | null;
  allePackungen: EnrichedPackungen[];
  onEditMedikament: () => void;
  onDeleteMedikament: () => void;
  onAddPackung: () => void;
  onEditPackung: (p: Packungen) => void;
  onDeletePackung: (id: string) => void;
}

function MedikamentCard({
  medikament,
  aktivePackung,
  allePackungen,
  onEditMedikament,
  onDeleteMedikament,
  onAddPackung,
  onEditPackung,
  onDeletePackung,
}: MedikamentCardProps) {
  const f = medikament.fields;
  const pf = aktivePackung?.fields;

  const verbleibend = pf?.verbleibende_menge ?? null;
  const anfang = pf?.anfangsmenge ?? null;
  const bestandStatus = getBestandStatus(verbleibend ?? undefined, anfang ?? undefined);
  const progressPct = anfang && anfang > 0 ? Math.min(100, Math.round(((verbleibend ?? 0) / anfang) * 100)) : null;

  const morgens = pf?.dosierung_morgens_packung?.label;
  const mittags = pf?.dosierung_mittags_packung?.label;
  const abends = pf?.dosierung_abends_packung?.label;
  const nacht = pf?.dosierung_nacht_packung?.label;

  const statusColor = {
    ok: 'bg-green-500',
    warn: 'bg-amber-400',
    critical: 'bg-red-500',
  }[bestandStatus];

  const statusBg = {
    ok: 'bg-green-50 border-green-200',
    warn: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  }[bestandStatus];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconPill size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">{f.name ?? '—'}</h3>
          {f.wirkstoff && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{f.wirkstoff}</p>
          )}
          {f.hersteller && (
            <p className="text-xs text-muted-foreground truncate">{f.hersteller}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEditMedikament}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <IconPencil size={15} />
          </button>
          <button
            onClick={onDeleteMedikament}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Löschen"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {/* Einheit + Packungsgröße */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {f.einheit?.label && (
          <Badge variant="secondary" className="text-xs">{f.einheit.label}</Badge>
        )}
        {f.packungsgroesse != null && (
          <Badge variant="outline" className="text-xs">{f.packungsgroesse} Einheiten</Badge>
        )}
        {f.woechentlich && (
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">Wöchentlich</Badge>
        )}
      </div>

      {/* Dosierungsschema (aus Medikament-Stammdaten) */}
      {(f.dosierung_morgens || f.dosierung_mittags || f.dosierung_abends || f.dosierung_nacht) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          <DosierungBadge label="M " value={f.dosierung_morgens?.label} />
          <DosierungBadge label="M " value={f.dosierung_mittags?.label} />
          <DosierungBadge label="A " value={f.dosierung_abends?.label} />
          <DosierungBadge label="N " value={f.dosierung_nacht?.label} />
        </div>
      )}

      {/* Aktive Packung */}
      {aktivePackung ? (
        <div className={`mx-3 mb-3 rounded-xl border p-3 ${statusBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
              <span className="text-xs font-medium">Aktive Packung</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEditPackung(aktivePackung)}
                className="p-1 rounded hover:bg-white/60 transition-colors text-muted-foreground"
                title="Packung bearbeiten"
              >
                <IconPencil size={13} />
              </button>
              <button
                onClick={() => onDeletePackung(aktivePackung.record_id)}
                className="p-1 rounded hover:bg-white/60 transition-colors text-muted-foreground hover:text-destructive"
                title="Packung löschen"
              >
                <IconTrash size={13} />
              </button>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          {progressPct !== null && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Bestand</span>
                <span className="font-medium">{verbleibend} / {anfang}</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${statusColor}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {pf?.startdatum && (
              <span>Start: <strong className="text-foreground">{formatDate(pf.startdatum)}</strong></span>
            )}
            {pf?.voraussichtliches_aufbrauch_datum && (
              <span>Aufbrauch: <strong className="text-foreground">{formatDate(pf.voraussichtliches_aufbrauch_datum)}</strong></span>
            )}
            {pf?.nachbestellt && (
              <span className="inline-flex items-center gap-0.5 text-green-700">
                <IconCircleCheck size={12} />Nachbestellt
              </span>
            )}
          </div>

          {/* Dosierung der Packung */}
          {(morgens || mittags || abends || nacht) && (
            <div className="mt-2 flex flex-wrap gap-1">
              <DosierungBadge label="M " value={morgens} />
              <DosierungBadge label="M " value={mittags} />
              <DosierungBadge label="A " value={abends} />
              <DosierungBadge label="N " value={nacht} />
            </div>
          )}
        </div>
      ) : (
        <div className="mx-3 mb-3 rounded-xl border border-dashed p-3 flex flex-col items-center gap-1.5 text-muted-foreground">
          <IconPackage size={20} stroke={1.5} />
          <p className="text-xs">Keine Packung hinterlegt</p>
        </div>
      )}

      {/* Weitere Packungen (Anzahl) + Packung hinzufügen */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        {allePackungen.length > 1 ? (
          <span className="text-xs text-muted-foreground">{allePackungen.length} Packungen gesamt</span>
        ) : (
          <span />
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddPackung}>
          <IconPlus size={13} className="mr-1 shrink-0" />Packung
        </Button>
      </div>
    </div>
  );
}

// ---- Skeleton & Error ----

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
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
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
