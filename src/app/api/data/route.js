import { NextResponse } from 'next/server';
import redis, { key } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      account,
      transactions,
      trades,
      transferDetail,
      dividendDetail,
      fundUniverse,
      weeklyBalance,
      ytdSummary,
      fundPrices,
    ] = await Promise.all([
      redis.get(key('account')),
      redis.get(key('transactions')),
      redis.get(key('trades')),
      redis.get(key('transfer_detail')),
      redis.get(key('dividend_detail')),
      redis.get(key('fund_universe')),
      redis.get(key('weekly_balance')),
      redis.get(key('ytd_summary')),
      redis.get(key('fund_prices')),
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
