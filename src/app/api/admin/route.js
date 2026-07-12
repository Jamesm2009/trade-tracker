import { NextResponse } from 'next/server';
import redis, { key } from '@/lib/redis';

// Safely get a value from Redis - handles double-stringified data
async function safeGet(k) {
  let val = await redis.get(k);
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch (e) { /* already primitive string */ }
  }
  return val;
}

export async function POST(request) {
  try {
    const { action, payload } = await request.json();

    switch (action) {
      case 'update_balance': {
        const account = (await safeGet(key('account'))) || {};
        account.balance = payload.balance;
        account.as_of_date = payload.date;
        await redis.set(key('account'), account);

        // Also append to weekly balance
        const wb = (await safeGet(key('weekly_balance'))) || [];
        wb.push({
          date: payload.date,
          balance: payload.balance,
          contributions_ytd: payload.contributions_ytd || account.contributions_ytd || 0,
        });
        await redis.set(key('weekly_balance'), wb);

        // Update fund prices if provided
        if (payload.fund_prices && payload.fund_prices.length > 0) {
          const fp = (await safeGet(key('fund_prices'))) || [];
          fp.push({ date: payload.date, prices: payload.fund_prices });
          await redis.set(key('fund_prices'), fp);
        }

        return NextResponse.json({ success: true });
      }

      case 'add_transaction': {
        const txns = (await safeGet(key('transactions'))) || [];
        txns.push(payload);
        await redis.set(key('transactions'), txns);

        // If transfer, add to transfer detail
        if (payload.type === 'Transfer' && payload.details) {
          const td = (await safeGet(key('transfer_detail'))) || [];
          for (const d of payload.details) {
            td.push({ ...d, date: payload.date, confirmation: payload.confirmation });
          }
          await redis.set(key('transfer_detail'), td);
        }

        // If dividend, add to dividend detail
        if (payload.type === 'Dividend' && payload.details) {
          const dd = (await safeGet(key('dividend_detail'))) || [];
          for (const d of payload.details) {
            dd.push({ ...d, date: payload.date, confirmation: payload.confirmation });
          }
          await redis.set(key('dividend_detail'), dd);
        }

        return NextResponse.json({ success: true });
      }

      case 'update_balance_full': {
        // Update account balance
        const acct = (await safeGet(key('account'))) || {};
        acct.balance = payload.balance;
        acct.as_of_date = payload.date;
        await redis.set(key('account'), acct);

        // Update fund ending balances in ytd_summary
        if (payload.funds) {
          const ytd = (await safeGet(key('ytd_summary'))) || {};
          ytd.ending_balance = payload.balance;
          ytd.funds = payload.funds;
          await redis.set(key('ytd_summary'), ytd);
        }

        // Append to weekly balance history
        const wbl = (await safeGet(key('weekly_balance'))) || [];
        wbl.push({ date: payload.date, balance: payload.balance });
        await redis.set(key('weekly_balance'), wbl);

        return NextResponse.json({ success: true });
      }

      case 'update_trade': {
        const trades = (await safeGet(key('trades'))) || [];
        const idx = trades.findIndex(t => t.trade_num === payload.trade_num);
        if (idx >= 0) {
          trades[idx] = { ...trades[idx], ...payload };
        } else {
          trades.push(payload);
        }
        await redis.set(key('trades'), trades);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
