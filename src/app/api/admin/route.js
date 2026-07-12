import { NextResponse } from 'next/server';
import redis, { key } from '@/lib/redis';

export async function POST(request) {
  try {
    const { action, payload } = await request.json();

    switch (action) {
      case 'update_balance': {
        const account = (await redis.get(key('account'))) || {};
        account.balance = payload.balance;
        account.as_of_date = payload.date;
        await redis.set(key('account'), account);

        // Also append to weekly balance
        const wb = (await redis.get(key('weekly_balance'))) || [];
        wb.push({
          date: payload.date,
          balance: payload.balance,
          contributions_ytd: payload.contributions_ytd || account.contributions_ytd || 0,
        });
        await redis.set(key('weekly_balance'), wb);

        // Update fund prices if provided
        if (payload.fund_prices && payload.fund_prices.length > 0) {
          const fp = (await redis.get(key('fund_prices'))) || [];
          fp.push({ date: payload.date, prices: payload.fund_prices });
          await redis.set(key('fund_prices'), fp);
        }

        return NextResponse.json({ success: true });
      }

      case 'add_transaction': {
        const txns = (await redis.get(key('transactions'))) || [];
        txns.push(payload);
        await redis.set(key('transactions'), txns);

        // If transfer, add to transfer detail
        if (payload.type === 'Transfer' && payload.details) {
          const td = (await redis.get(key('transfer_detail'))) || [];
          for (const d of payload.details) {
            td.push({ ...d, date: payload.date, confirmation: payload.confirmation });
          }
          await redis.set(key('transfer_detail'), td);
        }

        // If dividend, add to dividend detail
        if (payload.type === 'Dividend' && payload.details) {
          const dd = (await redis.get(key('dividend_detail'))) || [];
          for (const d of payload.details) {
            dd.push({ ...d, date: payload.date, confirmation: payload.confirmation });
          }
          await redis.set(key('dividend_detail'), dd);
        }

        return NextResponse.json({ success: true });
      }

      case 'update_trade': {
        const trades = (await redis.get(key('trades'))) || [];
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
