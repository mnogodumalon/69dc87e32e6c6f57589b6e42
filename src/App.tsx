import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import MedikamentePage from '@/pages/MedikamentePage';
import DosierungPage from '@/pages/DosierungPage';
import PackungenPage from '@/pages/PackungenPage';
import MedikamentenUebersichtPage from '@/pages/MedikamentenUebersichtPage';

const NeuePackungPage = lazy(() => import('@/pages/intents/NeuePackungPage'));
const DosierungAnpassenPage = lazy(() => import('@/pages/intents/DosierungAnpassenPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="medikamente" element={<MedikamentePage />} />
              <Route path="dosierung" element={<DosierungPage />} />
              <Route path="packungen" element={<PackungenPage />} />
              <Route path="medikamenten-uebersicht" element={<MedikamentenUebersichtPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/neue-packung" element={<Suspense fallback={null}><NeuePackungPage /></Suspense>} />
              <Route path="intents/dosierung-anpassen" element={<Suspense fallback={null}><DosierungAnpassenPage /></Suspense>} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
