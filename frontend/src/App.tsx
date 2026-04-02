import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlanPage from './pages/PlanPage';
import TimetablePage from './pages/TimetablePage';
import ProgressPage from './pages/ProgressPage';
import WeakAreasPage from './pages/WeakAreasPage';
import NotificationsPage from './pages/NotificationsPage';
import QuizPage from './pages/QuizPage';
import ProfilePage from './pages/ProfilePage';

function Protected({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="study-app items-center justify-center p-8">
        <p className="study-sub">Loading…</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="weak-areas" element={<WeakAreasPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
