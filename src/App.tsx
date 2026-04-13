import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import MedikamentePage from '@/pages/MedikamentePage';
import MedikamentenUebersichtPage from '@/pages/MedikamentenUebersichtPage';
import PackungenPage from '@/pages/PackungenPage';
import DosierungPage from '@/pages/DosierungPage';

const MedikamentEinrichtenPage = lazy(() => import('@/pages/intents/MedikamentEinrichtenPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="medikamente" element={<MedikamentePage />} />
              <Route path="medikamenten-uebersicht" element={<MedikamentenUebersichtPage />} />
              <Route path="packungen" element={<PackungenPage />} />
              <Route path="dosierung" element={<DosierungPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/medikament-einrichten" element={<Suspense fallback={null}><MedikamentEinrichtenPage /></Suspense>} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
