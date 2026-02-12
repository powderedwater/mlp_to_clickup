import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ResultsScreen } from './pages/ResultsScreen';
import { RunWizardScreen } from './pages/RunWizardScreen';
import { SettingsScreen } from './pages/SettingsScreen';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/run-wizard" element={<RunWizardScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
        <Route path="*" element={<Navigate to="/run-wizard" replace />} />
      </Route>
    </Routes>
  );
}
