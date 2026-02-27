import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    fetchMarketingData,
    getDateRange,
    getPrevRange,
    numOrZero,
    formatVND,
    COMPANIES,
    COMPANY_LOGOS,
    CHANNEL_LABELS,
    CHANNEL_COLORS,
    type MarketingResponse,
    type DailyPoint,
    type TimeRange,
} from '../lib/san-marketing-api';

/* ══════ Time Filter ══════ */
const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: '3m', label: '3 tháng' },
];

/* ══════ Sparkline SVG ══════ */
interface AxisLabel { label: string; position: number; }

function getXAxisLabels(series: { date: string }[]): AxisLabel[] {
    if (series.length === 0) return [];
    const len = series.length;
    return series.map((d, i) => ({
        label: d.date,
        position: len === 1 ? 0.5 : i / (len - 1),
    }));
}

function Sparkline({
    data, labels, width = 360, height = 80, color = '#C47035', fillOpacity = 0.18,
    formatValue,
}: {
    data: number[]; labels: AxisLabel[]; width?: number; height?: number;
    color?: string; fillOpacity?: number; formatValue?: (v: number) => string;
}) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    if (data.length < 2) return null;
    const max = Math.max(...data); const min = Math.min(...data);
    const range = max - min || 1;
    const padX = 4; const padTop = 14; const axisHeight = 18;
    const chartH = height - padTop - axisHeight; const chartW = width - padX * 2;

    const points = data.map((v, i) => ({
        x: padX + (i / (data.length - 1)) * chartW,
        y: padTop + chartH - ((v - min) / range) * chartH, value: v,
    }));
    const linePath = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`;
    const fillPath = `${linePath} L${padX + chartW},${padTop + chartH} L${padX},${padTop + chartH} Z`;
    const gradId = `grad-${color.replace('#', '')}-${width}`;
    const fmtVal = formatValue || ((v: number) => v.toLocaleString('vi-VN'));

    return (
        <svg width="100%" height={height + 12} viewBox={`0 0 ${width} ${height + 12}`}
            preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}
            onMouseLeave={() => setHoverIdx(null)}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 2.5} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r={10} fill="transparent" onMouseEnter={() => setHoverIdx(i)} style={{ cursor: 'crosshair' }} />
                    {hoverIdx === i && <>
                        <circle cx={p.x} cy={p.y} r={4} fill="white" stroke={color} strokeWidth={2} />
                        <line x1={p.x} y1={padTop} x2={p.x} y2={padTop + chartH} stroke={color} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.4} />
                    </>}
                </g>
            ))}
            {hoverIdx !== null && (() => {
                const p = points[hoverIdx];
                return (
                    <g>
                        <rect x={p.x - 42} y={p.y - 26} width={84} height={20} rx={4} fill="var(--text-primary, #1F2937)" opacity={0.9} />
                        <text x={p.x} y={p.y - 13} textAnchor="middle" fill="white" fontSize={9} fontWeight={600} fontFamily="inherit">{fmtVal(p.value)}</text>
                    </g>
                );
            })()}
            {labels.map((l, i) => (
                <text key={i} x={padX + l.position * chartW} y={height - 2} textAnchor="middle"
                    fill="var(--text-muted, #9CA3AF)" fontSize={10} fontFamily="inherit">{l.label}</text>
            ))}
        </svg>
    );
}

/* ══════ Trend Badge ══════ */
function TrendBadge({ value, suffix }: { value: number; suffix?: string }) {
    if (value === 0) return null;
    const isUp = value > 0;
    const color = isUp ? 'var(--green, #10B981)' : 'var(--red, #EF4444)';
    return (
        <span style={{ color, fontSize: 'var(--text-sm)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
            <span>{isUp ? '↑' : '↓'}</span>
            {isUp ? '+' : ''}{value.toFixed(1)}%{suffix ? ` ${suffix}` : ''}
        </span>
    );
}

/* ══════ Chart Card (35/65 layout) ══════ */
function ChartCard({ title, icon, value, delta, data, labels, color, periodLabel, formatValue }: {
    title: string; icon: React.ReactNode; value: string; delta: number;
    data: number[]; labels: AxisLabel[]; color: string; periodLabel: string;
    formatValue?: (v: number) => string;
}) {
    return (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'stretch', minHeight: 100 }}>
            <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    {icon} {title}
                </div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.3rem' }}>{value}</div>
                <TrendBadge value={delta} suffix={`vs ${periodLabel} trước`} />
            </div>
            <div style={{ flex: '1 1 65%', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <Sparkline data={data} labels={labels} width={360} height={80} color={color} formatValue={formatValue} />
            </div>
        </div>
    );
}

/* ══════ Helper: month label ══════ */
function toMonthLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `T${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */

export function SanOverview() {
    const [timeRange, setTimeRange] = useState<TimeRange>('3m');
    const [activeCard, setActiveCard] = useState('all');
    const [data, setData] = useState<MarketingResponse | null>(null);
    const [prevData, setPrevData] = useState<MarketingResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const { start, end } = getDateRange(timeRange);
        // Also fetch previous period for delta calculation
        const prevRange = getPrevRange(timeRange);
        Promise.all([
            fetchMarketingData(start, end),
            fetchMarketingData(prevRange.start, prevRange.end).catch(() => null),
        ])
            .then(([curr, prev]) => { setData(curr); setPrevData(prev); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [timeRange]);

    const periodLabel = timeRange === 'this_month' ? 'Tháng này' : timeRange === 'last_month' ? 'Tháng trước' : '3 tháng';

    /* ── Selector Cards ── */
    const selectorCards = useMemo(() => {
        if (!data?.summary) return [];
        const ms = data.masterStatus || [];
        const allLeads = data.summary.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0);
        const allSpend = data.summary.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0);
        const allQuality = data.summary.reduce((s, r) => s + numOrZero(r._sum.quality), 0);
        const allActive = ms.filter(m => m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
        const allTotal = ms.reduce((s, m) => s + m._count, 0);

        // Calculate deltas from previous period
        const prevAllLeads = prevData?.summary?.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0) || 0;
        const prevAllSpend = prevData?.summary?.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0) || 0;
        const pctDelta = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev * 100) : 0;

        const cards = [
            {
                id: 'all', label: 'Tổng công ty', color: '#6B6F76', initial: '∑',
                leads: allLeads, spend: allSpend, quality: allQuality,
                cpl: allLeads > 0 ? allSpend / allLeads : 0,
                active: allActive, total: allTotal,
                delta: { leads: pctDelta(allLeads, prevAllLeads), spend: pctDelta(allSpend, prevAllSpend) },
            },
        ];

        for (const co of COMPANIES) {
            const row = data.summary.find(s => s.companyId === co.id);
            const leads = numOrZero(row?._sum.totalLead);
            const spend = numOrZero(row?._sum.budgetActual);
            const coActive = ms.filter(m => m.companyId === co.id && m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
            const coTotal = ms.filter(m => m.companyId === co.id).reduce((s, m) => s + m._count, 0);
            const prevRow = prevData?.summary?.find(s => s.companyId === co.id);
            const prevLeads = numOrZero(prevRow?._sum.totalLead);
            const prevSpend = numOrZero(prevRow?._sum.budgetActual);
            cards.push({
                id: co.id, label: co.name, color: co.color, initial: co.shortName[0],
                leads, spend, quality: numOrZero(row?._sum.quality),
                cpl: leads > 0 ? spend / leads : 0,
                active: coActive, total: coTotal,
                delta: { leads: pctDelta(leads, prevLeads), spend: pctDelta(spend, prevSpend) },
            });
        }
        return cards;
    }, [data, prevData]);

    /* ── Monthly series ── */
    const dailySeries = useMemo(() => {
        if (!data?.daily) return [];
        const filtered = activeCard === 'all' ? data.daily : data.daily.filter(d => d.companyId === activeCard);
        const byMonth = new Map<string, { leads: number; spend: number; quality: number }>();
        for (const d of filtered) {
            const key = toMonthLabel(d.date);
            const ex = byMonth.get(key) || { leads: 0, spend: 0, quality: 0 };
            ex.leads += numOrZero(d._sum.totalLead);
            ex.spend += numOrZero(d._sum.budgetActual);
            ex.quality += numOrZero(d._sum.quality);
            byMonth.set(key, ex);
        }
        return Array.from(byMonth.entries())
            .sort(([a], [b]) => {
                const [mA, yA] = a.replace('T', '').split('/').map(Number);
                const [mB, yB] = b.replace('T', '').split('/').map(Number);
                return yA !== yB ? yA - yB : mA - mB;
            })
            .map(([month, v]) => ({ date: month, ...v }));
    }, [data, activeCard]);

    const xAxisLabels = useMemo(() => getXAxisLabels(dailySeries), [dailySeries]);
    const activeData = selectorCards.find(c => c.id === activeCard) || selectorCards[0];
    const avgCPL = activeData?.cpl || 0;
    const activeLabel = activeCard === 'all' ? 'Tất cả công ty' : COMPANIES.find(c => c.id === activeCard)?.name || '';

    /* ── Channel breakdown ── */
    const channelBreakdown = useMemo(() => {
        if (!data?.channels) return [];
        const filtered = activeCard === 'all' ? data.channels : data.channels.filter(c => c.companyId === activeCard);
        const byChannel = new Map<string, { channel: string; leads: number; quality: number; spend: number }>();
        for (const ch of filtered) {
            const ex = byChannel.get(ch.channel) || { channel: ch.channel, leads: 0, quality: 0, spend: 0 };
            ex.leads += numOrZero(ch._sum.totalLead);
            ex.quality += numOrZero(ch._sum.quality);
            ex.spend += numOrZero(ch._sum.budgetActual);
            byChannel.set(ch.channel, ex);
        }
        return Array.from(byChannel.values()).sort((a, b) => b.leads - a.leads);
    }, [data, activeCard]);

    /* ── Table sort ── */
    const [sortKey, setSortKey] = useState<'leads' | 'quality' | 'spend' | 'cpl'>('leads');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const handleSort = useCallback((key: typeof sortKey) => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    }, [sortKey]);

    const sortedChannels = useMemo(() => {
        return [...channelBreakdown].sort((a, b) => {
            let va: number, vb: number;
            if (sortKey === 'cpl') {
                va = a.leads > 0 ? a.spend / a.leads : 0;
                vb = b.leads > 0 ? b.spend / b.leads : 0;
            } else { va = a[sortKey]; vb = b[sortKey]; }
            return sortDir === 'desc' ? vb - va : va - vb;
        });
    }, [channelBreakdown, sortKey, sortDir]);

    const channelTotals = useMemo(() => ({
        leads: channelBreakdown.reduce((s, c) => s + c.leads, 0),
        quality: channelBreakdown.reduce((s, c) => s + c.quality, 0),
        spend: channelBreakdown.reduce((s, c) => s + c.spend, 0),
    }), [channelBreakdown]);

    const maxLeads = Math.max(...channelBreakdown.map(c => c.leads), 1);

    return (
        <div className="page-content">
            {/* ═══ Header ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 'var(--text-2xl)' }}>Tổng quan</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>{activeLabel}</p>
                </div>
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
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
            ) : (
                <>
                    {/* ═══ 4 Selector Cards ═══ */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        {selectorCards.map(card => {
                            const isActive = activeCard === card.id;
                            return (
                                <div key={card.id} onClick={() => setActiveCard(card.id)} className="glass-panel" style={{
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
                                    {/* Name + badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        {COMPANY_LOGOS[card.id] ? (
                                            <img src={COMPANY_LOGOS[card.id]} alt={card.label}
                                                style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'contain', background: 'white', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <div style={{ width: 26, height: 26, borderRadius: 6, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                                                {card.initial}
                                            </div>
                                        )}
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', flex: 1 }}>{card.label}</span>
                                        {isActive && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, background: card.color, color: 'white', padding: '0.15rem 0.5rem', borderRadius: 9999 }}>Đang chọn</span>}
                                    </div>
                                    {/* 2×2 metrics grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.25rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{card.leads.toLocaleString('vi-VN')}</div>
                            <TrendBadge value={card.delta.leads} />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chi tiêu</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{formatVND(card.spend)}</div>
                                        </div>
                            <TrendBadge value={card.delta.spend} />
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CPL</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{card.cpl > 0 ? formatVND(card.cpl) : '—'}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chiến dịch</div>
                                            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{card.active}<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>/{card.total}</span></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ═══ Sparkline Chart Row ═══ */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ChartCard title="Tổng Leads" icon={<span>◎</span>} value={activeData?.leads.toLocaleString('vi-VN') || '0'}
                            delta={activeData?.delta.leads || 0} data={dailySeries.map(d => d.leads)} labels={xAxisLabels}
                            color="#C47035" periodLabel={periodLabel} />
                        <ChartCard title="Tổng chi tiêu" icon={<span>₫</span>} value={formatVND(activeData?.spend || 0)}
                            delta={activeData?.delta.spend || 0} data={dailySeries.map(d => d.spend)} labels={xAxisLabels}
                            color="#3B82F6" periodLabel={periodLabel} formatValue={formatVND} />
                        <ChartCard title="CPL trung bình" icon={<span>≈</span>} value={avgCPL > 0 ? formatVND(avgCPL) : '—'}
                            delta={activeData?.delta.leads !== 0 ? -(activeData?.delta.leads || 0) * 0.4 : 0} data={dailySeries.map(d => d.spend > 0 && d.leads > 0 ? d.spend / d.leads : 0)} labels={xAxisLabels}
                            color="#8B5CF6" periodLabel={periodLabel} formatValue={formatVND} />
                    </div>

                    {/* ═══ Top Channel Bar Chart ═══ */}
                    {(() => {
                        const top5 = [...channelBreakdown].sort((a, b) => b.leads - a.leads).slice(0, 5);
                        const barMax = Math.max(...top5.map(c => c.leads), 1);
                        return (
                            <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>Top kênh theo leads</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {top5.map(ch => (
                                        <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: 80, fontSize: 'var(--text-xs)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
                                                <span style={{ color: CHANNEL_COLORS[ch.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[ch.channel] || ch.channel}
                                            </span>
                                            <div style={{ flex: 1, height: 14, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${(ch.leads / barMax) * 100}%`, height: '100%', background: CHANNEL_COLORS[ch.channel] || '#6B7280', opacity: 0.6, borderRadius: 4, transition: 'width 0.3s ease' }} />
                                            </div>
                                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, width: 40, textAlign: 'right', flexShrink: 0 }}>{ch.leads}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ═══ Channel Performance Table (Sortable) ═══ */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: '1rem' }}>
                            Hiệu suất theo kênh
                            <span style={{ fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                ({periodLabel} — {activeLabel})
                            </span>
                        </h2>
                        <div className="glass-panel" style={{ overflow: 'auto', padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-surface)' }}>
                                        <th style={thStyle}>KÊNH</th>
                                        {([['leads', 'LEADS'], ['quality', 'CHẤT LƯỢNG'], ['spend', 'CHI TIÊU'], ['cpl', 'CPL']] as const).map(([key, label]) => (
                                            <th key={key} onClick={() => handleSort(key)} style={{ ...thStyle, textAlign: key === 'spend' || key === 'cpl' ? 'right' : 'center', cursor: 'pointer', userSelect: 'none', ...(key === 'leads' ? { fontWeight: 700, color: 'var(--accent)' } : {}) }}>
                                                {label}{sortKey === key && <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedChannels.map(ch => (
                                        <tr key={ch.channel} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ ...tdStyle, fontWeight: 500 }}>
                                                <span style={{ color: CHANNEL_COLORS[ch.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[ch.channel] || ch.channel}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{ch.leads.toLocaleString('vi-VN')}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{ch.quality > 0 ? ch.quality.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>{ch.spend > 0 ? formatVND(ch.spend) : '—'}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{ch.spend > 0 && ch.leads > 0 ? formatVND(ch.spend / ch.leads) : '—'}</td>
                                        </tr>
                                    ))}
                                    {sortedChannels.length > 1 && (
                                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                                            <td style={tdStyle}>Tổng</td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{channelTotals.leads.toLocaleString('vi-VN')}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{channelTotals.quality.toLocaleString('vi-VN')}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>{formatVND(channelTotals.spend)}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>{channelTotals.spend > 0 && channelTotals.leads > 0 ? formatVND(channelTotals.spend / channelTotals.leads) : '—'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
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
