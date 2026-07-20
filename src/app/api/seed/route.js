import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIX = 'tt_';
const EXAMPLE_TICKER = 'XXXX';
const EXAMPLE_CONFIRMATION_PREFIX = 'EXAMPLE';

const TICKER_FIXES = { 'MQLAX': 'MCZZX', 'TRRJX': 'TRRLX' };
function fixTicker(t) { return TICKER_FIXES[t] || t; }
function fixTickers(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    const fixed = { ...item };
    if (fixed.ticker) fixed.ticker = fixTicker(fixed.ticker);
    return fixed;
  });
}

// Any row carrying the example marker (ticker XXXX or a confirmation number
// starting with EXAMPLE) is a leftover template row and is always dropped,
// whether or not the person remembered to delete it before uploading.
function isExampleRow(r) {
  if (!r) return true;
  if (r.ticker === EXAMPLE_TICKER) return true;
  if (r.confirmation && String(r.confirmation).toUpperCase().startsWith(EXAMPLE_CONFIRMATION_PREFIX)) return true;
  return false;
}
function stripExamples(arr) {
  return (arr || []).filter(r => !isExampleRow(r));
}

// Baseline: only used the very first time this account is seeded (Redis has
// no trades yet). After that, trades are managed via the Trade Decisions
// sheet (merged by Trade #) or the Admin → Trade Decision form.
const TRADE_DECISIONS_BASELINE = [
  {trade_num:1,date:"2026-01-16",description:"COSYX, GCCUX, Cash \u2192 FBNRX, NOBOX, PIMIX, PRRIX",funds_sold:"COSYX, GCCUX, Cash",funds_bought:"FBNRX, NOBOX, PIMIX, PRRIX",total_sold:14322.85,total_bought:14322.85,status:"Closed",notes:null,macro_regime:null},
  {trade_num:2,date:"2026-01-23",description:"Rebalance to PIMIX 30%, PRRIX 20%, NOBOX 20%, FBNRX 10%, TRRLX 5%, Cash 15%",funds_sold:"PIMIX, PRRIX, TRRLX, FBNRX",funds_bought:"Cash, NOBOX",total_sold:8567.73,total_bought:8567.73,status:"Closed",notes:"Rebalancer #620520637. Executed 1/23.",macro_regime:null},
  {trade_num:3,date:"2026-01-23",description:"Rebalance to PIMIX 20%, PRRIX 15%, NOBOX 15%, Cash 40%, FBNRX 5%, TRRLX 5%",funds_sold:"FBNRX, NOBOX, PIMIX, PRRIX, TRRLX",funds_bought:"Cash",total_sold:26703.45,total_bought:26703.45,status:"Closed",notes:"Rebalancer #620734247. Setup 1/23, executed 1/26.",macro_regime:null},
  {trade_num:4,date:"2026-01-26",description:"FBNRX, NOBOX, PIMIX, PRRIX \u2192 Cash",funds_sold:"FBNRX, NOBOX, PIMIX, PRRIX",funds_bought:"Cash",total_sold:7981.44,total_bought:7981.44,status:"Closed",notes:"Executed 1/27.",macro_regime:null},
  {trade_num:5,date:"2026-01-27",description:"FBNRX, PIMIX \u2192 NOBOX, PRRIX, Cash",funds_sold:"FBNRX, PIMIX",funds_bought:"NOBOX, PRRIX, Cash",total_sold:2839.29,total_bought:2839.29,status:"Closed",notes:"Executed 1/30.",macro_regime:null},
  {trade_num:6,date:"2026-02-01",description:"Cash \u2192 NOBOX, PIMIX, PRRIX",funds_sold:"Cash",funds_bought:"NOBOX, PIMIX, PRRIX",total_sold:6221.99,total_bought:6221.99,status:"Closed",notes:"Executed 2/2. Redeploy cash to bonds.",macro_regime:null},
  {trade_num:7,date:"2026-02-02",description:"Cash \u2192 NOBOX, PIMIX, PRRIX",funds_sold:"Cash",funds_bought:"NOBOX, PIMIX, PRRIX",total_sold:8524.66,total_bought:8524.66,status:"Closed",notes:"Executed 2/3.",macro_regime:null},
  {trade_num:8,date:"2026-02-03",description:"Cash \u2192 FBNRX, GCCUX",funds_sold:"Cash",funds_bought:"FBNRX, GCCUX",total_sold:1252.32,total_bought:1252.32,status:"Closed",notes:"Executed 2/9.",macro_regime:null},
  {trade_num:9,date:"2026-02-22",description:"Cash \u2192 TRRLX",funds_sold:"Cash",funds_bought:"TRRLX",total_sold:3098.88,total_bought:3098.88,status:"Closed",notes:"Executed 2/23.",macro_regime:null},
  {trade_num:10,date:"2026-02-25",description:"FBNRX, GCCUX, JLGMX, NOBOX, TRRLX \u2192 Cash",funds_sold:"FBNRX, GCCUX, JLGMX, NOBOX, TRRLX",funds_bought:"Cash",total_sold:3418.72,total_bought:3418.72,status:"Closed",notes:"Liquidate diversified mix to cash.",macro_regime:null},
  {trade_num:11,date:"2026-04-08",description:"COSYX, FBNRX, JLGMX, MCZZX, PIMIX, PRRIX \u2192 Cash",funds_sold:"COSYX, FBNRX, JLGMX, MCZZX, PIMIX, PRRIX",funds_bought:"Cash",total_sold:15721.06,total_bought:15721.06,status:"Closed",notes:"Major liquidation to cash.",macro_regime:null},
  {trade_num:12,date:"2026-04-10",description:"COSYX, FBNRX \u2192 MCZZX, PIMIX, PRRIX, Cash",funds_sold:"COSYX, FBNRX",funds_bought:"MCZZX, PIMIX, PRRIX, Cash",total_sold:3427.57,total_bought:3427.57,status:"Closed",notes:"Partial redeploy from intl/global to core bonds.",macro_regime:null},
  {trade_num:13,date:"2026-04-25",description:"PRRIX, Cash \u2192 COSYX, MCZZX, NOBOX, PIMIX, PRRIX",funds_sold:"PRRIX, Cash",funds_bought:"COSYX, MCZZX, NOBOX, PIMIX, PRRIX",total_sold:12305.66,total_bought:12305.66,status:"Open",notes:"Rebalancer #663606218. Redeploy cash back into diversified bonds + intl.",macro_regime:null},
];

