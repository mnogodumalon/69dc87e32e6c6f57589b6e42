import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import MedikamentePage from '@/pages/MedikamentePage';
import PackungenPage from '@/pages/PackungenPage';
import MedikamentenUebersichtPage from '@/pages/MedikamentenUebersichtPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="medikamente" element={<MedikamentePage />} />
              <Route path="packungen" element={<PackungenPage />} />
              <Route path="medikamenten-uebersicht" element={<MedikamentenUebersichtPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
