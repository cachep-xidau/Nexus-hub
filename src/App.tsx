import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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

export default function App() {
  useEffect(() => {
    seedDemoData().catch(() => {});
    seedKnowledge().catch((e) => console.warn('[Knowledge Hub] Seed skipped:', e));
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/knowledge" element={<KnowledgeHub />} />
            <Route path="/knowledge/:domainSlug" element={<KnowledgeHub />} />
            <Route path="/knowledge/:domainSlug/:articleSlug" element={<KnowledgeHub />} />
            <Route path="/tableplus" element={<TablePlus />} />
            <Route path="/repo" element={<Repo />} />
            <Route path="/repo/:id" element={<ProjectDetail />} />
            <Route path="/board/:id" element={<Board />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/gmail" element={<Gmail />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/san-marketing/overview" element={<SanOverview />} />
            <Route path="/san-marketing/reports" element={<SanReports />} />
            <Route path="/san-marketing/data" element={<SanData />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
