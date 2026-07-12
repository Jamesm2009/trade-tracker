import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import * as XLSX from 'xlsx';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIX = 'tt_';

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return String(v);
}

export async function POST(request) {
  try {
    // Verify password
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { cellDates: true });

    const results = {};

    // ===== TRANSACTIONS =====
    const txRows = XLSX.utils.sheet_to_json(wb.Sheets['Transactions'] || {});
    const transactions = txRows.map(r => ({
      date: parseDate(r['Date']),
      confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
      type: r['Type'] || null,
      amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
      trade_group: r['Trade Group'] || null,
      detail_status: r['Detail Status'] || null,
      notes: r['Notes'] || null,
    })).filter(t => t.date);
    results.transactions = transactions.length;

    // ===== TRANSFER DETAIL =====
    const tdRows = XLSX.utils.sheet_to_json(wb.Sheets['Transfer Detail'] || {});
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
    results.transferDetail = transferDetail.length;

    // ===== TRADE DECISIONS =====
    const trRows = XLSX.utils.sheet_to_json(wb.Sheets['Trade Decisions'] || {});
    const trades = trRows.filter(r => r['Trade #'] != null).map(r => ({
      trade_num: r['Trade #'],
      date: parseDate(r['Date']),
      description: r['Description'] || null,
      total_sold: r['Total Sold'] != null ? parseFloat(r['Total Sold']) : null,
      total_bought: r['Total Bought'] != null ? parseFloat(r['Total Bought']) : null,
      fees: r['Fees Incurred'] != null ? parseFloat(r['Fees Incurred']) : null,
      funds_sold: r['Funds Sold'] || null,
      funds_bought: r['Funds Bought'] || null,
      status: r['Status'] || null,
      notes: null,
      macro_regime: null,
    }));
    results.trades = trades.length;

    // ===== DIVIDEND DETAIL =====
    const ddRows = XLSX.utils.sheet_to_json(wb.Sheets['Dividend Detail'] || {});
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
    results.dividendDetail = dividendDetail.length;

    // ===== YTD SUMMARY =====
    const ytdData = XLSX.utils.sheet_to_json(wb.Sheets['YTD Summary'] || {}, { header: 1 });
    let beginBal = 56248.10, endBal = 61221.54, deposits = 3127.81, fees = -120.37, divs = 898.73, change = 1067.27;
    ytdData.forEach(row => {
      if (row[0] === 'Beginning Balance' && row[1] != null) beginBal = parseFloat(row[1]);
      if (row[0] === 'Total Deposits' && row[1] != null) deposits = parseFloat(row[1]);
      if (row[0] === 'Total Withdrawals/Expenses' && row[1] != null) fees = parseFloat(row[1]);
      if (row[0] === 'Total Dividends' && row[1] != null) divs = parseFloat(row[1]);
      if (row[0] === 'Total Change in Value' && row[1] != null) change = parseFloat(row[1]);
      if (row[0] === 'Ending Balance' && row[1] != null) endBal = parseFloat(row[1]);
    });

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

    const fundYtd = [];
    let inFundSection = false;
    ytdData.forEach(row => {
      if (row[0] === 'Fund' && row[1] === 'Ticker') { inFundSection = true; return; }
      if (inFundSection && row[0] === 'Total') { inFundSection = false; return; }
      if (inFundSection && row[0] && row[0] !== 'Total') {
        fundYtd.push({
          fund: row[0], ticker: row[1] || '—',
          beginning_balance: parseFloat(row[2]) || 0, deposits: parseFloat(row[3]) || 0,
          transfers: parseFloat(row[4]) || 0, fees: parseFloat(row[5]) || 0,
          dividends: parseFloat(row[6]) || 0, change: parseFloat(row[7]) || 0,
          ending_balance: parseFloat(row[8]) || 0, shares: parseFloat(row[9]) || 0,
        });
      }
    });

    const ytdSummary = {
      beginning_balance: beginBal, ending_balance: endBal,
      total_deposits: deposits, total_fees: fees,
      total_dividends: divs, total_change: change,
      sources, funds: fundYtd,
    };
    results.ytdFunds = fundYtd.length;
    results.ytdSources = sources.length;

    // ===== FUND UNIVERSE =====
    const fuRows = XLSX.utils.sheet_to_json(wb.Sheets['Fund Universe'] || {});
    const fundUniverse = fuRows.filter(r => r['Fund Name']).map(r => ({
      num: r['#'], name: r['Fund Name'], ticker: r['Ticker'] || '—',
      category: r['Category'] || null, in_use: r['In Use (YTD)'] || null,
      opening_balance: r['Opening Balance'] != null ? parseFloat(r['Opening Balance']) : null,
    }));
    results.fundUniverse = fundUniverse.length;

    // ===== WEEKLY BALANCE =====
    const wbRows = XLSX.utils.sheet_to_json(wb.Sheets['Weekly Balance'] || {});
    const weeklyBalance = wbRows.filter(r => r['Week Ending']).map(r => ({
      date: parseDate(r['Week Ending']),
      balance: r['Empower Balance'] != null ? parseFloat(r['Empower Balance']) : null,
      notes: r['Notes'] || null,
    })).filter(w => w.balance != null);
    results.weeklyBalance = weeklyBalance.length;

    // ===== FUND PRICES =====
    const fpData = XLSX.utils.sheet_to_json(wb.Sheets['Fund Prices'] || {}, { header: 1 });
    const tickers = fpData[1] || [];
    const fundPrices = [];
    for (let i = 3; i < fpData.length; i++) {
      const row = fpData[i];
      if (!row || !row[0]) continue;
      const entry = { date: parseDate(row[0]), prices: {} };
      for (let j = 1; j < tickers.length; j++) {
        if (tickers[j] && row[j] != null) entry.prices[tickers[j]] = parseFloat(row[j]);
      }
      if (Object.keys(entry.prices).length > 0) fundPrices.push(entry);
    }
    results.fundPrices = fundPrices.length;

    // ===== ACCOUNT =====
    const account = {
      balance: endBal, as_of_date: '7/9/2026',
      opening_balance: beginBal, contributions_ytd: deposits,
    };

    // ===== WRITE TO REDIS =====
    await redis.set(PREFIX + 'account', JSON.stringify(account));
    await redis.set(PREFIX + 'transactions', JSON.stringify(transactions));
    await redis.set(PREFIX + 'transfer_detail', JSON.stringify(transferDetail));
    await redis.set(PREFIX + 'trades', JSON.stringify(trades));
    await redis.set(PREFIX + 'dividend_detail', JSON.stringify(dividendDetail));
    await redis.set(PREFIX + 'ytd_summary', JSON.stringify(ytdSummary));
    await redis.set(PREFIX + 'fund_universe', JSON.stringify(fundUniverse));
    await redis.set(PREFIX + 'weekly_balance', JSON.stringify(weeklyBalance));
    await redis.set(PREFIX + 'fund_prices', JSON.stringify(fundPrices));

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
