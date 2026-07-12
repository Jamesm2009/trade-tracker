'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fmtDate } from '@/lib/format';
import PerformanceCharts from './PerformanceCharts';

const PIE_COLORS = [
  '#2a3f55', '#4a7c9e', '#6a9dbe', '#8dbddb',
  '#a89272', '#c9b899', '#e3d5bf', '#8a7356',
  '#2d8a4e', '#c0392b', '#6b5b8d', '#d4a574',
];

const ASSET_CLASS_COLORS = {
  'Bonds': '#2a3f55',
  'Commodities': '#a89272',
  'Intl-Equities': '#6a9dbe',
  'US-Equities': '#2d8a4e',
  'Cash': '#c9b899',
  'Real Estate': '#8a7356',
  'Blended': '#6b5b8d',
};

const CATEGORY_TO_CLASS = {
  'Cash': 'Cash', 'Commodity': 'Commodities',
  'Intl Value': 'Intl-Equities', 'Intl Growth': 'Intl-Equities', 'Intl Blend': 'Intl-Equities',
  'Core Bond': 'Bonds', 'High Yield': 'Bonds', 'Bond Index': 'Bonds',
  'Multi-Sector Bond': 'Bonds', 'TIPS/Inflation': 'Bonds', 'Global Bond': 'Bonds',
  'Large Growth': 'US-Equities', 'Large Value': 'US-Equities', 'Large Blend': 'US-Equities',
  'Mid Cap': 'US-Equities', 'Small Cap': 'US-Equities', 'S&P 500': 'US-Equities',
  'Target Date 2060': 'Blended', 'REIT': 'Real Estate', 'Real Estate': 'Real Estate',
};

