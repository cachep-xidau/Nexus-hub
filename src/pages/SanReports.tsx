import { useState, useMemo, useEffect } from 'react';
import {
    fetchMarketingData,
    getDateRange,
    numOrZero,
    formatVND,
    COMPANIES,
    CHANNEL_LABELS,
    CHANNEL_COLORS,
    type MarketingResponse,
    type CampaignRow,
    type TimeRange,
} from '../lib/san-marketing-api';

/* ── Funnel Stages ── */
const FUNNEL_STAGES = [
    { key: 'totalLead', label: 'Lead', color: 'var(--accent, #6366F1)' },
    { key: 'potential', label: 'Tiềm năng', color: '#3B82F6' },
    { key: 'quality', label: 'Chất lượng', color: '#6366F1' },
    { key: 'booked', label: 'Đặt hẹn', color: '#8B5CF6' },
    { key: 'arrived', label: 'Đến PK', color: '#A855F7' },
    { key: 'closed', label: 'Chốt', color: 'var(--green, #10B981)' },
    { key: 'bill', label: 'Bill', color: '#F59E0B' },
] as const;

/* ── Time Options ── */
const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: '3m', label: '3 tháng' },
];

/* ── Helpers ── */
interface ReportRow {
    id: string; channel: string; campaignName: string;
    totalLead: number; spam: number; potential: number; quality: number;
    booked: number; arrived: number; closed: number; bill: number; budgetActual: number;
}