// A trade row is a leftover example if it has no trade number, or its
// description/notes carry the EXAMPLE marker from the template.
function isExampleTrade(r) {
  if (!r || r.trade_num == null || r.trade_num === '') return true;
  if (r.description && String(r.description).toUpperCase().includes('EXAMPLE')) return true;
  return false;
}
function stripExampleTrades(arr) {
  return (arr || []).filter(r => !isExampleTrade(r));
}

// Trade-number-keyed merge: an uploaded row with the same Trade # as an
// existing one corrects it; new Trade #s are added; existing trades not
// mentioned in the upload are preserved untouched.
function mergeTrades(existingRows, newRows) {
  const map = new Map();
  (existingRows || []).forEach(r => { if (r && r.trade_num != null) map.set(r.trade_num, r); });
  (newRows || []).forEach(r => { if (r && r.trade_num != null) map.set(r.trade_num, r); });
  return Array.from(map.values()).sort((a, b) => a.trade_num - b.trade_num);
}

async function safeGet(k) {
  let val = await redis.get(k);
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch (e) { /* not JSON */ }
  }
  return val;
}

// Merge two weekly-balance arrays by date. On a date collision, the manually
// entered value wins over the spreadsheet value, since it's more current.
function mergeWeeklyBalance(spreadsheetRows, manualRows) {
  const map = new Map();
  (spreadsheetRows || []).forEach(r => { if (r && r.date) map.set(r.date, r); });
  (manualRows || []).forEach(r => { if (r && r.date) map.set(r.date, r); }); // overwrites on conflict
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Merge fund price snapshots by date, merging the inner ticker→price map too.
function mergeFundPrices(spreadsheetRows, manualRows) {
  const map = new Map();
  (spreadsheetRows || []).forEach(r => { if (r && r.date) map.set(r.date, { date: r.date, prices: { ...r.prices } }); });
  (manualRows || []).forEach(r => {
    if (!r || !r.date) return;
    const existing = map.get(r.date) || { date: r.date, prices: {} };
    map.set(r.date, { date: r.date, prices: { ...existing.prices, ...r.prices } });
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Append-and-dedupe a transaction-style log. `keyFn` derives a unique key per
// row (e.g. confirmation number); on a key collision the uploaded row wins
// (lets you re-upload a corrected row), but rows already in Redis that the
// upload doesn't mention are always preserved — an upload is treated as
// "new/updated rows to add", never as "this is now the complete list".
function mergeLog(existingRows, newRows, keyFn) {
  const map = new Map();
  (existingRows || []).forEach(r => { const k = keyFn(r); if (k) map.set(k, r); });
  (newRows || []).forEach(r => { const k = keyFn(r); if (k) map.set(k, r); });
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Ticker-keyed merge: rows in the upload update/insert by ticker; any ticker
// already in Redis but absent from this upload is left untouched.
function mergeByTicker(existingRows, newRows) {
  const map = new Map();
  (existingRows || []).forEach(r => { if (r && r.ticker) map.set(r.ticker, r); });
  (newRows || []).forEach(r => { if (r && r.ticker) map.set(r.ticker, r); });
  return Array.from(map.values());
}

// YTD Summary account-level totals: only overwrite a field if the upload
// actually supplied a value for it (non-null); a blank cell in the sheet
// means "no change", not "reset to zero/whatever the template shipped with".
function mergeYtdSummary(existing, incoming) {
  const merged = { ...(existing || {}) };
  ['beginning_balance', 'ending_balance', 'total_deposits', 'total_fees', 'total_dividends', 'total_change'].forEach(k => {
    if (incoming && incoming[k] != null) merged[k] = incoming[k];
  });
  if (incoming && Array.isArray(incoming.sources) && incoming.sources.length > 0) {
    merged.sources = incoming.sources;
  } else if (!merged.sources) {
    merged.sources = [];
  }
  merged.funds = mergeByTicker(existing?.funds, stripExamples(incoming?.funds));
  return merged;
}

// Account summary: same "blank means no change" rule as YTD Summary.
function mergeAccount(existing, incoming) {
  const merged = { ...(existing || {}) };
  if (incoming) {
    if (incoming.balance != null) merged.balance = incoming.balance;
    if (incoming.as_of_date != null) merged.as_of_date = incoming.as_of_date;
    if (incoming.opening_balance != null) merged.opening_balance = incoming.opening_balance;
    if (incoming.contributions_ytd != null) merged.contributions_ytd = incoming.contributions_ytd;
  }
  return merged;
}

export async function POST(request) {
  try {
    const data = await request.json();

    const dividendDetail = stripExamples(fixTickers(data.dividendDetail));
    const transferDetail = stripExamples(fixTickers(data.transferDetail));
    const fundUniverse = stripExamples(fixTickers(data.fundUniverse));
    const transactions = stripExamples(data.transactions);

    const existingWeekly = await safeGet(PREFIX + 'weekly_balance');
    const existingPrices = await safeGet(PREFIX + 'fund_prices');
    const existingTransactions = await safeGet(PREFIX + 'transactions');
    const existingTransferDetail = await safeGet(PREFIX + 'transfer_detail');
    const existingDividendDetail = await safeGet(PREFIX + 'dividend_detail');
    const existingFundUniverse = await safeGet(PREFIX + 'fund_universe');
    const existingYtdSummary = await safeGet(PREFIX + 'ytd_summary');

    const mergedWeekly = mergeWeeklyBalance(data.weeklyBalance, existingWeekly);
    const mergedPrices = mergeFundPrices(data.fundPrices, existingPrices);
    const mergedTransactions = mergeLog(existingTransactions, transactions, r => r.confirmation || `${r.date}|${r.type}|${r.amount}`);
    const mergedTransferDetail = mergeLog(existingTransferDetail, transferDetail, r => `${r.confirmation}|${r.source}|${r.ticker || r.fund}|${r.direction}`);
    const mergedDividendDetail = mergeLog(existingDividendDetail, dividendDetail, r => `${r.confirmation}|${r.source}|${r.ticker || r.fund}`);
    const mergedFundUniverse = mergeByTicker(existingFundUniverse, fundUniverse);
    const mergedYtdSummary = mergeYtdSummary(existingYtdSummary, data.ytdSummary);

    const existingAccount = await safeGet(PREFIX + 'account');
    const mergedAccount = mergeAccount(existingAccount, data.account);

    const existingTrades = await safeGet(PREFIX + 'trades');
    const tradeBaseline = (existingTrades && existingTrades.length > 0) ? existingTrades : TRADE_DECISIONS_BASELINE;
    const mergedTrades = mergeTrades(tradeBaseline, stripExampleTrades(data.trades));

    await Promise.all([
      redis.set(PREFIX + 'account', mergedAccount),
      redis.set(PREFIX + 'transactions', mergedTransactions),
      redis.set(PREFIX + 'transfer_detail', mergedTransferDetail),
      redis.set(PREFIX + 'trades', mergedTrades),
      redis.set(PREFIX + 'dividend_detail', mergedDividendDetail),
      redis.set(PREFIX + 'ytd_summary', mergedYtdSummary),
      redis.set(PREFIX + 'fund_universe', mergedFundUniverse),
      redis.set(PREFIX + 'weekly_balance', mergedWeekly),
      redis.set(PREFIX + 'fund_prices', mergedPrices),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        transactions: mergedTransactions.length,
        transferDetail: mergedTransferDetail.length,
        dividendDetail: mergedDividendDetail.length,
        trades: mergedTrades.length,
        ytdFunds: mergedYtdSummary.funds.length,
        fundUniverse: mergedFundUniverse.length,
        weeklyBalance: mergedWeekly.length,
        fundPrices: mergedPrices.length,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
