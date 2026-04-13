import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PackungenPage from '@/pages/PackungenPage';
import MedikamentenUebersichtPage from '@/pages/MedikamentenUebersichtPage';
import MedikamentePage from '@/pages/MedikamentePage';
import DosierungPage from '@/pages/DosierungPage';

const PackungAnbrechenPage = lazy(() => import('@/pages/intents/PackungAnbrechenPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="packungen" element={<PackungenPage />} />
              <Route path="medikamenten-uebersicht" element={<MedikamentenUebersichtPage />} />
              <Route path="medikamente" element={<MedikamentePage />} />
              <Route path="dosierung" element={<DosierungPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/packung-anbrechen" element={<Suspense fallback={null}><PackungAnbrechenPage /></Suspense>} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
