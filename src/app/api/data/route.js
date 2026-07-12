import { NextResponse } from 'next/server';
import redis, { key } from '@/lib/redis';

export const dynamic = 'force-dynamic';

async function safeGet(k) {
  let val = await redis.get(k);
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch (e) { /* primitive */ }
  }
  return val;
}

export async function GET() {
  try {
    const [
      account, transactions, trades, transferDetail,
      dividendDetail, fundUniverse, weeklyBalance, ytdSummary, fundPrices,
    ] = await Promise.all([
      safeGet(key('account')), safeGet(key('transactions')), safeGet(key('trades')),
      safeGet(key('transfer_detail')), safeGet(key('dividend_detail')), safeGet(key('fund_universe')),
      safeGet(key('weekly_balance')), safeGet(key('ytd_summary')), safeGet(key('fund_prices')),
    ]);

    return NextResponse.json({
      account: account || {},
      transactions: transactions || [],
      trades: trades || [],
      transferDetail: transferDetail || [],
      dividendDetail: dividendDetail || [],
      fundUniverse: fundUniverse || [],
      weeklyBalance: weeklyBalance || [],
      ytdSummary: ytdSummary || {},
      fundPrices: fundPrices || [],
    });
  } catch (error) {
    console.error('Redis fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
