import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import MedikamentePage from '@/pages/MedikamentePage';
import MedikamentenUebersichtPage from '@/pages/MedikamentenUebersichtPage';
import PackungenPage from '@/pages/PackungenPage';
import DosierungPage from '@/pages/DosierungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="medikamente" element={<MedikamentePage />} />
              <Route path="medikamenten-uebersicht" element={<MedikamentenUebersichtPage />} />
              <Route path="packungen" element={<PackungenPage />} />
              <Route path="dosierung" element={<DosierungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
