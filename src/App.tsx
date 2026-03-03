import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Board } from './pages/Board';
import { Inbox } from './pages/Inbox';
import { Gmail } from './pages/Gmail';
import { Agent } from './pages/Agent';
import { Settings } from './pages/Settings';
import { Repo } from './pages/Repo';
import { ProjectDetail } from './pages/ProjectDetail';
import { SanOverview } from './pages/SanOverview';
import { SanReports } from './pages/SanReports';
import { SanData } from './pages/SanData';
import { KnowledgeHub } from './pages/KnowledgeHub';
import { TablePlus } from './pages/TablePlus';
import { seedDemoData } from './lib/db';
import { seedKnowledge } from './lib/knowledge-seed';
import { syncOnlineCredentialsToLocalSettings } from './lib/online-credentials';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-gate-shell">
        <div className="login-gate-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    syncOnlineCredentialsToLocalSettings().catch((e) => console.warn('[Credentials] Sync skipped:', e));
    seedDemoData().catch(() => {});
    seedKnowledge().catch((e) => console.warn('[Knowledge Hub] Seed skipped:', e));
  }, [user]);

  if (isLoading) {
    return (
      <div className="login-gate-shell">
        <div className="login-gate-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="login-gate-toolbar">
          <button type="button" className="btn btn-sm" onClick={() => logout().catch(console.error)}>
            Logout
          </button>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><KnowledgeHub /></ProtectedRoute>} />
          <Route path="/knowledge/:domainSlug" element={<ProtectedRoute><KnowledgeHub /></ProtectedRoute>} />
          <Route path="/knowledge/:domainSlug/:articleSlug" element={<ProtectedRoute><KnowledgeHub /></ProtectedRoute>} />
          <Route path="/tableplus" element={<ProtectedRoute><TablePlus /></ProtectedRoute>} />
          <Route path="/repo" element={<ProtectedRoute><Repo /></ProtectedRoute>} />
          <Route path="/repo/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/board/:id" element={<ProtectedRoute><Board /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/gmail" element={<ProtectedRoute><Gmail /></ProtectedRoute>} />
          <Route path="/agent" element={<ProtectedRoute><Agent /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/san-marketing/overview" element={<ProtectedRoute><SanOverview /></ProtectedRoute>} />
          <Route path="/san-marketing/reports" element={<ProtectedRoute><SanReports /></ProtectedRoute>} />
          <Route path="/san-marketing/data" element={<ProtectedRoute><SanData /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
