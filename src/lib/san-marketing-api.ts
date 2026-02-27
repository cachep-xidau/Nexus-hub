/**
 * SAN Marketing API — fetches data from S Group Marketing Hub
 *
 * Endpoints:
 *   GET /api/marketing?start=YYYY-MM-DD&end=YYYY-MM-DD
 *   GET /api/marketing/entries?companyId=san&start=...&end=...
 */

const API_BASE = 'https://san-marketing-web.vercel.app';

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */

export interface CompanySummary {
    companyId: string;
    _sum: {
        totalLead: number | null;
        spam: number | null;
        potential: number | null;
        quality: number | null;
        booked: number | null;
        arrived: number | null;
        closed: number | null;
        bill: string | null;
        budgetTarget: string | null;
        budgetActual: string | null;
    };
    _count: number;
}

export interface DailyPoint {
    date: string;
    companyId: string;
    _sum: {
        totalLead: number | null;
        spam: number | null;
        potential: number | null;
        quality: number | null;
        booked: number | null;
        arrived: number | null;
        closed: number | null;
        bill: string | null;
        budgetActual: string | null;
    };
}

export interface ChannelBreakdown {
    companyId: string;
    channel: string;
    _sum: {
        totalLead: number | null;
        quality: number | null;
        budgetActual: string | null;
    };
}

export interface CampaignRow {
    companyId: string;
    channel: string;
    campaignName: string;
    _sum: {
        totalLead: number | null;
        spam: number | null;
        potential: number | null;
        quality: number | null;
        booked: number | null;
        arrived: number | null;
        closed: number | null;
        bill: string | null;
        budgetTarget: string | null;
        budgetActual: string | null;
    };
    _count: number;
}

export interface MasterStatus {
    companyId: string;
    status: string;
    _count: number;
}

export interface MarketingResponse {
    summary: CompanySummary[];
    daily: DailyPoint[];
    campaigns: CampaignRow[];
    channels: ChannelBreakdown[];
    masterStatus: MasterStatus[];
    meta: { totalRows: number; dateRange: { start: string; end: string } };
}

export interface EntryRow {
    id: string;
    companyId: string;
    date: string;
    month: string;
    campaignId: number;
    campaignName: string;
    channel: string;
    totalLead: number;
    spam: number;
    potential: number;
    quality: number;
    booked: number;
    arrived: number;
    closed: number;
    bill: number;
    budgetTarget: number;
    budgetActual: number;
}

/* ══════════════════════════════════════════════
   COMPANIES
   ══════════════════════════════════════════════ */

export const COMPANIES = [
    { id: 'san', name: 'San Dentist', shortName: 'San', color: '#6366F1' },
    { id: 'teennie', name: 'Teennie', shortName: 'Teennie', color: '#EC4899' },
    { id: 'tgil', name: 'Thegioiimplant', shortName: 'TGIL', color: '#F59E0B' },
];

export const COMPANY_LOGOS: Record<string, string> = {
    san: '/logos/san-dentist.png',
    teennie: '/logos/teennie.webp',
    tgil: '/logos/thegioiimplant.png',
};

/* ══════════════════════════════════════════════
   CHANNEL LABELS & COLORS
   ══════════════════════════════════════════════ */

export const CHANNEL_LABELS: Record<string, string> = {
    // Normalized IDs
    page_san: 'Page San', page_teennie: 'Page Teennie', page_tgil: 'Page TGIL',
    web: 'Web', zalo_oa: 'Zalo OA', instagram: 'Instagram', tiktok: 'TikTok',
    hotline: 'Hotline', gioi_thieu: 'Giới thiệu', vang_lai: 'Vãng lai',
    doi_tac: 'Đối tác', data_truong: 'Data trường', khac: 'Khác',
    tu_van_lai: 'Tư Vấn Lại',
    FACEBOOK: 'Facebook Ads', TIKTOK: 'TikTok Ads', ZALO: 'Zalo OA/Ads', CRM: 'CRM',
    // Raw DB strings (from Google Sheet import)
    'Page': 'Page San', '2 PAGE TEENNIE': 'Page Teennie', '3 PAGE TGIL': 'Page TGIL',
    'Web': 'Web', 'Zalo OA': 'Zalo OA', 'Instagram': 'Instagram',
    'TikTok': 'TikTok', 'Tiktok': 'TikTok', 'Hotline': 'Hotline',
    'Giới Thiệu': 'Giới thiệu', 'Giới thiệu': 'Giới thiệu',
    'Vãng Lai': 'Vãng lai', 'Vãng lai': 'Vãng lai',
    'Đối Tác': 'Đối tác', 'Đối tác': 'Đối tác',
    'Data Trường': 'Data trường', 'Data trường': 'Data trường',
    'Khác': 'Khác', 'Tư Vấn Lại': 'Tư Vấn Lại',
    'Facebook': 'Facebook', 'Google': 'Google Ads',
};

