import type { MedikamentenUebersicht, Packungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface MedikamentenUebersichtViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: MedikamentenUebersicht | null;
  onEdit: (record: MedikamentenUebersicht) => void;
  packungenList: Packungen[];
}

export function MedikamentenUebersichtViewDialog({ open, onClose, record, onEdit, packungenList }: MedikamentenUebersichtViewDialogProps) {
  function getPackungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    const r = packungenList.find(r => r.record_id === id);
    if (!r) return '—';
    const d = r.fields.dosierungsaenderungen;
    if (Array.isArray(d)) return d.map((v: { label?: string }) => v?.label ?? '').filter(Boolean).join(', ') || r.record_id;
    return r.record_id;
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medikamenten-Übersicht anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Überprüfungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.uebersicht_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Packung (als nächstes aufgebraucht)</Label>
            <p className="text-sm">{getPackungenDisplayName(record.fields.laufende_packungen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweis / Notiz</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.hinweis ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}