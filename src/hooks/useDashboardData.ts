import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Medikamente, MedikamentenUebersicht, Packungen, Dosierung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [medikamente, setMedikamente] = useState<Medikamente[]>([]);
  const [medikamentenUebersicht, setMedikamentenUebersicht] = useState<MedikamentenUebersicht[]>([]);
  const [packungen, setPackungen] = useState<Packungen[]>([]);
  const [dosierung, setDosierung] = useState<Dosierung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [medikamenteData, medikamentenUebersichtData, packungenData, dosierungData] = await Promise.all([
        LivingAppsService.getMedikamente(),
        LivingAppsService.getMedikamentenUebersicht(),
        LivingAppsService.getPackungen(),
        LivingAppsService.getDosierung(),
      ]);
      setMedikamente(medikamenteData);
      setMedikamentenUebersicht(medikamentenUebersichtData);
      setPackungen(packungenData);
      setDosierung(dosierungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [medikamenteData, medikamentenUebersichtData, packungenData, dosierungData] = await Promise.all([
          LivingAppsService.getMedikamente(),
          LivingAppsService.getMedikamentenUebersicht(),
          LivingAppsService.getPackungen(),
          LivingAppsService.getDosierung(),
        ]);
        setMedikamente(medikamenteData);
        setMedikamentenUebersicht(medikamentenUebersichtData);
        setPackungen(packungenData);
        setDosierung(dosierungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const medikamenteMap = useMemo(() => {
    const m = new Map<string, Medikamente>();
    medikamente.forEach(r => m.set(r.record_id, r));
    return m;
  }, [medikamente]);

  const packungenMap = useMemo(() => {
    const m = new Map<string, Packungen>();
    packungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [packungen]);

  return { medikamente, setMedikamente, medikamentenUebersicht, setMedikamentenUebersicht, packungen, setPackungen, dosierung, setDosierung, loading, error, fetchAll, medikamenteMap, packungenMap };
}