export const CHANNEL_COLORS: Record<string, string> = {
    page_san: '#1877F2', page_teennie: '#E91E90', page_tgil: '#F59E0B',
    web: '#10B981', zalo_oa: '#0068FF', instagram: '#E1306C', tiktok: '#010101',
    hotline: '#F59E0B', gioi_thieu: '#8B5CF6', vang_lai: '#EC4899',
    doi_tac: '#14B8A6', data_truong: '#F97316', khac: '#6B7280',
    tu_van_lai: '#7C3AED',
    FACEBOOK: '#1877F2', TIKTOK: '#010101', ZALO: '#0068FF', CRM: '#10B981',
    'Page': '#1877F2', '2 PAGE TEENNIE': '#E91E90', '3 PAGE TGIL': '#F59E0B',
    'Web': '#10B981', 'Zalo OA': '#0068FF', 'Instagram': '#E1306C',
    'TikTok': '#010101', 'Tiktok': '#010101', 'Hotline': '#EAB308',
    'Giới Thiệu': '#8B5CF6', 'Giới thiệu': '#8B5CF6',
    'Vãng Lai': '#EC4899', 'Vãng lai': '#EC4899',
    'Đối Tác': '#14B8A6', 'Đối tác': '#14B8A6',
    'Data Trường': '#F97316', 'Data trường': '#F97316',
    'Khác': '#6B7280', 'Tư Vấn Lại': '#7C3AED',
    'Facebook': '#1877F2', 'Google': '#4285F4',
};

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */

export function formatVND(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString('vi-VN');
}

export function numOrZero(v: number | string | null | undefined): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return v;
}

export type TimeRange = 'this_month' | 'last_month' | '3m' | 'custom';

export function getDateRange(range: TimeRange, customStart?: string, customEnd?: string): { start: string; end: string } {
    if (range === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (range) {
        case 'this_month': return { start: fmt(new Date(year, month, 1)), end: fmt(new Date(year, month + 1, 0)) };
        case 'last_month': return { start: fmt(new Date(year, month - 1, 1)), end: fmt(new Date(year, month, 0)) };
        case '3m': return { start: fmt(new Date(year, month - 2, 1)), end: fmt(new Date(year, month + 1, 0)) };
        default: return { start: fmt(new Date(year, month - 2, 1)), end: fmt(new Date(year, month + 1, 0)) };
    }
}

/** Previous period for delta calculation */
export function getPrevRange(range: TimeRange): { start: string; end: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (range) {
        case 'this_month': return { start: fmt(new Date(year, month - 1, 1)), end: fmt(new Date(year, month, 0)) };
        case 'last_month': return { start: fmt(new Date(year, month - 2, 1)), end: fmt(new Date(year, month - 1, 0)) };
        case '3m': return { start: fmt(new Date(year, month - 5, 1)), end: fmt(new Date(year, month - 2, 0)) };
        default: return { start: fmt(new Date(year, month - 5, 1)), end: fmt(new Date(year, month - 2, 0)) };
    }
}

/* ══════════════════════════════════════════════
   API CALLS
   ══════════════════════════════════════════════ */

export async function fetchMarketingData(start: string, end: string): Promise<MarketingResponse> {
    const res = await fetch(`${API_BASE}/api/marketing?start=${start}&end=${end}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export async function fetchEntries(companyId: string, start?: string, end?: string): Promise<EntryRow[]> {
    const params = new URLSearchParams({ companyId });
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const res = await fetch(`${API_BASE}/api/marketing/entries?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    // API returns { entries: [...] } wrapper with different field names
    const raw: any[] = Array.isArray(json) ? json : (json.entries || []);
    return raw.map(r => ({
        id: r.id || String(Math.random()),
        companyId: r.companyId || companyId,
        date: r.date || '',
        month: r.month || '',
        campaignId: parseInt(r.campaignId) || 0,
        campaignName: r.campaignName || '',
        channel: r.channel || '',
        totalLead: r.totalLead ?? r.total ?? 0,
        spam: r.spam ?? 0,
        potential: r.potential ?? 0,
        quality: r.quality ?? 0,
        booked: r.booked ?? 0,
        arrived: r.arrived ?? 0,
        closed: r.closed ?? 0,
        bill: r.bill ?? r.bills ?? 0,
        budgetTarget: r.budgetTarget ?? 0,
        budgetActual: r.budgetActual ?? 0,
    }));
}