function fmt(n, decimals = 0) {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

function pct(n) {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

export default function PortfolioTab({ data }) {
  const { account, ytdSummary, fundUniverse } = data;
  const [allocView, setAllocView] = useState('fund');

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

  const categoryMap = useMemo(() => {
    const map = {};
    (fundUniverse || []).forEach(f => {
      if (f.ticker) map[f.ticker] = f.category || 'Other';
      if (f.name) map[f.name] = f.category || 'Other';
    });
    return map;
  }, [fundUniverse]);

  const fundData = ytdSummary?.funds || [];
  const allocData = fundData
    .filter(f => f.ending_balance > 0)
    .sort((a, b) => b.ending_balance - a.ending_balance)
    .map(f => ({
      name: f.ticker && f.ticker !== '—' ? f.ticker : f.fund,
      value: f.ending_balance, ticker: f.ticker, fullName: f.fund,
      category: categoryMap[f.ticker] || categoryMap[f.fund] || 'Other',
    }));

  const totalAlloc = allocData.reduce((s, d) => s + d.value, 0);

  const classData = useMemo(() => {
    const classes = {};
    allocData.forEach(f => {
      const cls = CATEGORY_TO_CLASS[f.category] || 'Other';
      if (!classes[cls]) classes[cls] = { name: cls, value: 0 };
      classes[cls].value += f.value;
    });
    return Object.values(classes).sort((a, b) => b.value - a.value);
  }, [allocData]);

  // Fund-level market performance (recomputed dynamically so it reflects latest
  // weekly balance updates, not just the stale value from spreadsheet seed time)
  const fundPerformance = useMemo(() => {
    return fundData
      .filter(f => (f.ending_balance || 0) > 0 || (f.beginning_balance || 0) > 0)
      .map(f => {
        const marketChange = (f.ending_balance || 0) - (f.beginning_balance || 0)
          - (f.deposits || 0) - (f.transfers || 0) - (f.dividends || 0) - (f.fees || 0);
        return {
          fund: f.fund,
          ticker: f.ticker && f.ticker !== '—' ? f.ticker : f.fund,
          marketChange,
          dividends: f.dividends || 0,
          total: marketChange + (f.dividends || 0),
        };
      })
      .filter(f => f.ticker !== f.fund || f.marketChange !== 0) // keep General Account only if it moved
      .sort((a, b) => b.total - a.total);
  }, [fundData]);

  const totalMarketChangeCheck = fundPerformance.reduce((s, f) => s + f.marketChange, 0);

  const sources = ytdSummary?.sources || [];

  const pieData = allocView === 'fund' ? allocData : classData;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Top metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-header">Current Balance</div>
          <div className="metric-value">{fmt(currentBalance)}</div>
          <div className="metric-label">As of {fmtDate(account?.as_of_date)}</div>
        </div>
        <div className="card">
          <div className="card-header">YTD Return</div>
          <div className={`metric-value ${ytdReturn >= 0 ? 'gain' : 'loss'}`}>{fmt(ytdReturn)}</div>
          <div className="metric-label">{pct(ytdReturnPct)}</div>
        </div>
        <div className="card">
          <div className="card-header">Market Return</div>
          <div className={`metric-value ${marketReturn >= 0 ? 'gain' : 'loss'}`}>{fmt(marketReturn)}</div>
          <div className="metric-label">{pct(marketReturnPct)}</div>
        </div>
        <div className="card">
          <div className="card-header">New Money</div>
          <div className="metric-value" style={{ color: 'var(--blue-500)' }}>{fmt(newMoney)}</div>
          <div className="metric-label">Contributions YTD</div>
        </div>
      </div>

      {/* Return attribution + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">Return Attribution</div>
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {[
              { label: 'Opening Balance', value: fmt(openingBalance), color: 'var(--text-dark)' },
              { label: 'Contributions', value: '+' + fmt(totalDeposits), color: 'var(--blue-500)' },
              { label: 'Dividends', value: '+' + fmt(totalDividends), color: 'var(--green-gain)' },
              { label: 'Fees / Expenses', value: fmt(totalFees), color: 'var(--red-loss)' },
              { label: 'Market Change', value: (marketReturn >= 0 ? '+' : '') + fmt(marketReturn), color: marketReturn >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--sand-100)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0 0', borderTop: '2px solid var(--navy-800)',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Ending Balance</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy-800)' }}>{fmt(currentBalance)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-header" style={{ marginBottom: 0 }}>Current Allocation</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'fund', label: 'By Fund' },
                { id: 'class', label: 'By Asset Class' },
              ].map(v => (
                <button key={v.id} onClick={() => setAllocView(v.id)}
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 600,
                    color: allocView === v.id ? 'white' : 'var(--text-light)',
                    background: allocView === v.id ? 'var(--navy-800)' : 'var(--sand-100)',
                    border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 200, height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={allocView === 'class' ? (ASSET_CLASS_COLORS[d.name] || '#999') : PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => fmt(val)} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, fontSize: 13 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                      background: allocView === 'class' ? (ASSET_CLASS_COLORS[d.name] || '#999') : PIE_COLORS[i % PIE_COLORS.length],
                    }} />
                    <span style={{ flex: 1, color: 'var(--text-mid)' }}>
                      {allocView === 'fund' ? (d.ticker && d.ticker !== '—' ? d.ticker : d.fullName || d.name) : d.name}
                    </span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {((d.value / totalAlloc) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-light)', fontSize: 14, padding: 20 }}>
              No allocation data available. Seed data via Admin panel.
            </div>
          )}
        </div>
      </div>

      {/* Fund Performance - which funds made / lost money */}
      {fundPerformance.length > 0 && (
        <div className="card">
          <div className="card-header">Fund Performance (Market Movement, excl. deposits/transfers)</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fund</th>
                <th style={{ textAlign: 'right' }}>Market Change</th>
                <th style={{ textAlign: 'right' }}>Dividends</th>
                <th style={{ textAlign: 'right' }}>Total Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {fundPerformance.map(f => (
                <tr key={f.ticker}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{f.ticker}</td>
                  <td style={{ textAlign: 'right', fontSize: 13 }} className={f.marketChange >= 0 ? 'gain' : 'loss'}>
                    {f.marketChange >= 0 ? '+' : ''}{fmt(f.marketChange)}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--green-gain)' }}>
                    {f.dividends > 0 ? '+' + fmt(f.dividends) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 14, fontWeight: 700 }} className={f.total >= 0 ? 'gain' : 'loss'}>
                    {f.total >= 0 ? '+' : ''}{fmt(f.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 10 }}>
            Market Change = price movement on fund holdings only, isolated from money you moved in or out via deposits and trades.
          </div>
        </div>
      )}

      {/* Simplified contributions by source */}
      {sources.length > 0 && (
        <div className="card">
          <div className="card-header">Contributions by Source (LTD)</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sources.map(s => (
              <div key={s.source} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--sand-100)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{s.source}</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{fmt(s.deposits)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance charts */}
      <PerformanceCharts data={data} />
    </div>
  );
}
