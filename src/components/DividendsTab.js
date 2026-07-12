'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2a3f55', '#4a7c9e', '#6a9dbe', '#8dbddb', '#a89272', '#c9b899', '#2d8a4e', '#d4a574'];

function fmt(n) {
  if (n == null) return '—';
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DividendsTab({ data }) {
  const { dividendDetail, ytdSummary } = data;

  // Monthly totals
  const monthly = useMemo(() => {
    const m = {};
    (dividendDetail || []).forEach(dd => {
      const month = dd.date?.substring(0, 7);
      if (!month) return;
      if (!m[month]) m[month] = 0;
      m[month] += dd.amount || 0;
    });
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        total: parseFloat(total.toFixed(2)),
      }));
  }, [dividendDetail]);

  // By fund
  const byFund = useMemo(() => {
    const f = {};
    (dividendDetail || []).forEach(dd => {
      const key = dd.ticker || dd.fund;
      if (!key) return;
      if (!f[key]) f[key] = { name: key, fund: dd.fund || key, total: 0 };
      f[key].total += dd.amount || 0;
    });
    return Object.values(f).sort((a, b) => b.total - a.total);
  }, [dividendDetail]);

  const totalDividends = byFund.reduce((s, f) => s + f.total, 0);

  // Annualized yield estimate
  const currentBalance = ytdSummary?.ending_balance || 61221.54;
  const monthsCovered = monthly.length || 1;
  const annualizedDividends = (totalDividends / monthsCovered) * 12;
  const annualizedYield = (annualizedDividends / currentBalance) * 100;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-header">YTD Dividends</div>
          <div className="metric-value gain">{fmt(totalDividends)}</div>
          <div className="metric-label">{(dividendDetail || []).length} payments</div>
        </div>
        <div className="card">
          <div className="card-header">Annualized Yield</div>
          <div className="metric-value" style={{ color: 'var(--blue-500)' }}>
            {annualizedYield.toFixed(2)}%
          </div>
          <div className="metric-label">{fmt(annualizedDividends)} projected annual</div>
        </div>
        <div className="card">
          <div className="card-header">Latest Month</div>
          <div className="metric-value gain">
            {monthly.length > 0 ? fmt(monthly[monthly.length - 1].total) : '—'}
          </div>
          <div className="metric-label">{monthly.length > 0 ? monthly[monthly.length - 1].month : '—'}</div>
        </div>
      </div>

      {/* Monthly bar chart */}
      {monthly.length > 0 && (
        <div className="card">
          <div className="card-header">Monthly Dividend Income</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sand-200)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => '$' + v} />
                <Tooltip
                  formatter={v => fmt(v)}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="total" name="Dividends" fill="var(--green-gain)" radius={[4, 4, 0, 0]}>
                  {monthly.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === monthly.length - 1 ? '#1a6b3a' : 'var(--green-gain)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By-fund breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">By Fund</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byFund}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {byFund.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Fund Dividend Ranking</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {byFund.map((f, i) => (
              <div key={f.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: COLORS[i % COLORS.length],
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-mid)' }}>{f.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(f.total)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-light)', width: 40, textAlign: 'right' }}>
                  {((f.total / totalDividends) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
