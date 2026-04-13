import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Packungen, MedikamentenUebersicht, Medikamente, Dosierung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [packungen, setPackungen] = useState<Packungen[]>([]);
  const [medikamentenUebersicht, setMedikamentenUebersicht] = useState<MedikamentenUebersicht[]>([]);
  const [medikamente, setMedikamente] = useState<Medikamente[]>([]);
  const [dosierung, setDosierung] = useState<Dosierung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [packungenData, medikamentenUebersichtData, medikamenteData, dosierungData] = await Promise.all([
        LivingAppsService.getPackungen(),
        LivingAppsService.getMedikamentenUebersicht(),
        LivingAppsService.getMedikamente(),
        LivingAppsService.getDosierung(),
      ]);
      setPackungen(packungenData);
      setMedikamentenUebersicht(medikamentenUebersichtData);
      setMedikamente(medikamenteData);
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
        const [packungenData, medikamentenUebersichtData, medikamenteData, dosierungData] = await Promise.all([
          LivingAppsService.getPackungen(),
          LivingAppsService.getMedikamentenUebersicht(),
          LivingAppsService.getMedikamente(),
          LivingAppsService.getDosierung(),
        ]);
        setPackungen(packungenData);
        setMedikamentenUebersicht(medikamentenUebersichtData);
        setMedikamente(medikamenteData);
        setDosierung(dosierungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const packungenMap = useMemo(() => {
    const m = new Map<string, Packungen>();
    packungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [packungen]);

  const medikamenteMap = useMemo(() => {
    const m = new Map<string, Medikamente>();
    medikamente.forEach(r => m.set(r.record_id, r));
    return m;
  }, [medikamente]);

  return { packungen, setPackungen, medikamentenUebersicht, setMedikamentenUebersicht, medikamente, setMedikamente, dosierung, setDosierung, loading, error, fetchAll, packungenMap, medikamenteMap };
}