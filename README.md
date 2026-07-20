# 403(b) Trade P&L Tracker v.2

Next.js 14 dashboard for tracking trade decisions, fund allocations, dividends, and P&L in your Eagle Mountain International Church 403(b) plan.

## Quick Start

### 1. Push to GitHub
Open this folder in **GitHub Desktop** and push to a new repo called `trade-tracker`.

### 2. Connect to Vercel
- Go to [vercel.com/new](https://vercel.com/new)
- Import the `trade-tracker` repo
- Add these **Environment Variables** before deploying:

| Variable | Value |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://valued-flounder-79434.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | *(your Upstash token from the Upstash console)* |
| `DASHBOARD_PASSWORD` | *(your chosen password)* |

- Click **Deploy**

### 3. Seed the Data
After deploying, run the seed script once locally to load your spreadsheet data into Redis:

```bash
# From the project folder:
npm install
UPSTASH_REDIS_REST_URL="https://valued-flounder-79434.upstash.io" \
UPSTASH_REDIS_REST_TOKEN="your_token" \
node seed.js path/to/401k_Trade_Tracker_v12_1.xlsx
```

This loads all 108 transactions, 727 transfer detail lines, 81 dividend records, 2 trade decisions, 12 fund YTD summaries, and 36 fund universe entries into Redis with `tt_` prefix (separate from `mf_dashboard_cache`).

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Database**: Upstash Redis (same instance as KCM mutual funds dashboard)
- **Charts**: Recharts
- **Auth**: Cookie-based password gate (middleware)
- **Redis prefix**: All keys use `tt_` to avoid collision

## Tabs

| Tab | Purpose |
|-----|---------|
| **Portfolio** | Balance, YTD return, allocation pie, source breakdown |
| **Trade P&L** | Trade decision cards with expandable transfer detail |
| **Fund Detail** | Click any fund for transfers, dividends, metrics |
| **Dividends** | Monthly income chart, by-fund breakdown, annualized yield |
| **Activity** | All 108+ transactions, filterable, expandable, CSV export |
| **Admin** | Weekly balance update + trade decision entry forms |

## Color Palette — "Coastal"
Navy headers → sand/brown cards → cream backgrounds. Similar to iran-war-nine.vercel.app.
