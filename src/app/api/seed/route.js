import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIX = 'tt_';

// Known ticker corrections from spreadsheet errors
const TICKER_FIXES = {
  'MQLAX': 'MCZZX',
};

function fixTicker(t) {
  return TICKER_FIXES[t] || t;
}

function fixTickers(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    const fixed = { ...item };
    if (fixed.ticker) fixed.ticker = fixTicker(fixed.ticker);
    return fixed;
  });
}

export async function POST(request) {
  try {
    const data = await request.json();

    // Fix known bad tickers in dividend detail and transfer detail
    const dividendDetail = fixTickers(data.dividendDetail);
    const transferDetail = fixTickers(data.transferDetail);

    await Promise.all([
      redis.set(PREFIX + 'account', data.account),
      redis.set(PREFIX + 'transactions', data.transactions),
      redis.set(PREFIX + 'transfer_detail', transferDetail),
      redis.set(PREFIX + 'trades', data.trades),
      redis.set(PREFIX + 'dividend_detail', dividendDetail),
      redis.set(PREFIX + 'ytd_summary', data.ytdSummary),
      redis.set(PREFIX + 'fund_universe', data.fundUniverse),
      redis.set(PREFIX + 'weekly_balance', data.weeklyBalance),
      redis.set(PREFIX + 'fund_prices', data.fundPrices),
    ]);

    return NextResponse.json({ success: true, counts: data.counts });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
