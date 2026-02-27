# PLAN: Trello Live Sync → Nexus Hub

> One-way live sync: Trello boards/lists/cards → Nexus Hub SQLite kanban. Poll every 5 min.

## ✅ API Verified

| Field | Value |
|-------|-------|
| User | `thai.vu` (@thaivu58) |
| Board | **My Trello board** (`68c0ecb569f4a89df60eb46c`) |
| Lists | Sprint backlog, In progress, Review, Backlog - research, Backlog - Work |
| Cards | ~15 cards, with labels, Slack/Jira links, descriptions |

---

## Trello Board Structure

```
My Trello board
├─ Sprint backlog       (pos=0.375)
├─ In progress          (pos=0.75)
├─ Review               (pos=8192)
├─ Backlog - research   (pos=16384)
└─ Backlog - Work       (pos=32768)
```

Card features in use: labels (Low/High), attachments (Slack links, Jira links, images), descriptions with markdown.

---

## Data Mapping

```
Trello                          Nexus Hub SQLite
────────                        ────────────────
Board.id                   →    boards.trello_id (NEW)
Board.name                 →    boards.title
Board.desc                 →    boards.description

List.id                    →    columns.trello_id (NEW)
List.name                  →    columns.title
List.pos                   →    columns.position (normalized 0,1,2...)

Card.id                    →    cards.trello_id (NEW)
Card.name                  →    cards.title
Card.desc                  →    cards.description
Card.labels[].name         →    cards.labels (JSON: ["Low","High",...])
Card.labels[].color        →    cards.priority (map: orange→high, black_light→low)
Card.due                   →    cards.due_date (already exists)
Card.idList                →    cards.column_id (mapped via trello_id)
Card.pos                   →    cards.position (normalized)
Card.attachments[].url     →    cards.links (NEW — JSON: [{url,name},...])
Card.idChecklists          →    cards.checklists (NEW — JSON: [{name,items}])
Card.dateLastActivity      →    used for diff (skip unchanged cards)
```

---

## Proposed Changes

### Phase 1: DB Schema Migration (~5 min)

#### [MODIFY] [lib.rs](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src-tauri/src/lib.rs)
Add migration #2:
```sql
ALTER TABLE boards ADD COLUMN trello_id TEXT;
ALTER TABLE columns ADD COLUMN trello_id TEXT;
ALTER TABLE cards ADD COLUMN trello_id TEXT;
ALTER TABLE cards ADD COLUMN checklists TEXT DEFAULT '[]';
ALTER TABLE cards ADD COLUMN links TEXT DEFAULT '[]';
```

---

### Phase 2: Trello API Client (~30 min)

#### [NEW] [trello-api.ts](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src/lib/trello-api.ts)

Functions:
- `testConnection(key, token)` → `{ ok, user }` 
- `getBoards(key, token)` → board list
- `getBoardFull(boardId, key, token)` → board + lists + cards + checklists
- `mapTrelloCard(card)` → Nexus card format
- `extractLinks(attachments)` → filter non-image attachments as links

---

### Phase 3: Sync Engine (~30 min)

#### [NEW] [trello-sync.ts](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src/lib/trello-sync.ts)

Core logic:
- `syncBoard(boardId, key, token)`:
  1. Fetch full board from Trello API
  2. Upsert board → `boards` table (match by `trello_id`)
  3. Upsert lists → `columns` table (match by `trello_id`)
  4. Diff cards: INSERT new, UPDATE changed, DELETE removed
  5. Store `trello_last_sync` in `settings`
- `startAutoSync(intervalMs)` / `stopAutoSync()`
- Event emitter for UI updates

---

### Phase 4: Settings UI — Trello Tab (~20 min)

#### [MODIFY] [Settings.tsx](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src/pages/Settings.tsx)

Add Trello section:
- API Key + Token inputs (stored in `settings` table)
- "Test Connection" button → show username badge
- Board list with checkbox to select sync targets
- Sync interval picker + "Sync Now" button
- Last sync timestamp + card count

---

### Phase 5: Board Page Enhancement (~20 min)

#### [MODIFY] [Board.tsx](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src/pages/Board.tsx)

Enhance card display:
- Trello icon (🔗) on synced cards
- Due date badge in card footer
- Checklist progress bar (e.g., "2/5")
- Links as clickable pills (Slack 💬, Jira 🎫, generic 🔗)

#### [MODIFY] [db.ts](file:///Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri/src/lib/db.ts)

Add functions:
- `upsertBoardByTrelloId(trelloId, data)`
- `upsertColumnByTrelloId(trelloId, boardId, data)`
- `upsertCardByTrelloId(trelloId, columnId, data)`
- `deleteCardsByTrelloIds(keepIds, boardTrelloId)`

---

## Execution Order

```
Phase 1 (Rust migration)  →  Phase 2 (API client)  →  Phase 3 (Sync engine)
                                                    →  Phase 4 (Settings UI)
                                                    →  Phase 5 (Board UI)
```

## Verification

- [ ] `testConnection()` returns `{ ok: true, user: "thai.vu" }`
- [ ] Sync imports 5 lists + ~15 cards into SQLite
- [ ] Board page shows cards with labels, links
- [ ] Modify card title on Trello → reflected in Nexus after sync
- [ ] Delete card on Trello → removed from Nexus
- [ ] TypeScript: 0 errors
