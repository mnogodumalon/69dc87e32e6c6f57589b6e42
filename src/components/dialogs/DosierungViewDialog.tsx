import type { Dosierung, Packungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface DosierungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Dosierung | null;
  onEdit: (record: Dosierung) => void;
  packungenList: Packungen[];
}

export function DosierungViewDialog({ open, onClose, record, onEdit, packungenList }: DosierungViewDialogProps) {
  function getPackungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return packungenList.find(r => r.record_id === id)?.fields.bemerkungen ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dosierung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Packung</Label>
            <p className="text-sm">{getPackungenDisplayName(record.fields.packung_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gültig ab (Datum der Änderung)</Label>
            <p className="text-sm">{formatDate(record.fields.gueltig_ab)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einnahme einmal pro Woche (wöchentlich)</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.woechentlich_dosierung ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.woechentlich_dosierung ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Morgens</Label>
            <Badge variant="secondary">{record.fields.dosierung_morgens_aenderung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mittags</Label>
            <Badge variant="secondary">{record.fields.dosierung_mittags_aenderung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abends</Label>
            <Badge variant="secondary">{record.fields.dosierung_abends_aenderung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nacht</Label>
            <Badge variant="secondary">{record.fields.dosierung_nacht_aenderung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen_aenderung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}