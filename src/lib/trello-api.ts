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

export interface TrelloMemberCard {
    id: string;
    idBoard?: string;
    idList?: string;
    name: string;
    closed?: boolean;
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

async function trelloRequest<T>(
    path: string,
    key: string,
    token: string,
    options?: RequestInit,
    params?: Record<string, string>
): Promise<T> {
    const res = await fetch(buildUrl(path, key, token, params), options);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Trello API ${res.status}: ${body.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export async function testConnection(key: string, token: string): Promise<{ ok: boolean; user?: string; error?: string }> {
    try {
        const res = await fetch(buildUrl('/members/me', key, token, { fields: 'fullName,username' }));
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        return { ok: true, user: data.fullName || data.username };
    } catch (e: unknown) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function getBoards(key: string, token: string): Promise<TrelloBoard[]> {
    return trelloRequest<TrelloBoard[]>(
        '/members/me/boards',
        key,
        token,
        undefined,
        {
            fields: 'name,desc,url,dateLastActivity',
            filter: 'open',
        }
    );
}

export async function getBoardLists(boardId: string, key: string, token: string): Promise<TrelloList[]> {
    return trelloRequest<TrelloList[]>(
        `/boards/${boardId}/lists`,
        key,
        token,
        undefined,
        {
            fields: 'name,pos,closed',
            filter: 'open',
        }
    );
}

export async function getMemberCards(key: string, token: string): Promise<TrelloMemberCard[]> {
    return trelloRequest<TrelloMemberCard[]>(
        '/members/me/cards',
        key,
        token,
        undefined,
        {
            fields: 'name,idBoard,idList,closed',
            filter: 'open',
        }
    );
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

export interface TrelloCreateCardInput {
    idList: string;
    name: string;
    desc?: string;
    due?: string | null;
    pos?: number | 'top' | 'bottom';
}

export async function createTrelloCard(input: TrelloCreateCardInput, key: string, token: string): Promise<TrelloCard> {
    return trelloRequest<TrelloCard>(
        '/cards',
        key,
        token,
        { method: 'POST' },
        {
            idList: input.idList,
            name: input.name,
            desc: input.desc || '',
            due: input.due || '',
            pos: String(input.pos ?? 'bottom'),
        }
    );
}

export interface TrelloUpdateCardInput {
    name?: string;
    desc?: string;
    due?: string | null;
    dueComplete?: boolean;
}

export async function updateTrelloCard(cardId: string, input: TrelloUpdateCardInput, key: string, token: string): Promise<TrelloCard> {
    const params: Record<string, string> = {};
    if (input.name !== undefined) params.name = input.name;
    if (input.desc !== undefined) params.desc = input.desc;
    if (input.due !== undefined) params.due = input.due || '';
    if (input.dueComplete !== undefined) params.dueComplete = input.dueComplete ? 'true' : 'false';
    return trelloRequest<TrelloCard>(
        `/cards/${cardId}`,
        key,
        token,
        { method: 'PUT' },
        params
    );
}

export interface TrelloMoveCardInput {
    idList: string;
    pos?: number | 'top' | 'bottom';
}

export async function moveTrelloCard(cardId: string, input: TrelloMoveCardInput, key: string, token: string): Promise<TrelloCard> {
    return trelloRequest<TrelloCard>(
        `/cards/${cardId}`,
        key,
        token,
        { method: 'PUT' },
        {
            idList: input.idList,
            pos: String(input.pos ?? 'bottom'),
        }
    );
}

export async function deleteTrelloCard(cardId: string, key: string, token: string): Promise<void> {
    const res = await fetch(buildUrl(`/cards/${cardId}`, key, token), { method: 'DELETE' });
    if (res.status === 404) return;
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Trello API ${res.status}: ${body.slice(0, 200)}`);
    }
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