function companyTotals(rows: ReportRow[]) {
    return {
        totalLead: rows.reduce((s, r) => s + r.totalLead, 0),
        spam: rows.reduce((s, r) => s + r.spam, 0),
        potential: rows.reduce((s, r) => s + r.potential, 0),
        quality: rows.reduce((s, r) => s + r.quality, 0),
        booked: rows.reduce((s, r) => s + r.booked, 0),
        arrived: rows.reduce((s, r) => s + r.arrived, 0),
        closed: rows.reduce((s, r) => s + r.closed, 0),
        bill: rows.reduce((s, r) => s + r.bill, 0),
        budgetActual: rows.reduce((s, r) => s + r.budgetActual, 0),
    };
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export function SanReports() {
    const [activeCompanyId, setActiveCompanyId] = useState('all');
    const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
    const [filterChannel, setFilterChannel] = useState('all');
    const [apiData, setApiData] = useState<MarketingResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const { start, end } = getDateRange(timeRange);
        fetchMarketingData(start, end)
            .then(setApiData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [timeRange]);

    /* ── Transform API → ReportRow ── */
    const allReports = useMemo(() => {
        if (!apiData?.campaigns) return {} as Record<string, ReportRow[]>;
        const map: Record<string, ReportRow[]> = {};
        for (const co of COMPANIES) {
            map[co.id] = apiData.campaigns
                .filter(c => c.companyId === co.id)
                .map((c, i) => ({
                    id: `${co.id}-${i}`, channel: c.channel, campaignName: c.campaignName,
                    totalLead: numOrZero(c._sum.totalLead), spam: numOrZero(c._sum.spam),
                    potential: numOrZero(c._sum.potential), quality: numOrZero(c._sum.quality),
                    booked: numOrZero(c._sum.booked), arrived: numOrZero(c._sum.arrived),
                    closed: numOrZero(c._sum.closed), bill: numOrZero(c._sum.bill),
                    budgetActual: numOrZero(c._sum.budgetActual),
                }));
        }
        return map;
    }, [apiData]);

    const allCompanyRows = useMemo(() => COMPANIES.flatMap(co => allReports[co.id] || []), [allReports]);

    const currentRows = useMemo(() => {
        let rows = activeCompanyId === 'all' ? allCompanyRows : (allReports[activeCompanyId] || []);
        if (filterChannel !== 'all') rows = rows.filter(r => r.channel === filterChannel);
        return rows;
    }, [allReports, allCompanyRows, activeCompanyId, filterChannel]);

    const companyChannels = useMemo(() => {
        const base = activeCompanyId === 'all' ? allCompanyRows : (allReports[activeCompanyId] || []);
        return Array.from(new Set(base.map(r => r.channel)));
    }, [allReports, allCompanyRows, activeCompanyId]);

    const totals = useMemo(() => companyTotals(currentRows), [currentRows]);

    const activeCompanyObj = activeCompanyId === 'all' ? null : COMPANIES.find(c => c.id === activeCompanyId);
    const activeColor = activeCompanyObj?.color || '#6B6F76';
    const activeLabel = activeCompanyObj?.shortName?.toUpperCase() || 'TỔNG CÔNG TY';

    /* ── Selector Cards ── */
    const selectorCards = useMemo(() => {
        const allTotals = companyTotals(allCompanyRows);
        const allCampaignCount = new Set(allCompanyRows.map(r => r.campaignName)).size;
        return [
            { id: 'all', label: 'Tổng công ty', shortName: '∑', color: '#6B6F76', totals: allTotals, campaigns: allCampaignCount },
            ...COMPANIES.map(co => {
                const coRows = allReports[co.id] || [];
                return { id: co.id, label: co.name, shortName: co.shortName[0], color: co.color, totals: companyTotals(coRows), campaigns: new Set(coRows.map(r => r.campaignName)).size };
            }),
        ];
    }, [allReports, allCompanyRows]);

    return (
        <div className="page-content" >
            {/* ═══ Header ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h1 className="san-page-title">Báo cáo</h1>
                    <p className="san-page-subtitle">Báo cáo tổng hợp hiệu quả chiến dịch</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                    <button className="glass-panel" style={{ padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', border: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        ⤓ Xuất Excel
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="san-loading">Đang tải...</div>
            ) : (
                <>
                    {/* ═══ 4 Company Selector Cards ═══ */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        {selectorCards.map(card => {
                            const isActive = activeCompanyId === card.id;
                            const closeRate = card.totals.totalLead > 0 ? (card.totals.closed / card.totals.totalLead * 100) : 0;
                            return (
                                <div key={card.id} onClick={() => { setActiveCompanyId(card.id); setFilterChannel('all'); }} className="glass-panel" style={{
                                    cursor: 'pointer', borderTop: `3px solid ${card.color}`,
                                    outline: isActive ? `2px solid ${card.color}` : 'none', outlineOffset: -1,
                                    opacity: isActive ? 1 : 0.55, boxShadow: isActive ? 'var(--shadow-card)' : 'none', transition: 'opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                                    padding: '0.875rem 1rem',
                                }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <div style={{ width: 26, height: 26, borderRadius: 6, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 'var(--text-xs)' }}>{card.shortName}</div>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', flex: 1 }}>{card.label}</span>
                                        {isActive && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, background: card.color, color: 'white', padding: '0.15rem 0.5rem', borderRadius: 9999 }}>Đang chọn</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.25rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{card.totals.totalLead.toLocaleString('vi-VN')}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chốt</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--green, #10B981)' }}>{card.totals.closed.toLocaleString('vi-VN')}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tỷ lệ chốt</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: closeRate >= 20 ? 'var(--green, #10B981)' : closeRate >= 10 ? '#F59E0B' : '#EF4444' }}>
                                                {closeRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chiến dịch</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{card.campaigns}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ═══ Funnel Visualization ═══ */}
                    <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⬡ Phễu chuyển đổi — {activeLabel}
                        </div>

                        {/* Stage labels + numbers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.75rem' }}>
                            {FUNNEL_STAGES.map((stage, i) => {
                                const val = (totals as Record<string, number>)[stage.key] || 0;
                                const prevKey = i > 0 ? FUNNEL_STAGES[i - 1].key : null;
                                const prevVal = prevKey ? (totals as Record<string, number>)[prevKey] || 0 : 0;
                                const pctStep = i === 0 ? 100 : (prevVal > 0 ? (val / prevVal * 100) : 0);

                                return (
                                    <div key={stage.key} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>{stage.label}</div>
                                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: stage.color, lineHeight: 1.2 }}>
                                            {stage.key === 'bill' ? formatVND(val) : val.toLocaleString('vi-VN')}
                                        </div>
                                        <div style={{ fontSize: 'var(--text-xs)', marginTop: '0.2rem' }}>
                                            {i === 0 ? <span style={{ color: 'var(--text-muted)' }}>100%</span>
                                                : stage.key === 'bill' ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    : <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{pctStep.toFixed(1)}%</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Gradient bar */}
                        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-surface)' }}>
                            {FUNNEL_STAGES.map((stage, i) => {
                                const val = (totals as Record<string, number>)[stage.key] || 0;
                                const widthPct = stage.key === 'bill'
                                    ? (totals.totalLead > 0 ? (totals.closed / totals.totalLead * 100) : 0)
                                    : (totals.totalLead > 0 ? (val / totals.totalLead * 100) : 0);
                                return (
                                    <div key={stage.key} style={{
                                        width: `${Math.max(widthPct, 4)}%`, height: '100%', background: stage.color,
                                        opacity: 1 - i * 0.08, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 'var(--text-xs)', fontWeight: 600, color: 'white', transition: 'width 0.3s ease',
                                        borderRight: i < FUNNEL_STAGES.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                    }}
                                        title={`${stage.label}: ${stage.key === 'bill' ? formatVND(val) : val.toLocaleString('vi-VN')}`}
                                    >
                                        {stage.key !== 'bill' && widthPct >= 8 && val.toLocaleString('vi-VN')}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            <span>◆ <strong>X%</strong> = tỷ lệ chuyển đổi so với bước trước</span>
                        </div>
                    </div>

                    {/* ═══ Channel Filter ═══ */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>▤</span>
                        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{
                            padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                            fontSize: 'var(--text-xs)', fontFamily: 'inherit', cursor: 'pointer', minWidth: 140,
                        }}>
                            <option value="all">Tất cả kênh</option>
                            {companyChannels.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                        </select>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{currentRows.length} chiến dịch</span>
                    </div>

                    {/* ═══ Detail Table (Sticky Columns) ═══ */}
                    <div className="glass-panel" className="san-table-wrap">
                        <table className="san-table">
                            <thead>
                                <tr style={{ background: 'var(--bg-surface)' }}>
                                    <th className="san-th" style={{ position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 3, minWidth: 35 }}>#</th>
                                    <th className="san-th" style={{ position: 'sticky', left: 35, background: 'var(--bg-surface)', zIndex: 3, minWidth: 90 }}>KÊNH</th>
                                    <th className="san-th" style={{ position: 'sticky', left: 125, background: 'var(--bg-surface)', zIndex: 3, minWidth: 180, borderRight: '2px solid var(--border)' }}>CHIẾN DỊCH</th>
                                    <th className="san-th" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>TỔNG LEAD</th>
                                    <th className="san-th" style={{ textAlign: 'center', color: '#EF4444' }}>SPAM</th>
                                    <th className="san-th" style={{ textAlign: 'center' }}>TIỀM NĂNG</th>
                                    <th className="san-th" style={{ textAlign: 'center' }}>CHẤT LƯỢNG</th>
                                    <th className="san-th" style={{ textAlign: 'center' }}>ĐẶT HẸN</th>
                                    <th className="san-th" style={{ textAlign: 'center' }}>ĐẾN PK</th>
                                    <th className="san-th" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--green, #10B981)' }}>CHỐT</th>
                                    <th className="san-th" style={{ textAlign: 'right' }}>BILL</th>
                                    <th className="san-th" style={{ textAlign: 'right' }}>NS THỰC TẾ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRows.map((row, idx) => (
                                    <tr key={row.id + idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="san-td" style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, minWidth: 35, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td className="san-td" style={{ position: 'sticky', left: 35, background: 'var(--bg-card)', zIndex: 2, minWidth: 90 }}>
                                            <span style={{ color: CHANNEL_COLORS[row.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[row.channel] || row.channel}
                                        </td>
                                        <td className="san-td" style={{ position: 'sticky', left: 125, background: 'var(--bg-card)', zIndex: 2, fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 180, borderRight: '2px solid var(--border)' }}>{row.campaignName}</td>
                                        <td className="san-td" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{row.totalLead.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center', color: row.spam > 0 ? '#EF4444' : 'var(--text-muted)' }}>{row.spam.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{row.potential.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{row.quality.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{row.booked.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{row.arrived.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--green, #10B981)' }}>{row.closed.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'right' }}>{row.bill > 0 ? formatVND(row.bill) : '—'}</td>
                                        <td className="san-td" style={{ textAlign: 'right' }}>{row.budgetActual > 0 ? formatVND(row.budgetActual) : '—'}</td>
                                    </tr>
                                ))}
                                {currentRows.length > 0 && (
                                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)', background: activeColor + '12' }}>
                                        <td className="san-td" style={{ position: 'sticky', left: 0, background: activeColor + '12', zIndex: 2, minWidth: 35 }}></td>
                                        <td className="san-td" style={{ position: 'sticky', left: 35, background: activeColor + '12', zIndex: 2, minWidth: 90 }}></td>
                                        <td className="san-td" style={{ position: 'sticky', left: 125, background: activeColor + '12', zIndex: 2, fontWeight: 700, minWidth: 180, borderRight: '2px solid var(--border)' }}>TỔNG {activeLabel}</td>
                                        <td className="san-td" style={{ textAlign: 'center', color: 'var(--accent)' }}>{totals.totalLead.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center', color: '#EF4444' }}>{totals.spam.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{totals.potential.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{totals.quality.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{totals.booked.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center' }}>{totals.arrived.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'center', color: 'var(--green, #10B981)' }}>{totals.closed.toLocaleString('vi-VN')}</td>
                                        <td className="san-td" style={{ textAlign: 'right' }}>{formatVND(totals.bill)}</td>
                                        <td className="san-td" style={{ textAlign: 'right' }}>{formatVND(totals.budgetActual)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}


