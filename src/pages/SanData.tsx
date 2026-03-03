import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    fetchMarketingData,
    fetchEntries,
    getDateRange,
    formatVND,
    numOrZero,
    COMPANIES,
    CHANNEL_LABELS,
    CHANNEL_COLORS,
    type EntryRow,
    type TimeRange,
} from '../lib/san-marketing-api';

/* ── Form entry type ── */
interface LeadEntry extends EntryRow {
    enteredBy?: string;
    updatedBy?: string;
    updatedAt?: string;
}

/* ══════ Time Options ══════ */
const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: '3m', label: '3 tháng' },
];

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export function SanData() {
    const [activeCompanyId, setActiveCompanyId] = useState('san');
    const activeCompany = COMPANIES.find(c => c.id === activeCompanyId);

    const [entries, setEntries] = useState<LeadEntry[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
    const [companySummary, setCompanySummary] = useState<Record<string, { campaigns: number; leads: number }>>({});
    const [loading, setLoading] = useState(true);

    const [showAddRow, setShowAddRow] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterChannel, setFilterChannel] = useState('all');

    const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

    useEffect(() => {
        const fetchAll = activeCompanyId === 'all'
            ? Promise.all(COMPANIES.map(co => fetchEntries(co.id, dateRange.start, dateRange.end)))
                .then(results => results.flat())
            : fetchEntries(activeCompanyId, dateRange.start, dateRange.end);
        fetchAll
            .then(data => setEntries(data as LeadEntry[]))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeCompanyId, dateRange.start, dateRange.end]);

    useEffect(() => {
        fetchMarketingData(dateRange.start, dateRange.end)
            .then(data => {
                if (!data?.summary) return;
                const map: Record<string, { campaigns: number; leads: number }> = {};
                for (const s of data.summary) {
                    const coCampaigns = data.campaigns?.filter(c => c.companyId === s.companyId) || [];
                    const uniqueNames = new Set(coCampaigns.map(c => c.campaignName));
                    map[s.companyId] = { campaigns: uniqueNames.size, leads: numOrZero(s._sum.totalLead) };
                }
                setCompanySummary(map);
            })
            .catch(() => { });
    }, [dateRange.start, dateRange.end]);

    /* ── Derived ── */
    const channels = useMemo(() => {
        const set = new Set<string>();
        entries.forEach(e => { if (e.channel) set.add(e.channel); });
        return Array.from(set).sort();
    }, [entries]);

    const companyCampaigns = useMemo(() => {
        const seen = new Map<string, { id: string; name: string; channel: string }>();
        for (const e of entries) {
            if (!seen.has(e.campaignName)) {
                seen.set(e.campaignName, { id: String(e.campaignId), name: e.campaignName, channel: e.channel });
            }
        }
        return Array.from(seen.values());
    }, [entries]);

    const filteredEntries = useMemo(() => {
        let list = entries;
        if (filterChannel !== 'all') list = list.filter(e => e.channel === filterChannel);
        return list;
    }, [entries, filterChannel]);

    const totals = useMemo(() => ({
        totalLead: filteredEntries.reduce((s, e) => s + (e.totalLead || 0), 0),
        spam: filteredEntries.reduce((s, e) => s + (e.spam || 0), 0),
        potential: filteredEntries.reduce((s, e) => s + (e.potential || 0), 0),
        quality: filteredEntries.reduce((s, e) => s + (e.quality || 0), 0),
        booked: filteredEntries.reduce((s, e) => s + (e.booked || 0), 0),
        arrived: filteredEntries.reduce((s, e) => s + (e.arrived || 0), 0),
        closed: filteredEntries.reduce((s, e) => s + (e.closed || 0), 0),
        bill: filteredEntries.reduce((s, e) => s + (e.bill || 0), 0),
        budgetTarget: filteredEntries.reduce((s, e) => s + (e.budgetTarget || 0), 0),
        budgetActual: filteredEntries.reduce((s, e) => s + (e.budgetActual || 0), 0),
    }), [filteredEntries]);

    /* ── Form State ── */
    const [newRow, setNewRow] = useState({
        channel: '', campaignId: '', totalLead: 0, spam: 0, potential: 0, quality: 0,
        booked: 0, arrived: 0, closed: 0, bill: 0, budgetTarget: 0, budgetActual: 0,
    });

    const filteredCampaignsForAdd = useMemo(() => {
        if (!newRow.channel) return companyCampaigns;
        return companyCampaigns.filter(c => c.channel === newRow.channel);
    }, [companyCampaigns, newRow.channel]);

    const resetForm = () => {
        setNewRow({ channel: '', campaignId: '', totalLead: 0, spam: 0, potential: 0, quality: 0, booked: 0, arrived: 0, closed: 0, bill: 0, budgetTarget: 0, budgetActual: 0 });
        setEditingId(null);
        setShowAddRow(false);
    };

    const handleEditEntry = useCallback((entry: LeadEntry) => {
        setEditingId(entry.id);
        setNewRow({
            channel: entry.channel, campaignId: String(entry.campaignId),
            totalLead: entry.totalLead, spam: entry.spam, potential: entry.potential,
            quality: entry.quality, booked: entry.booked, arrived: entry.arrived,
            closed: entry.closed, bill: entry.bill, budgetTarget: entry.budgetTarget,
            budgetActual: entry.budgetActual,
        });
        setShowAddRow(true);
    }, []);

    const handleSave = useCallback(() => {
        const campaign = companyCampaigns.find(c => c.id === newRow.campaignId);
        if (!campaign) return;
        if (editingId) {
            setEntries(prev => prev.map(e => e.id === editingId ? {
                ...e,
                channel: newRow.channel || campaign.channel,
                campaignId: parseInt(newRow.campaignId) || 0,
                campaignName: campaign.name,
                totalLead: newRow.totalLead,
                spam: newRow.spam,
                potential: newRow.potential,
                quality: newRow.quality,
                booked: newRow.booked,
                arrived: newRow.arrived,
                closed: newRow.closed,
                bill: newRow.bill,
                budgetTarget: newRow.budgetTarget,
                budgetActual: newRow.budgetActual,
            } : e));
        } else {
            const now = new Date();
            const entry: LeadEntry = {
                id: `e${Date.now()}`, companyId: activeCompanyId,
                date: now.toISOString().split('T')[0],
                month: `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
                campaignId: parseInt(newRow.campaignId) || 0,
                campaignName: campaign.name, channel: newRow.channel || campaign.channel,
                totalLead: newRow.totalLead, spam: newRow.spam, potential: newRow.potential,
                quality: newRow.quality, booked: newRow.booked, arrived: newRow.arrived,
                closed: newRow.closed, bill: newRow.bill,
                budgetTarget: newRow.budgetTarget, budgetActual: newRow.budgetActual,
                enteredBy: 'Staff',
            };
            setEntries(prev => [entry, ...prev]);
        }
        resetForm();
    }, [newRow, companyCampaigns, editingId, activeCompanyId]);

    /* ── CSV Upload ── */
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success'>('idle');

    const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return;
            const newEntries: LeadEntry[] = [];
            let idx = Date.now();
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
                if (cols.length < 10) continue;
                newEntries.push({
                    id: `csv${idx++}`, companyId: activeCompanyId,
                    date: cols[0] || '', month: cols[1] || '',
                    campaignId: parseInt(cols[2]) || 0, campaignName: cols[3] || '',
                    channel: cols[4] || '', totalLead: parseInt(cols[5]) || 0,
                    spam: parseInt(cols[6]) || 0, potential: parseInt(cols[7]) || 0,
                    quality: parseInt(cols[8]) || 0, booked: parseInt(cols[9]) || 0,
                    arrived: parseInt(cols[10]) || 0, closed: parseInt(cols[11]) || 0,
                    bill: parseInt(cols[12]) || 0, budgetTarget: parseInt(cols[13]) || 0,
                    budgetActual: parseInt(cols[14]) || 0, enteredBy: 'CSV Import',
                });
            }
            if (newEntries.length > 0) {
                setEntries(prev => [...newEntries, ...prev]);
                setUploadStatus('success');
                setTimeout(() => setUploadStatus('idle'), 3000);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [activeCompanyId]);

    return (
        <div className="page-content">
            {/* ═══ Header ═══ */}
            <div className="san-page-header">
                <div>
                    <h1 className="san-page-title">Nhập liệu</h1>
                    <p className="san-page-subtitle">Nhập số liệu leads hàng ngày</p>
                </div>
                <div className="san-actions">
                    <button onClick={() => setShowAddRow(true)} className="glass-panel san-action-btn">
                        ＋ Thêm dòng
                    </button>
                    <label className="glass-panel san-action-btn outline">
                        ⤒ Import CSV
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} hidden />
                    </label>
                </div>
            </div>

            {/* ═══ Company Selector Cards ═══ */}
            <div className="san-company-grid">
                {[
                    { id: 'all', shortName: '∑', name: 'Tổng công ty', color: '#6B6F76',
                      campaigns: Object.values(companySummary).reduce((s, v) => s + (v?.campaigns || 0), 0),
                      leads: Object.values(companySummary).reduce((s, v) => s + (v?.leads || 0), 0) },
                    ...COMPANIES.map(co => ({
                      id: co.id, shortName: co.shortName[0], name: co.shortName, color: co.color,
                      campaigns: companySummary[co.id]?.campaigns ?? 0,
                      leads: companySummary[co.id]?.leads ?? 0 })),
                ].map(card => {
                    const isActive = activeCompanyId === card.id;
                    return (
                        <div key={card.id}
                            className={`glass-panel san-company-card ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveCompanyId(card.id)}
                            style={{ borderTop: `3px solid ${card.color}`, outline: isActive ? `2px solid ${card.color}` : 'none', outlineOffset: -1 }}
                        >
                            <div className="san-company-card-header">
                                <div className="san-company-avatar" style={{ background: card.color }}>{card.shortName}</div>
                                <span className="san-company-name">{card.name}</span>
                                {isActive && <span className="san-company-badge" style={{ background: card.color }}>Đang chọn</span>}
                            </div>
                            <div className="san-company-stats">
                                <div>
                                    <div className="san-company-stat-label">Chiến dịch</div>
                                    <div className="san-company-stat-value">{card.campaigns || '—'}</div>
                                </div>
                                <div>
                                    <div className="san-company-stat-label">Leads</div>
                                    <div className="san-company-stat-value">{card.leads > 0 ? card.leads.toLocaleString('vi-VN') : '—'}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Upload toast */}
            {uploadStatus === 'success' && (
                <div className="glass-panel san-toast">✓ Import CSV thành công!</div>
            )}

            {/* ═══ Filters ═══ */}
            <div className="san-filters">
                <div className="san-filter-group">
                    {TIME_OPTIONS.map(t => (
                        <button key={t.value} onClick={() => setTimeRange(t.value)}
                            className={`san-filter-btn ${timeRange === t.value ? 'active' : ''}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="san-filter-divider" />
                <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="san-select">
                    <option value="all">Tất cả kênh</option>
                    {channels.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                </select>
                <span className="san-filter-count">{filteredEntries.length} dòng</span>
            </div>

            {/* ═══ Data Table ═══ */}
            {loading ? (
                <div className="san-loading">Đang tải...</div>
            ) : (
                <div className="glass-panel san-table-wrap">
                    <table className="san-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-surface)' }}>
                                <th className="sticky-col" style={{ left: 0, minWidth: 80 }}>NGÀY</th>
                                <th className="sticky-col" style={{ left: 80, minWidth: 90 }}>KÊNH</th>
                                <th className="sticky-col col-border" style={{ left: 170, minWidth: 180 }}>CHIẾN DỊCH</th>
                                <th className="center highlight-accent">TỔNG</th>
                                <th className="center">SPAM</th>
                                <th className="center">TIỀM NĂNG</th>
                                <th className="center">CHẤT LƯỢNG</th>
                                <th className="center">ĐẶT HẸN</th>
                                <th className="center">ĐẾN PK</th>
                                <th className="center highlight-green">CHỐT</th>
                                <th className="center">BILL</th>
                                <th className="right">NS MỤC TIÊU</th>
                                <th className="right">NS THỰC TẾ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} onClick={() => handleEditEntry(entry)}>
                                    <td className="sticky-col" style={{ left: 0, minWidth: 80, color: 'var(--text-muted)' }}>
                                        {new Date(entry.date).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="sticky-col" style={{ left: 80, minWidth: 90 }}>
                                        <span style={{ color: CHANNEL_COLORS[entry.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[entry.channel] || entry.channel}
                                    </td>
                                    <td className="sticky-col col-border" style={{ left: 170, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 180 }}>{entry.campaignName}</td>
                                    <td className="center highlight-accent">{entry.totalLead}</td>
                                    <td className={`center ${entry.spam > 0 ? 'highlight-red' : ''}`}>{entry.spam}</td>
                                    <td className="center">{entry.potential}</td>
                                    <td className="center">{entry.quality}</td>
                                    <td className="center">{entry.booked}</td>
                                    <td className="center">{entry.arrived}</td>
                                    <td className="center highlight-green">{entry.closed}</td>
                                    <td className="center">{entry.bill}</td>
                                    <td className="right">{entry.budgetTarget > 0 ? formatVND(entry.budgetTarget) : '—'}</td>
                                    <td className="right">{entry.budgetActual > 0 ? formatVND(entry.budgetActual) : '—'}</td>
                                </tr>
                            ))}
                            {filteredEntries.length > 0 && (
                                <tr className="total-row">
                                    <td className="sticky-col" style={{ left: 0, minWidth: 80 }}>TỔNG</td>
                                    <td className="sticky-col" style={{ left: 80, minWidth: 90 }}></td>
                                    <td className="sticky-col col-border" style={{ left: 170, minWidth: 180 }}></td>
                                    <td className="center highlight-accent">{totals.totalLead}</td>
                                    <td className="center highlight-red">{totals.spam}</td>
                                    <td className="center">{totals.potential}</td>
                                    <td className="center">{totals.quality}</td>
                                    <td className="center">{totals.booked}</td>
                                    <td className="center">{totals.arrived}</td>
                                    <td className="center highlight-green">{totals.closed}</td>
                                    <td className="center">{totals.bill}</td>
                                    <td className="right">{totals.budgetTarget > 0 ? formatVND(totals.budgetTarget) : '—'}</td>
                                    <td className="right">{totals.budgetActual > 0 ? formatVND(totals.budgetActual) : '—'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredEntries.length === 0 && !loading && (
                <div className="glass-panel san-empty">
                    <div className="san-empty-icon">📄</div>
                    <p className="san-empty-title">Chưa có dữ liệu</p>
                    <p className="san-empty-desc">Nhấn "Thêm dòng" hoặc "Import CSV" để bắt đầu nhập liệu</p>
                </div>
            )}

            {/* ═══ Add/Edit Entry Modal ═══ */}
            {showAddRow && (() => {
                const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
                const today = new Date();
                const dateDisplay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

                return (
                    <div className="san-modal-overlay" onClick={resetForm}>
                        <div className="glass-panel san-modal" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="san-modal-header" style={{ background: `${activeCompany?.color || '#6B7280'}15`, borderBottomColor: activeCompany?.color || '#6B7280' }}>
                                <div className="san-modal-header-info">
                                    <div className="san-modal-avatar" style={{ background: activeCompany?.color || '#6B7280' }}>{activeCompany?.shortName[0] || '?'}</div>
                                    <div>
                                        <div className="san-modal-title">{editingEntry ? 'Chỉnh sửa' : (activeCompany?.name || 'Công ty')}</div>
                                        <div className="san-modal-subtitle">{editingEntry ? editingEntry.campaignName : `Nhập số liệu — ${dateDisplay}`}</div>
                                    </div>
                                </div>
                                <button onClick={resetForm} className="san-modal-close">✕</button>
                            </div>

                            {/* Form Body */}
                            <div className="san-modal-body">
                                <div className="san-form-grid cols-2">
                                    <div>
                                        <label className="san-form-label">Kênh</label>
                                        <select value={newRow.channel} onChange={e => setNewRow(p => ({ ...p, channel: e.target.value, campaignId: '' }))}
                                            className="san-form-input">
                                            <option value="">Chọn kênh...</option>
                                            {channels.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="san-form-label">Chiến dịch</label>
                                        <select value={newRow.campaignId} onChange={e => setNewRow(p => ({ ...p, campaignId: e.target.value }))}
                                            className="san-form-input">
                                            <option value="">Chọn chiến dịch...</option>
                                            {filteredCampaignsForAdd.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <hr className="san-form-divider" />

                                <h3 className="san-form-section-title">Số liệu Leads</h3>
                                <div className="san-form-grid cols-4">
                                    {([
                                        { key: 'potential' as const, label: 'Tiềm năng' },
                                        { key: 'quality' as const, label: 'Chất lượng' },
                                        { key: 'booked' as const, label: 'Đặt hẹn' },
                                        { key: 'arrived' as const, label: 'Đến PK' },
                                        { key: 'closed' as const, label: 'Chốt', color: 'var(--green)' },
                                        { key: 'bill' as const, label: 'Bill' },
                                        { key: 'totalLead' as const, label: 'Tổng', color: 'var(--accent)' },
                                        { key: 'spam' as const, label: 'Spam', color: 'var(--red)' },
                                    ]).map(f => (
                                        <div key={f.key}>
                                            <label className="san-form-label" style={f.color ? { color: f.color } : undefined}>{f.label}</label>
                                            <input type="number" min={0} value={newRow[f.key] || ''}
                                                onChange={e => setNewRow(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                                                className="san-form-input" style={{ textAlign: 'center' }} />
                                        </div>
                                    ))}
                                </div>

                                <hr className="san-form-divider" />

                                <h3 className="san-form-section-title">Ngân sách</h3>
                                <div className="san-form-grid cols-2">
                                    <div>
                                        <label className="san-form-label">NS Mục tiêu</label>
                                        <input type="number" min={0} value={newRow.budgetTarget || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetTarget: parseInt(e.target.value) || 0 }))}
                                            className="san-form-input" />
                                    </div>
                                    <div>
                                        <label className="san-form-label">NS Thực tế</label>
                                        <input type="number" min={0} value={newRow.budgetActual || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetActual: parseInt(e.target.value) || 0 }))}
                                            className="san-form-input" />
                                    </div>
                                </div>

                                <div className="san-form-actions">
                                    <button onClick={resetForm} className="btn btn-secondary">Hủy</button>
                                    <button onClick={handleSave} disabled={!newRow.campaignId} className="btn btn-primary">
                                        ✓ {editingEntry ? 'Cập nhật' : 'Lưu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
