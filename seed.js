/**
 * Seed script — parses 401k_Trade_Tracker_v12_1.xlsx and loads into Upstash Redis.
 * 
 * Usage: UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node seed.js [path-to-xlsx]
 * 
 * All keys are prefixed with tt_ to avoid collision with mf_dashboard_cache.
 */

const XLSX = require('xlsx');
const path = require('path');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = 'tt_';

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

async function redisSet(key, value) {
  const res = await fetch(`${UPSTASH_URL}/set/${PREFIX}${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(value)),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis SET ${key} failed: ${res.status} ${text}`);
  }
  return res.json();
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date((v - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return String(v);
}

async function main() {
  const xlsxPath = process.argv[2] || path.join(__dirname, '401k_Trade_Tracker_v12_1.xlsx');
  console.log(`Reading: ${xlsxPath}`);

  const wb = XLSX.readFile(xlsxPath, { cellDates: true });

  // ===== TRANSACTIONS =====
  const txSheet = wb.Sheets['Transactions'];
  const txRows = XLSX.utils.sheet_to_json(txSheet);
  const transactions = txRows.map(r => ({
    date: parseDate(r['Date']),
    confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
    type: r['Type'] || null,
    amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
    trade_group: r['Trade Group'] || null,
    detail_status: r['Detail Status'] || null,
    notes: r['Notes'] || null,
  })).filter(t => t.date);
  console.log(`Transactions: ${transactions.length}`);

  // ===== TRANSFER DETAIL =====
  const tdSheet = wb.Sheets['Transfer Detail'];
  const tdRows = XLSX.utils.sheet_to_json(tdSheet);
  const transferDetail = tdRows.map(r => ({
    date: parseDate(r['Date']),
    confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
    trade_group: r['Trade Group'] || null,
    source: r['Source'] || null,
    direction: r['Direction'] || null,
    fund: r['Fund'] || null,
    ticker: r['Ticker'] || null,
    shares: r['Shares'] != null ? parseFloat(r['Shares']) : null,
    price: r['Share Price'] != null ? parseFloat(r['Share Price']) : null,
    amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
    notes: r['Notes'] || null,
  })).filter(t => t.date);
  console.log(`Transfer Detail: ${transferDetail.length}`);

  // ===== TRADE DECISIONS =====
  const trSheet = wb.Sheets['Trade Decisions'];
  const trRows = XLSX.utils.sheet_to_json(trSheet);
  const trades = trRows.filter(r => r['Trade #'] != null).map(r => ({
    trade_num: r['Trade #'],
    date: parseDate(r['Date']),
    description: r['Description'] || null,
    total_sold: r['Total Sold'] != null ? parseFloat(r['Total Sold']) : null,
    total_bought: r['Total Bought'] != null ? parseFloat(r['Total Bought']) : null,
    fees: r['Fees Incurred'] != null ? parseFloat(r['Fees Incurred']) : null,
    funds_sold: r['Funds Sold'] || null,
    funds_bought: r['Funds Bought'] || null,
    realized_pl: r['Decision P&L\n($)'] != null ? parseFloat(r['Decision P&L\n($)']) : null,
    status: r['Status'] || null,
    notes: null,
    macro_regime: null,
  }));
  console.log(`Trades: ${trades.length}`);

  // ===== DIVIDEND DETAIL =====
  const ddSheet = wb.Sheets['Dividend Detail'];
  const ddRows = XLSX.utils.sheet_to_json(ddSheet);
  const dividendDetail = ddRows.map(r => ({
    date: parseDate(r['Date']),
    confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
    fund: r['Fund'] || null,
    ticker: r['Ticker'] || null,
    source: r['Source'] || null,
    amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
    price: r['Share Price'] != null ? parseFloat(r['Share Price']) : null,
    shares: r['Shares Purchased'] != null ? parseFloat(r['Shares Purchased']) : null,
    notes: r['Notes'] || null,
  })).filter(d => d.date);
  console.log(`Dividend Detail: ${dividendDetail.length}`);

  // ===== YTD SUMMARY =====
  // Parse the structured YTD Summary sheet
  const ytdSheet = wb.Sheets['YTD Summary'];
  const ytdData = XLSX.utils.sheet_to_json(ytdSheet, { header: 1 });

  // Find the account overview values
  let beginBal = 56248.10, endBal = 61221.54, deposits = 3127.81, fees = -120.37, divs = 898.73, change = 1067.27;
  ytdData.forEach(row => {
    if (row[0] === 'Beginning Balance' && row[1] != null) beginBal = parseFloat(row[1]);
    if (row[0] === 'Total Deposits' && row[1] != null) deposits = parseFloat(row[1]);
    if (row[0] === 'Total Withdrawals/Expenses' && row[1] != null) fees = parseFloat(row[1]);
    if (row[0] === 'Total Dividends' && row[1] != null) divs = parseFloat(row[1]);
    if (row[0] === 'Total Change in Value' && row[1] != null) change = parseFloat(row[1]);
    if (row[0] === 'Ending Balance' && row[1] != null) endBal = parseFloat(row[1]);
  });

  // Parse source breakdown
  const sources = [];
  const sourceNames = ['Employee 403(b)', 'Employer Match', 'Roth'];
  ytdData.forEach(row => {
    if (sourceNames.includes(row[0])) {
      sources.push({
        source: row[0],
        beginning: parseFloat(row[1]) || 0,
        deposits: parseFloat(row[2]) || 0,
        fees: parseFloat(row[3]) || 0,
        dividends: parseFloat(row[4]) || 0,
        growth: parseFloat(row[5]) || 0,
        balance: parseFloat(row[6]) || 0,
      });
    }
  });

  // Parse fund-level YTD data
  const fundYtd = [];
  let inFundSection = false;
  ytdData.forEach(row => {
    if (row[0] === 'Fund' && row[1] === 'Ticker') {
      inFundSection = true;
      return;
    }
    if (inFundSection && row[0] === 'Total') {
      inFundSection = false;
      return;
    }
    if (inFundSection && row[0] && row[0] !== 'Total') {
      fundYtd.push({
        fund: row[0],
        ticker: row[1] || '—',
        beginning_balance: parseFloat(row[2]) || 0,
        deposits: parseFloat(row[3]) || 0,
        transfers: parseFloat(row[4]) || 0,
        fees: parseFloat(row[5]) || 0,
        dividends: parseFloat(row[6]) || 0,
        change: parseFloat(row[7]) || 0,
        ending_balance: parseFloat(row[8]) || 0,
        shares: parseFloat(row[9]) || 0,
      });
    }
  });

  const ytdSummary = {
    beginning_balance: beginBal,
    ending_balance: endBal,
    total_deposits: deposits,
    total_fees: fees,
    total_dividends: divs,
    total_change: change,
    sources,
    funds: fundYtd,
  };
  console.log(`YTD Summary: ${fundYtd.length} funds, ${sources.length} sources`);

  // ===== FUND UNIVERSE =====
  const fuSheet = wb.Sheets['Fund Universe'];
  const fuRows = XLSX.utils.sheet_to_json(fuSheet);
  const fundUniverse = fuRows.filter(r => r['Fund Name']).map(r => ({
    num: r['#'],
    name: r['Fund Name'],
    ticker: r['Ticker'] || '—',
    category: r['Category'] || null,
    in_use: r['In Use (YTD)'] || null,
    opening_balance: r['Opening Balance'] != null ? parseFloat(r['Opening Balance']) : null,
  }));
  console.log(`Fund Universe: ${fundUniverse.length}`);

  // ===== WEEKLY BALANCE =====
  const wbSheet = wb.Sheets['Weekly Balance'];
  const wbRows = XLSX.utils.sheet_to_json(wbSheet);
  const weeklyBalance = wbRows.filter(r => r['Week Ending']).map(r => ({
    date: parseDate(r['Week Ending']),
    balance: r['Empower Balance'] != null ? parseFloat(r['Empower Balance']) : null,
    contributions_ytd: r['Cumulative\nContributions YTD'] != null ? parseFloat(r['Cumulative\nContributions YTD']) : null,
    notes: r['Notes'] || null,
  })).filter(w => w.balance != null);
  console.log(`Weekly Balance: ${weeklyBalance.length}`);

  // ===== FUND PRICES =====
  const fpSheet = wb.Sheets['Fund Prices'];
  const fpData = XLSX.utils.sheet_to_json(fpSheet, { header: 1 });
  // Row 0 = headers (fund names), Row 1 = tickers, Row 2 = "Price" labels, Row 3+ = data
  const tickers = fpData[1] || [];
  const fundPrices = [];
  for (let i = 3; i < fpData.length; i++) {
    const row = fpData[i];
    if (!row[0]) continue;
    const entry = { date: parseDate(row[0]), prices: {} };
    for (let j = 1; j < tickers.length; j++) {
      if (tickers[j] && row[j] != null) {
        entry.prices[tickers[j]] = parseFloat(row[j]);
      }
    }
    if (Object.keys(entry.prices).length > 0) {
      fundPrices.push(entry);
    }
  }
  console.log(`Fund Prices: ${fundPrices.length} weeks`);

  // ===== ACCOUNT SUMMARY =====
  const account = {
    balance: endBal,
    as_of_date: '7/9/2026',
    opening_balance: beginBal,
    contributions_ytd: deposits,
  };

  // ===== WRITE TO REDIS =====
  console.log('\nWriting to Redis...');
  await redisSet('account', account);
  console.log('  ✓ account');

  await redisSet('transactions', transactions);
  console.log('  ✓ transactions');

  await redisSet('transfer_detail', transferDetail);
  console.log('  ✓ transfer_detail');

  await redisSet('trades', trades);
  console.log('  ✓ trades');

  await redisSet('dividend_detail', dividendDetail);
  console.log('  ✓ dividend_detail');

  await redisSet('ytd_summary', ytdSummary);
  console.log('  ✓ ytd_summary');

  await redisSet('fund_universe', fundUniverse);
  console.log('  ✓ fund_universe');

  await redisSet('weekly_balance', weeklyBalance);
  console.log('  ✓ weekly_balance');

  await redisSet('fund_prices', fundPrices);
  console.log('  ✓ fund_prices');

  console.log('\nSeed complete! All data loaded into Redis with tt_ prefix.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
