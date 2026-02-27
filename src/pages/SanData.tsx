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
    type MarketingResponse,
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
        setLoading(true);
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
        // For now, just update local state (API integration would POST/PATCH here)
        if (editingId) {
            setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...newRow, campaignName: campaign.name, channel: newRow.channel || campaign.channel } : e));
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
        <div className="page-content" >
            {/* ═══ Header ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 'var(--text-2xl)' }}>Nhập liệu</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>Nhập số liệu leads hàng ngày</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <button onClick={() => setShowAddRow(true)} className="glass-panel" style={{
                        padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', border: '1px solid var(--accent)',
                        fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 600, color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        ＋ Thêm dòng
                    </button>
                    <label className="glass-panel" style={{
                        padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', border: '1px solid var(--border)',
                        fontSize: 'var(--text-xs)', fontFamily: 'inherit', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        ⤒ Import CSV
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            </div>

            {/* ═══ Company Selector Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
                        <div key={card.id} className="glass-panel" onClick={() => setActiveCompanyId(card.id)} style={{
                            cursor: 'pointer', borderTop: `3px solid ${card.color}`,
                            outline: isActive ? `2px solid ${card.color}` : 'none', outlineOffset: -1,
                            opacity: isActive ? 1 : 0.55,
                            boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            transition: 'opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                            padding: '0.875rem 1rem',
                        }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: 24, height: 24, borderRadius: 5, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 'var(--text-xs)' }}>{card.shortName}</div>
                                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{card.name}</span>
                                {isActive && <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', background: card.color, color: 'white', padding: '0.15rem 0.5rem', borderRadius: 9999, fontWeight: 600 }}>Đang chọn</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: 'var(--text-sm)' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Chiến dịch</div>
                                    <div style={{ fontWeight: 700 }}>{card.campaigns || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Leads</div>
                                    <div style={{ fontWeight: 700 }}>{card.leads > 0 ? card.leads.toLocaleString('vi-VN') : '—'}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Upload toast */}
            {uploadStatus === 'success' && (
                <div className="glass-panel" style={{ borderLeft: '3px solid var(--green, #10B981)', marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
                    ✓ Import CSV thành công!
                </div>
            )}

            {/* ═══ Filters ═══ */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 'var(--space-1)', border: '1px solid var(--border)' }}>
                    {TIME_OPTIONS.map(t => (
                        <button key={t.value} onClick={() => setTimeRange(t.value)} style={{
                            padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                            fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit',
                            background: timeRange === t.value ? 'var(--accent)' : 'transparent',
                            color: timeRange === t.value ? '#fff' : 'var(--text-secondary)',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.15rem' }} />
                <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{
                    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)', fontFamily: 'inherit', cursor: 'pointer', minWidth: 140,
                }}>
                    <option value="all">Tất cả kênh</option>
                    {channels.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                </select>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{filteredEntries.length} dòng</span>
            </div>

            {/* ═══ Data Table ═══ */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="glass-panel" style={{ overflow: 'auto', padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-surface)' }}>
                                <th style={{ ...thStyle, position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 3, minWidth: 80 }}>NGÀY</th>
                                <th style={{ ...thStyle, position: 'sticky', left: 80, background: 'var(--bg-surface)', zIndex: 3, minWidth: 90 }}>KÊNH</th>
                                <th style={{ ...thStyle, position: 'sticky', left: 170, background: 'var(--bg-surface)', zIndex: 3, minWidth: 180, borderRight: '2px solid var(--border)' }}>CHIẾN DỊCH</th>
                                <th style={{ ...thStyle, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>TỔNG</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>SPAM</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>TIỀM NĂNG</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>CHẤT LƯỢNG</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>ĐẶT HẸN</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>ĐẾN PK</th>
                                <th style={{ ...thStyle, textAlign: 'center', fontWeight: 700, color: 'var(--green, #10B981)' }}>CHỐT</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>BILL</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>NS MỤC TIÊU</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>NS THỰC TẾ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} onClick={() => handleEditEntry(entry)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, minWidth: 80, color: 'var(--text-muted)' }}>
                                        {new Date(entry.date).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 80, background: 'var(--bg-card)', zIndex: 2, minWidth: 90 }}>
                                        <span style={{ color: CHANNEL_COLORS[entry.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[entry.channel] || entry.channel}
                                    </td>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 170, background: 'var(--bg-card)', zIndex: 2, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 180, borderRight: '2px solid var(--border)' }}>{entry.campaignName}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{entry.totalLead}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: entry.spam > 0 ? '#EF4444' : 'var(--text-muted)' }}>{entry.spam}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.potential}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.quality}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.booked}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.arrived}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--green, #10B981)' }}>{entry.closed}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.bill}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{entry.budgetTarget > 0 ? formatVND(entry.budgetTarget) : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{entry.budgetActual > 0 ? formatVND(entry.budgetActual) : '—'}</td>
                                </tr>
                            ))}
                            {filteredEntries.length > 0 && (
                                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)', background: 'var(--bg-surface)' }}>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2, minWidth: 80 }}>TỔNG</td>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 80, background: 'var(--bg-surface)', zIndex: 2, minWidth: 90 }}></td>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 170, background: 'var(--bg-surface)', zIndex: 2, minWidth: 180, borderRight: '2px solid var(--border)' }}></td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--accent)' }}>{totals.totalLead}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: '#EF4444' }}>{totals.spam}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{totals.potential}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{totals.quality}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{totals.booked}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{totals.arrived}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--green, #10B981)' }}>{totals.closed}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{totals.bill}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{totals.budgetTarget > 0 ? formatVND(totals.budgetTarget) : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{totals.budgetActual > 0 ? formatVND(totals.budgetActual) : '—'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredEntries.length === 0 && !loading && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    <div style={{ fontSize: 32, marginBottom: '0.75rem' }}>📄</div>
                    <p style={{ fontWeight: 500 }}>Chưa có dữ liệu</p>
                    <p style={{ fontSize: 'var(--text-xs)' }}>Nhấn "Thêm dòng" hoặc "Import CSV" để bắt đầu nhập liệu</p>
                </div>
            )}

            {/* ═══ Add/Edit Entry Modal ═══ */}
            {showAddRow && (() => {
                const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
                const today = new Date();
                const dateDisplay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={resetForm}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>

                            {/* Modal Header */}
                            <div style={{ background: `${activeCompany?.color || '#6B7280'}15`, borderBottom: `2px solid ${activeCompany?.color || '#6B7280'}`, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: activeCompany?.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 'var(--text-lg)' }}>{activeCompany?.shortName[0] || '?'}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{editingEntry ? 'Chỉnh sửa' : (activeCompany?.name || 'Công ty')}</div>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{editingEntry ? editingEntry.campaignName : `Nhập số liệu — ${dateDisplay}`}</div>
                                    </div>
                                </div>
                                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, fontSize: 18 }}>✕</button>
                            </div>

                            {/* Form Body */}
                            <div style={{ padding: '1.25rem 1.5rem' }}>
                                {/* Campaign info */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Kênh</label>
                                        <select value={newRow.channel} onChange={e => setNewRow(p => ({ ...p, channel: e.target.value, campaignId: '' }))}
                                            style={{ ...inputStyle, width: '100%' }}>
                                            <option value="">Chọn kênh...</option>
                                            {channels.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Chiến dịch</label>
                                        <select value={newRow.campaignId} onChange={e => setNewRow(p => ({ ...p, campaignId: e.target.value }))}
                                            style={{ ...inputStyle, width: '100%' }}>
                                            <option value="">Chọn chiến dịch...</option>
                                            {filteredCampaignsForAdd.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1.25rem' }} />

                                {/* Leads fields */}
                                <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Số liệu Leads</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 0.65rem', marginBottom: '1.25rem' }}>
                                    {([
                                        { key: 'potential' as const, label: 'Tiềm năng' },
                                        { key: 'quality' as const, label: 'Chất lượng' },
                                        { key: 'booked' as const, label: 'Đặt hẹn' },
                                        { key: 'arrived' as const, label: 'Đến PK' },
                                        { key: 'closed' as const, label: 'Chốt', color: 'var(--green, #10B981)' },
                                        { key: 'bill' as const, label: 'Bill' },
                                        { key: 'totalLead' as const, label: 'Tổng', color: 'var(--accent)' },
                                        { key: 'spam' as const, label: 'Spam', color: '#EF4444' },
                                    ]).map(f => (
                                        <div key={f.key}>
                                            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.15rem', display: 'block', color: f.color || 'var(--text-primary)' }}>{f.label}</label>
                                            <input type="number" min={0} value={newRow[f.key] || ''}
                                                onChange={e => setNewRow(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                                                style={{ ...inputStyle, width: '100%', textAlign: 'center' }} />
                                        </div>
                                    ))}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1.25rem' }} />

                                {/* Budget */}
                                <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Ngân sách</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.15rem', display: 'block' }}>NS Mục tiêu</label>
                                        <input type="number" min={0} value={newRow.budgetTarget || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetTarget: parseInt(e.target.value) || 0 }))}
                                            style={{ ...inputStyle, width: '100%' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.15rem', display: 'block' }}>NS Thực tế</label>
                                        <input type="number" min={0} value={newRow.budgetActual || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetActual: parseInt(e.target.value) || 0 }))}
                                            style={{ ...inputStyle, width: '100%' }} />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button onClick={resetForm} className="glass-panel" style={{ flex: 1, justifyContent: 'center', padding: 'var(--space-3)', cursor: 'pointer', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>Hủy</button>
                                    <button onClick={handleSave} disabled={!newRow.campaignId} style={{
                                        flex: 1, justifyContent: 'center', padding: 'var(--space-3)', cursor: newRow.campaignId ? 'pointer' : 'not-allowed',
                                        border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 600,
                                        background: newRow.campaignId ? 'var(--accent)' : 'var(--bg-surface)', color: newRow.campaignId ? '#fff' : 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
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

const thStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem', fontSize: 'var(--text-xs)', fontWeight: 600,
    color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)',
};

const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
};
