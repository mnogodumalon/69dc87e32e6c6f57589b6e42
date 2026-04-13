import type { Packungen, Medikamente } from '@/types/app';
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

interface PackungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Packungen | null;
  onEdit: (record: Packungen) => void;
  medikamenteList: Medikamente[];
}

export function PackungenViewDialog({ open, onClose, record, onEdit, medikamenteList }: PackungenViewDialogProps) {
  function getMedikamenteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return medikamenteList.find(r => r.record_id === id)?.fields.name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Packungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dosierungsänderungen</Label>
            <p className="text-sm">{Array.isArray(record.fields.dosierungsaenderungen) ? record.fields.dosierungsaenderungen.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anbruch-Datum</Label>
            <p className="text-sm">{formatDate(record.fields.anbruch_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Medikament</Label>
            <p className="text-sm">{getMedikamenteDisplayName(record.fields.medikament)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anfangsmenge (Anzahl Einheiten)</Label>
            <p className="text-sm">{record.fields.anfangsmenge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachbestellung ausgelöst</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.nachbestellt ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.nachbestellt ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Nachbestellung</Label>
            <p className="text-sm">{formatDate(record.fields.nachbestelldatum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}