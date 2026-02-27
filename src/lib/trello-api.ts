/**
 * Trello API Client for Nexus Hub
 * One-way sync: Trello → Nexus Hub SQLite
 */

const TRELLO_BASE = 'https://api.trello.com/1';

// ── Types ──────────────────────────────────────────

export interface TrelloBoard {
    id: string;
    name: string;
    desc: string;
    url: string;
    dateLastActivity: string;
}

export interface TrelloList {
    id: string;
    name: string;
    pos: number;
    closed: boolean;
}

export interface TrelloLabel {
    id: string;
    name: string;
    color: string;
}

export interface TrelloAttachment {
    id: string;
    url: string;
    name: string;
}

export interface TrelloCheckItem {
    id: string;
    name: string;
    state: 'complete' | 'incomplete';
}

export interface TrelloChecklist {
    id: string;
    name: string;
    checkItems: TrelloCheckItem[];
}

export interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    due: string | null;
    dueComplete: boolean;
    idList: string;
    pos: number;
    labels: TrelloLabel[];
    idChecklists: string[];
    dateLastActivity: string;
    attachments: TrelloAttachment[];
    url: string;
}

export interface TrelloBoardFull {
    board: TrelloBoard;
    lists: TrelloList[];
    cards: TrelloCard[];
    checklists: TrelloChecklist[];
}

// ── Mapped types for Nexus DB ──────────────────────

export interface NexusBoard {
    trello_id: string;
    title: string;
    description: string;
}

export interface NexusColumn {
    trello_id: string;
    title: string;
    position: number;
    color: string;
}

export interface NexusCard {
    trello_id: string;
    title: string;
    description: string;
    priority: string;
    labels: string[];
    due_date: string | null;
    position: number;
    checklists: { name: string; items: { name: string; done: boolean }[] }[];
    links: { url: string; name: string; type: string }[];
    source_channel: string;
}

// ── Color mapping ─────────────────────────────────

const TRELLO_COLOR_TO_HEX: Record<string, string> = {
    green: '#22c55e', yellow: '#f59e0b', orange: '#f97316',
    red: '#ef4444', purple: '#8b5cf6', blue: '#3b82f6',
    sky: '#0ea5e9', lime: '#84cc16', pink: '#ec4899',
    black: '#374151', black_light: '#6b7280', green_light: '#86efac',
    yellow_light: '#fde68a', orange_light: '#fdba74', red_light: '#fca5a5',
    purple_light: '#c4b5fd', blue_light: '#93c5fd',
};

const TRELLO_LABEL_TO_PRIORITY: Record<string, string> = {
    red: 'urgent', orange: 'high', yellow: 'medium',
    green: 'low', black_light: 'low',
};

const LIST_COLORS: string[] = [
    '#6366f1', '#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6',
    '#ec4899', '#14b8a6', '#f97316',
];

// ── API Functions ─────────────────────────────────

function buildUrl(path: string, key: string, token: string, params: Record<string, string> = {}) {
    const url = new URL(`${TRELLO_BASE}${path}`);
    url.searchParams.set('key', key);
    url.searchParams.set('token', token);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
}

export async function testConnection(key: string, token: string): Promise<{ ok: boolean; user?: string; error?: string }> {
    try {
        const res = await fetch(buildUrl('/members/me', key, token, { fields: 'fullName,username' }));
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        return { ok: true, user: data.fullName || data.username };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export async function getBoards(key: string, token: string): Promise<TrelloBoard[]> {
    const res = await fetch(buildUrl('/members/me/boards', key, token, {
        fields: 'name,desc,url,dateLastActivity',
        filter: 'open',
    }));
    if (!res.ok) throw new Error(`Trello API error: ${res.status}`);
    return res.json();
}

export async function getBoardFull(boardId: string, key: string, token: string): Promise<TrelloBoardFull> {
    const [boardRes, listsRes, cardsRes, checklistsRes] = await Promise.all([
        fetch(buildUrl(`/boards/${boardId}`, key, token, { fields: 'name,desc,url,dateLastActivity' })),
        fetch(buildUrl(`/boards/${boardId}/lists`, key, token, { fields: 'name,pos,closed', filter: 'open' })),
        fetch(buildUrl(`/boards/${boardId}/cards`, key, token, {
            fields: 'name,desc,due,dueComplete,idList,pos,labels,idChecklists,dateLastActivity,url',
            attachments: 'true',
            attachment_fields: 'url,name',
        })),
        fetch(buildUrl(`/boards/${boardId}/checklists`, key, token, {
            fields: 'name,idCard',
            checkItem_fields: 'name,state',
        })),
    ]);

    if (!boardRes.ok || !listsRes.ok || !cardsRes.ok) {
        throw new Error(`Trello API error fetching board ${boardId}`);
    }

    return {
        board: await boardRes.json(),
        lists: await listsRes.json(),
        cards: await cardsRes.json(),
        checklists: checklistsRes.ok ? await checklistsRes.json() : [],
    };
}

// ── Transformers ──────────────────────────────────

function classifyLink(url: string): string {
    if (url.includes('slack.com')) return 'slack';
    if (url.includes('atlassian.net') || url.includes('jira')) return 'jira';
    if (url.includes('figma.com')) return 'figma';
    if (url.includes('github.com')) return 'github';
    if (url.includes('confluence')) return 'confluence';
    return 'link';
}

function isImageAttachment(att: TrelloAttachment): boolean {
    const name = att.name.toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')
        || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg')
        || att.url.includes('/download/');
}

export function mapBoard(board: TrelloBoard): NexusBoard {
    return {
        trello_id: board.id,
        title: board.name,
        description: board.desc || '',
    };
}

export function mapList(list: TrelloList, index: number): NexusColumn {
    return {
        trello_id: list.id,
        title: list.name,
        position: index,
        color: LIST_COLORS[index % LIST_COLORS.length],
    };
}

export function mapCard(
    card: TrelloCard,
    checklists: TrelloChecklist[],
    positionIndex: number,
): NexusCard {
    // Priority from label colors
    let priority = 'medium';
    for (const label of card.labels) {
        const p = TRELLO_LABEL_TO_PRIORITY[label.color];
        if (p) { priority = p; break; }
    }

    // Labels as string array
    const labels = card.labels
        .filter(l => l.name)
        .map(l => l.name);

    // Checklists for this card
    const cardChecklists = checklists
        .filter(cl => card.idChecklists.includes(cl.id))
        .map(cl => ({
            name: cl.name,
            items: cl.checkItems.map(ci => ({
                name: ci.name,
                done: ci.state === 'complete',
            })),
        }));

    // Links (non-image attachments)
    const links = card.attachments
        .filter(att => !isImageAttachment(att))
        .map(att => ({
            url: att.url,
            name: att.name || att.url,
            type: classifyLink(att.url),
        }));

    return {
        trello_id: card.id,
        title: card.name,
        description: card.desc || '',
        priority,
        labels,
        due_date: card.due,
        position: positionIndex,
        checklists: cardChecklists,
        links,
        source_channel: 'trello',
    };
}
