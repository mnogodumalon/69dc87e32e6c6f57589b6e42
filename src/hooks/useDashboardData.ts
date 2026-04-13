import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Medikamente, Dosierung, Packungen, MedikamentenUebersicht } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [medikamente, setMedikamente] = useState<Medikamente[]>([]);
  const [dosierung, setDosierung] = useState<Dosierung[]>([]);
  const [packungen, setPackungen] = useState<Packungen[]>([]);
  const [medikamentenUebersicht, setMedikamentenUebersicht] = useState<MedikamentenUebersicht[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [medikamenteData, dosierungData, packungenData, medikamentenUebersichtData] = await Promise.all([
        LivingAppsService.getMedikamente(),
        LivingAppsService.getDosierung(),
        LivingAppsService.getPackungen(),
        LivingAppsService.getMedikamentenUebersicht(),
      ]);
      setMedikamente(medikamenteData);
      setDosierung(dosierungData);
      setPackungen(packungenData);
      setMedikamentenUebersicht(medikamentenUebersichtData);
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
        const [medikamenteData, dosierungData, packungenData, medikamentenUebersichtData] = await Promise.all([
          LivingAppsService.getMedikamente(),
          LivingAppsService.getDosierung(),
          LivingAppsService.getPackungen(),
          LivingAppsService.getMedikamentenUebersicht(),
        ]);
        setMedikamente(medikamenteData);
        setDosierung(dosierungData);
        setPackungen(packungenData);
        setMedikamentenUebersicht(medikamentenUebersichtData);
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

  return { medikamente, setMedikamente, dosierung, setDosierung, packungen, setPackungen, medikamentenUebersicht, setMedikamentenUebersicht, loading, error, fetchAll, medikamenteMap, packungenMap };
}