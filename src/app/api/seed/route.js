import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIX = 'tt_';

const TICKER_FIXES = { 'MQLAX': 'MCZZX' };
function fixTicker(t) { return TICKER_FIXES[t] || t; }
function fixTickers(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    const fixed = { ...item };
    if (fixed.ticker) fixed.ticker = fixTicker(fixed.ticker);
    return fixed;
  });
}

// 13 verified rebalance decisions for 2026
const TRADE_DECISIONS = [
  {trade_num:1,date:"2026-01-16",description:"COSYX, GCCUX, Cash \u2192 FBNRX, NOBOX, PIMIX, PRRIX",funds_sold:"COSYX, GCCUX, Cash",funds_bought:"FBNRX, NOBOX, PIMIX, PRRIX",total_sold:14322.85,total_bought:14322.85,status:"Closed",notes:null,macro_regime:null},
  {trade_num:2,date:"2026-01-23",description:"Rebalance to PIMIX 30%, PRRIX 20%, NOBOX 20%, FBNRX 10%, TRRJX 5%, Cash 15%",funds_sold:"PIMIX, PRRIX, TRRJX, FBNRX",funds_bought:"Cash, NOBOX",total_sold:8567.73,total_bought:8567.73,status:"Closed",notes:"Rebalancer #620520637. Executed 1/23.",macro_regime:null},
  {trade_num:3,date:"2026-01-23",description:"Rebalance to PIMIX 20%, PRRIX 15%, NOBOX 15%, Cash 40%, FBNRX 5%, TRRJX 5%",funds_sold:"FBNRX, NOBOX, PIMIX, PRRIX, TRRJX",funds_bought:"Cash",total_sold:26703.45,total_bought:26703.45,status:"Closed",notes:"Rebalancer #620734247. Setup 1/23, executed 1/26.",macro_regime:null},
  {trade_num:4,date:"2026-01-26",description:"FBNRX, NOBOX, PIMIX, PRRIX \u2192 Cash",funds_sold:"FBNRX, NOBOX, PIMIX, PRRIX",funds_bought:"Cash",total_sold:7981.44,total_bought:7981.44,status:"Closed",notes:"Executed 1/27.",macro_regime:null},
  {trade_num:5,date:"2026-01-27",description:"FBNRX, PIMIX \u2192 NOBOX, PRRIX, Cash",funds_sold:"FBNRX, PIMIX",funds_bought:"NOBOX, PRRIX, Cash",total_sold:2839.29,total_bought:2839.29,status:"Closed",notes:"Executed 1/30.",macro_regime:null},
  {trade_num:6,date:"2026-02-01",description:"Cash \u2192 NOBOX, PIMIX, PRRIX",funds_sold:"Cash",funds_bought:"NOBOX, PIMIX, PRRIX",total_sold:6221.99,total_bought:6221.99,status:"Closed",notes:"Executed 2/2. Redeploy cash to bonds.",macro_regime:null},
  {trade_num:7,date:"2026-02-02",description:"Cash \u2192 NOBOX, PIMIX, PRRIX",funds_sold:"Cash",funds_bought:"NOBOX, PIMIX, PRRIX",total_sold:8524.66,total_bought:8524.66,status:"Closed",notes:"Executed 2/3.",macro_regime:null},
  {trade_num:8,date:"2026-02-03",description:"Cash \u2192 FBNRX, GCCUX",funds_sold:"Cash",funds_bought:"FBNRX, GCCUX",total_sold:1252.32,total_bought:1252.32,status:"Closed",notes:"Executed 2/9.",macro_regime:null},
  {trade_num:9,date:"2026-02-22",description:"Cash \u2192 TRRJX",funds_sold:"Cash",funds_bought:"TRRJX",total_sold:3098.88,total_bought:3098.88,status:"Closed",notes:"Executed 2/23.",macro_regime:null},
  {trade_num:10,date:"2026-02-25",description:"FBNRX, GCCUX, JLGMX, NOBOX, TRRJX \u2192 Cash",funds_sold:"FBNRX, GCCUX, JLGMX, NOBOX, TRRJX",funds_bought:"Cash",total_sold:3418.72,total_bought:3418.72,status:"Closed",notes:"Liquidate diversified mix to cash.",macro_regime:null},
  {trade_num:11,date:"2026-04-08",description:"COSYX, FBNRX, JLGMX, MCZZX, PIMIX, PRRIX \u2192 Cash",funds_sold:"COSYX, FBNRX, JLGMX, MCZZX, PIMIX, PRRIX",funds_bought:"Cash",total_sold:15721.06,total_bought:15721.06,status:"Closed",notes:"Major liquidation to cash.",macro_regime:null},
  {trade_num:12,date:"2026-04-10",description:"COSYX, FBNRX \u2192 MCZZX, PIMIX, PRRIX, Cash",funds_sold:"COSYX, FBNRX",funds_bought:"MCZZX, PIMIX, PRRIX, Cash",total_sold:3427.57,total_bought:3427.57,status:"Closed",notes:"Partial redeploy from intl/global to core bonds.",macro_regime:null},
  {trade_num:13,date:"2026-04-25",description:"PRRIX, Cash \u2192 COSYX, MCZZX, NOBOX, PIMIX, PRRIX",funds_sold:"PRRIX, Cash",funds_bought:"COSYX, MCZZX, NOBOX, PIMIX, PRRIX",total_sold:12305.66,total_bought:12305.66,status:"Open",notes:"Rebalancer #663606218. Redeploy cash back into diversified bonds + intl.",macro_regime:null},
];

export async function POST(request) {
  try {
    const data = await request.json();

    const dividendDetail = fixTickers(data.dividendDetail);
    const transferDetail = fixTickers(data.transferDetail);

    await Promise.all([
      redis.set(PREFIX + 'account', data.account),
      redis.set(PREFIX + 'transactions', data.transactions),
      redis.set(PREFIX + 'transfer_detail', transferDetail),
      redis.set(PREFIX + 'trades', TRADE_DECISIONS),
      redis.set(PREFIX + 'dividend_detail', dividendDetail),
      redis.set(PREFIX + 'ytd_summary', data.ytdSummary),
      redis.set(PREFIX + 'fund_universe', data.fundUniverse),
      redis.set(PREFIX + 'weekly_balance', data.weeklyBalance),
      redis.set(PREFIX + 'fund_prices', data.fundPrices),
    ]);

    return NextResponse.json({ success: true, counts: { ...data.counts, trades: TRADE_DECISIONS.length } });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
