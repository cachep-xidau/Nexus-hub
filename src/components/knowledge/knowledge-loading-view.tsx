import { BookOpen } from 'lucide-react';
import { Header } from '../layout/Header';

export function KnowledgeLoadingView() {
  return (
    <>
      <Header title="Knowledge Hub" subtitle="Loading..." />
      <div className="page-content">
        <div className="knowledge-landing">
          <div className="knowledge-landing-header">
            <BookOpen size={28} />
            <div>
              <h1>Knowledge Hub</h1>
              <p className="text-muted">Đang tải...</p>
            </div>
          </div>
          <div className="knowledge-domain-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="knowledge-domain-card skeleton" style={{ minHeight: 160 }}>
                <div className="skeleton-line" style={{ width: '40%', height: 44, borderRadius: 'var(--radius-md)' }} />
                <div className="skeleton-line" style={{ width: '70%', height: 16, marginTop: 8 }} />
                <div className="skeleton-line" style={{ width: '90%', height: 14, marginTop: 4 }} />
                <div className="skeleton-line" style={{ width: '30%', height: 12, marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
