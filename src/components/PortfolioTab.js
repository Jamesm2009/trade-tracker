'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PIE_COLORS = [
  '#2a3f55', '#4a7c9e', '#6a9dbe', '#8dbddb',
  '#a89272', '#c9b899', '#e3d5bf', '#8a7356',
  '#2d8a4e', '#c0392b', '#6b5b8d', '#d4a574',
];

function fmt(n, decimals = 0) {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pct(n) {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

export default function PortfolioTab({ data }) {
  const { account, ytdSummary, transactions, fundUniverse } = data;

  const openingBalance = ytdSummary?.beginning_balance || 56248.10;
  const currentBalance = ytdSummary?.ending_balance || account?.balance || 61221.54;
  const totalDeposits = ytdSummary?.total_deposits || 3127.81;
  const totalDividends = ytdSummary?.total_dividends || 898.73;
  const totalFees = ytdSummary?.total_fees || -120.37;
  const totalChange = ytdSummary?.total_change || 1067.27;

  const ytdReturn = currentBalance - openingBalance;
  const ytdReturnPct = (ytdReturn / openingBalance) * 100;
  const newMoney = totalDeposits;
  const marketReturn = ytdReturn - newMoney;
  const marketReturnPct = (marketReturn / openingBalance) * 100;

  // Allocation from YTD summary fund data
  const fundData = ytdSummary?.funds || [];
  const allocData = fundData
    .filter(f => f.ending_balance > 0)
    .sort((a, b) => b.ending_balance - a.ending_balance)
    .map(f => ({
      name: f.fund.length > 25 ? f.ticker : f.fund,
      value: f.ending_balance,
      ticker: f.ticker,
      fullName: f.fund,
    }));

  const totalAlloc = allocData.reduce((s, d) => s + d.value, 0);

  // Source breakdown
  const sources = ytdSummary?.sources || [];

  // Weekly balance history
  const balanceHistory = data.weeklyBalance || [];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Top metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-header">Current Balance</div>
          <div className="metric-value">{fmt(currentBalance)}</div>
          <div className="metric-label">As of {account?.as_of_date || '7/9/2026'}</div>
        </div>

        <div className="card">
          <div className="card-header">YTD Return</div>
          <div className={`metric-value ${ytdReturn >= 0 ? 'gain' : 'loss'}`}>
            {fmt(ytdReturn)}
          </div>
          <div className="metric-label">{pct(ytdReturnPct)}</div>
        </div>

        <div className="card">
          <div className="card-header">Market Return</div>
          <div className={`metric-value ${marketReturn >= 0 ? 'gain' : 'loss'}`}>
            {fmt(marketReturn)}
          </div>
          <div className="metric-label">{pct(marketReturnPct)}</div>
        </div>

        <div className="card">
          <div className="card-header">New Money</div>
          <div className="metric-value" style={{ color: 'var(--blue-500)' }}>
            {fmt(newMoney)}
          </div>
          <div className="metric-label">Contributions + Dividends</div>
        </div>
      </div>

      {/* Return attribution + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Attribution */}
        <div className="card">
          <div className="card-header">Return Attribution</div>
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {[
              { label: 'Opening Balance', value: fmt(openingBalance), color: 'var(--text-dark)' },
              { label: 'Contributions', value: '+' + fmt(totalDeposits), color: 'var(--blue-500)' },
              { label: 'Dividends', value: '+' + fmt(totalDividends), color: 'var(--green-gain)' },
              { label: 'Fees / Expenses', value: fmt(totalFees), color: 'var(--red-loss)' },
              { label: 'Market Change', value: (totalChange >= 0 ? '+' : '') + fmt(totalChange), color: totalChange >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--sand-100)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0 0',
              borderTop: '2px solid var(--navy-800)',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Ending Balance</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy-800)' }}>
                {fmt(currentBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Allocation pie */}
        <div className="card">
          <div className="card-header">Current Allocation</div>
          {allocData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 200, height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={allocData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {allocData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => fmt(val)}
                      contentStyle={{ fontSize: 13, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, fontSize: 13 }}>
                {allocData.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 0',
                  }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, color: 'var(--text-mid)' }}>{d.ticker || d.name}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {((d.value / totalAlloc) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-light)', fontSize: 14, padding: 20 }}>
              No allocation data available. Run seed script to load data.
            </div>
          )}
        </div>
      </div>

      {/* Source breakdown */}
      {sources.length > 0 && (
        <div className="card">
          <div className="card-header">YTD By Source</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th style={{ textAlign: 'right' }}>Deposits</th>
                <th style={{ textAlign: 'right' }}>Fees</th>
                <th style={{ textAlign: 'right' }}>Dividends</th>
                <th style={{ textAlign: 'right' }}>Growth</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.source}>
                  <td style={{ fontWeight: 600 }}>{s.source}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(s.deposits)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red-loss)' }}>{fmt(s.fees)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green-gain)' }}>{fmt(s.dividends)}</td>
                  <td style={{ textAlign: 'right' }} className={s.growth >= 0 ? 'gain' : 'loss'}>
                    {fmt(s.growth)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
