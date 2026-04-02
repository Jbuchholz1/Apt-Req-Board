# Digital Req Board — Project Brief for Claude Code

## What We're Building

A live, web-accessible **Digital Req Board** for APT Companies (staffing firm, Southeast US). This replaces a manually-updated SharePoint Excel file with a real-time dashboard that pulls directly from Bullhorn CRM via a custom MCP server.

The app has two parts:
1. **API Server** — Node.js backend that proxies requests to the Bullhorn MCP server and serves clean JSON to the frontend
2. **Frontend** — React SPA with a polished req board UI, auto-refresh, filters, and status color-coding

Both are deployed on **Railway**.

---

## Architecture

```
Browser (React SPA)
        │
        ▼
Railway Service A: Frontend (React, static or served via Express)
        │
        ▼
Railway Service B: API Server (Node.js/Express)
        │
        ▼
Bullhorn MCP Server (already running on Railway)
URL: https://bullhorn-mcp-production.up.railway.app/mcp
        │
        ▼
Bullhorn REST API (rest42.bullhornstaffing.com)
```

> **Why a separate API server?** The Bullhorn MCP URL requires auth credentials that must never be exposed to the browser. The Node.js API server keeps all MCP calls server-side.

---

## Bullhorn MCP Server

- **URL:** `https://bullhorn-mcp-production.up.railway.app/mcp`
- **Protocol:** MCP (Model Context Protocol) over SSE or HTTP
- **Auth:** Check `.env` for `BULLHORN_MCP_API_KEY` or existing Railway env vars

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `search_jobs` | Search JobOrders by status, owner, keyword |
| `query_entity` | Raw WHERE-clause query on any Bullhorn entity |
| `get_submissions` | Get candidate submissions for a job order ID |
| `get_candidate` | Look up a candidate by name or ID |
| `search_candidates` | Search candidates by skill, status, keyword |
| `get_entity_fields` | Get metadata/schema for any entity type |

---

## Bullhorn Data Model (Verified from Live Schema)

### JobOrder — Key Fields

| Field | Bullhorn Name | Notes |
|-------|--------------|-------|
| Job Title | `title` | String |
| Client Company | `clientCorporation.name` | TO_ONE → ClientCorporation |
| Client Contact | `clientContact.firstName` + `lastName` | TO_ONE |
| Status | `status` | See status options below |
| Owner/Recruiter | `owner.firstName` + `owner.lastName` | TO_ONE → CorporateUser |
| Assigned Users | `assignedUsers` | TO_MANY → CorporateUser |
| Employment Type | `employmentType` | Direct Hire, Contract, Contract To Hire, Project |
| # of Openings | `numOpenings` | Integer |
| Pay Rate | `payRate` | BigDecimal |
| Salary Low | `salary` | BigDecimal |
| Salary High | `customFloat1` | BigDecimal (labeled "Salary High") |
| Deal Value | `customFloat2` | BigDecimal (labeled "Deal Value") |
| Remote | `customText1` | Yes / No / Hybrid |
| # Filled | `customText2` | String (labeled "# Filled") |
| # Washed | `customText3` | String (labeled "# Washed") |
| # Lost | `customText4` | String (labeled "# Lost") |
| Staffing or Project | `customText5` | "1"=staffing / "0"=project |
| Apriora Status | `customText40` | String |
| Date Added | `dateAdded` | Timestamp (Unix ms) — use `new Date(val)` |
| Date Closed | `dateClosed` / `customDate1` | Timestamp |
| Start Date | `startDate` | Timestamp |
| Estimated End Date | `estimatedEndDate` | Date |
| Is Open | `isOpen` | Boolean |
| Priority | `type` | 1=A, 2=B, 3=C |
| Work From Home | `isWorkFromHome` | Boolean |
| Location City | `address.city` | Nested composite |
| Location State | `address.state` | Nested composite |
| Timesheet Filter | `correlatedCustomText1` | labeled "Timesheet Filter" |

### JobOrder Status Options (exact values)
```
"Accepting Candidates"
"Covered"
"Offer Out"
"Placed"
"Filled"
"Lost"
"Wash"
"Archive"
```

### Active / Open Job Query
```javascript
// To get all open/active reqs:
query_entity({
  entityType: "JobOrder",
  where: "isOpen = true AND isDeleted = false",
  fields: "id,title,status,owner,clientCorporation,clientContact,employmentType,numOpenings,payRate,salary,customFloat1,customFloat2,customText1,customText2,customText3,customText4,customText5,customText40,dateAdded,startDate,estimatedEndDate,address,assignedUsers,type",
  orderBy: "-dateAdded",
  count: 100
})
```

### Placement — For Active Contractors
```javascript
query_entity({
  entityType: "Placement",
  where: "status = 'Active'",
  fields: "id,candidate,jobOrder,dateBegin,dateEnd,payRate,clientBillRate,status",
  orderBy: "-dateBegin",
  count: 100
})
```

### Timestamp Handling (CRITICAL)
Bullhorn returns timestamps as Unix milliseconds. Always convert with:
```javascript
const date = new Date(timestampMs);
// Format for display:
date.toLocaleDateString('en-US', { timeZone: 'America/Chicago' })
```
Never manually calculate from raw ms values.

---

## Frontend UI Requirements

### Layout
- **Header:** "APT Req Board" branding, last-refreshed timestamp, manual refresh button
- **Filter bar:** Filter by Status, Employment Type, Owner/Recruiter, Remote (Yes/No/Hybrid)
- **Stats strip:** Count of open reqs | Active contractors | Offers out | Covered
- **Main table:** Sortable columns, color-coded status badges
- **Auto-refresh:** Every 5 minutes

