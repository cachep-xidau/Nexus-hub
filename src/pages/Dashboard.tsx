import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  Inbox, Kanban, CheckCircle2, Bot, Slack, Mail, Send, TrendingUp, Clock,
} from 'lucide-react';

const stats = [
  { label: 'Unread Messages', value: '12', icon: Inbox, color: 'var(--accent)' },
  { label: 'Active Boards', value: '3', icon: Kanban, color: 'var(--col-progress)' },
  { label: 'Tasks Done Today', value: '8', icon: CheckCircle2, color: 'var(--col-done)' },
  { label: 'AI Actions', value: '24', icon: Bot, color: '#a855f7' },
];

const recentActivity = [
  { channel: 'slack', sender: 'Sarah Chen', message: 'Deployed v2.3 to staging ✅', time: '2m ago', icon: Slack, color: 'var(--slack)' },
  { channel: 'gmail', sender: 'Mike Johnson', message: 'Re: Q1 Report — please review the attached...', time: '15m ago', icon: Mail, color: 'var(--gmail)' },
  { channel: 'telegram', sender: 'Dev Bot', message: 'Build #482 passed. All 127 tests green.', time: '1h ago', icon: Send, color: 'var(--telegram)' },
  { channel: 'slack', sender: 'Lisa Park', message: 'Updated the design system tokens for v3', time: '2h ago', icon: Slack, color: 'var(--slack)' },
  { channel: 'gmail', sender: 'AWS Alerts', message: 'Monthly billing summary — $342.18', time: '3h ago', icon: Mail, color: 'var(--gmail)' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your channels and tasks" />
      <div className="page-content">
        <div className="dashboard-stats stagger">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card animate-fade-in">
              <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={22} />
              </div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-section">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2 className="dashboard-section-title" style={{ margin: 0 }}>
              <Clock size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
              Recent Activity
            </h2>
            <span className="text-sm text-muted">Last synced: just now</span>
          </div>
          <div className="inbox-list stagger">
            {recentActivity.map((item, i) => (
              <div key={i} className="inbox-item animate-fade-in">
                <div className={`avatar ${item.channel}`}><item.icon size={18} /></div>
                <div className="inbox-item-content">
                  <div className="inbox-item-header">
                    <span className="inbox-item-sender">{item.sender}</span>
                    <span className={`channel-badge ${item.channel}`}>{item.channel}</span>
                    <span className="inbox-item-time">{item.time}</span>
                  </div>
                  <div className="inbox-item-preview">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="dashboard-section-title">
            <TrendingUp size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
            Quick Actions
          </h2>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/board/default')}>
              <Kanban size={16} /> Open Kanban Board
            </button>
            <button className="btn" onClick={() => navigate('/inbox')}>
              <Inbox size={16} /> View Inbox
            </button>
            <button className="btn" onClick={() => navigate('/agent')}>
              <Bot size={16} /> Ask AI Agent
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