### Req Board Table Columns (in order)
1. Priority (A/B/C badge from `type` field)
2. Job Title (`title`)
3. Client (`clientCorporation.name`)
4. Status (color-coded badge)
5. Type (`employmentType`)
6. Owner (`owner.firstName + lastName`)
7. # Open (`numOpenings`)
8. # Filled (`customText2`)
9. Remote (`customText1`)
10. City/State (`address.city`, `address.state`)
11. Date Added (`dateAdded` → formatted)
12. Start Date (`startDate` → formatted)

### Status Color Coding
| Status | Color |
|--------|-------|
| Accepting Candidates | Green |
| Covered | Blue |
| Offer Out | Orange |
| Placed | Purple |
| Filled | Teal |
| Lost | Red |
| Wash | Gray |
| Archive | Dark Gray |

### Row Click → Detail Panel
Clicking a row should expand or slide open a detail panel showing:
- Full job details
- Submissions count (call `get_submissions(jobOrderId)`)
- Notes/activity (if available)

### Design Direction
- Clean, data-dense, professional — this is an internal ops tool
- Dark sidebar or header with a light table body works well
- Monospace or tabular number font for rates/counts
- NOT a consumer app — prioritize information density over whitespace
- APT company colors: navy and gold (if brand colors are needed)

---

## API Server Endpoints to Build

```
GET /api/jobs          — All open job orders (isOpen=true)
GET /api/jobs/all      — All jobs including closed (for history)
GET /api/jobs/:id      — Single job detail + submissions
GET /api/placements    — Active placements (active contractors)
GET /api/stats         — Summary counts for stats strip
GET /api/health        — Health check for Railway
```

---

## Project File Structure (Recommended)

```
digital-req-board/
├── CLAUDE.md                  ← This file
├── README.md
├── .env.example
├── .gitignore
│
├── server/                    ← Railway Service 1: API
│   ├── package.json
│   ├── index.js               ← Express server
│   ├── routes/
│   │   ├── jobs.js
│   │   ├── placements.js
│   │   └── stats.js
│   └── lib/
│       └── bullhorn.js        ← MCP client wrapper
│
└── client/                    ← Railway Service 2: React app
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── ReqBoard.jsx   ← Main table
        │   ├── StatsStrip.jsx
        │   ├── FilterBar.jsx
        │   ├── JobDetail.jsx  ← Slide-out panel
        │   └── StatusBadge.jsx
        └── lib/
            └── api.js         ← Fetch wrapper for API server
```

---

## Environment Variables

### Server `.env`
```
PORT=3001
BULLHORN_MCP_URL=https://bullhorn-mcp-production.up.railway.app/mcp
BULLHORN_MCP_API_KEY=           # from Railway env vars on existing MCP service
NODE_ENV=production
```

### Client `.env`
```
VITE_API_BASE_URL=https://your-api-server.railway.app
```

---

## Railway Deployment Notes

- Two Railway services in one project: `api-server` and `frontend`
- Both deploy from the same GitHub repo using Railway's root directory setting
- API server: root dir = `server/`, start command = `node index.js`
- Frontend: root dir = `client/`, build command = `npm run build`, serve with static or a simple Express static server
- Set all env vars in Railway dashboard per service
- The API server URL becomes the `VITE_API_BASE_URL` for the frontend

---

## Key Technical Notes

1. **MCP calls are server-side only** — never call the MCP URL from the browser
2. **CORS** — API server must allow requests from the frontend Railway domain
3. **Timestamps** — Always use `new Date(ms)` for Bullhorn timestamp fields
4. **Pagination** — Default `count` is 20; set to 100+ for req board; handle pagination if needed
5. **TO_ONE fields** — Must be in the `fields` param as nested e.g. `owner,clientCorporation` — Bullhorn returns the nested object automatically
6. **isDeleted filter** — Always add `AND isDeleted = false` to queries

---

## Build Order

**Phase 1 — API Server**
- [ ] Init Node.js/Express project in `server/`
- [ ] Build `bullhorn.js` MCP client that calls the Railway MCP server
- [ ] Implement `/api/jobs` endpoint with correct fields and WHERE clause
- [ ] Implement `/api/placements` for active contractors
- [ ] Implement `/api/stats` for header counts
- [ ] Test all endpoints locally

**Phase 2 — Frontend**
- [ ] Init Vite + React project in `client/`
- [ ] Build `StatsStrip` component
- [ ] Build `FilterBar` with Status, Type, Owner, Remote filters
- [ ] Build `ReqBoard` main table with sorting
- [ ] Build `StatusBadge` with color mapping
- [ ] Build `JobDetail` slide-out panel with submissions
- [ ] Wire up auto-refresh (5-minute interval)

**Phase 3 — Deploy**
- [ ] Push to GitHub
- [ ] Create Railway project with two services
- [ ] Set env vars per service
- [ ] Confirm live URL loads and data flows end-to-end

---

## Questions to Resolve Early

1. **MCP auth method** — Does the existing Bullhorn MCP server use bearer token, API key header, or something else? Check the Railway env vars on `bullhorn-mcp-production` to confirm.
2. **Office/branch field** — Confirm if jobs are tagged by office (Birmingham/Dallas/Nashville) via `branchCode` or another field — may want to add office filter.
3. **"Called shots"** — This was a concept from the old req board (a manually-flagged high-priority req). Discuss whether to replicate via `type` (Priority A/B/C) or a custom field.
