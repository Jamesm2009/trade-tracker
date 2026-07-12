'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtDate } from '@/lib/format';

function fmt(n) {
  if (n == null) return '—';
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const BENCHMARK_TICKER = 'TRRLX'; // T Rowe Price Retirement 2060 Fund

export default function PerformanceCharts({ data }) {
  const [view, setView] = useState('contributions'); // 'contributions' | 'benchmark'
  const { transactions, weeklyBalance, fundPrices } = data;

  // ===== Chart 1: Contributions (LTD, cumulative) vs Weekly Balance =====
  const contribChartData = useMemo(() => {
    const contribs = (transactions || [])
      .filter(t => t.type === 'Employee Contribution' || t.type === 'Employer Contribution')
      .filter(t => t.date && t.amount != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const balances = (weeklyBalance || [])
      .filter(w => w.date && w.balance != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (contribs.length === 0 && balances.length === 0) return [];

    // Build union of all dates
    const allDates = new Set([
      ...contribs.map(c => c.date),
      ...balances.map(b => b.date),
    ]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    let cumulative = 0;
    let ci = 0;
    const balanceByDate = {};
    balances.forEach(b => { balanceByDate[b.date] = b.balance; });

    return sortedDates.map(date => {
      while (ci < contribs.length && new Date(contribs[ci].date) <= new Date(date)) {
        cumulative += contribs[ci].amount;
        ci++;
      }
      return {
        date,
        contributions: Math.round(cumulative),
        balance: balanceByDate[date] != null ? Math.round(balanceByDate[date]) : null,
      };
    });
  }, [transactions, weeklyBalance]);

  // ===== Chart 2: Portfolio % return vs Benchmark (TRRLX) % return =====
  const benchmarkChartData = useMemo(() => {
    const balances = (weeklyBalance || [])
      .filter(w => w.date && w.balance != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const benchPrices = (fundPrices || [])
      .filter(fp => fp.date && fp.prices && fp.prices[BENCHMARK_TICKER] != null)
      .map(fp => ({ date: fp.date, price: fp.prices[BENCHMARK_TICKER] }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (balances.length === 0 && benchPrices.length === 0) return { data: [], hasBenchmark: false };

    const firstBalance = balances[0]?.balance;
    const firstPrice = benchPrices[0]?.price;

    const allDates = new Set([
      ...balances.map(b => b.date),
      ...benchPrices.map(p => p.date),
    ]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    const balanceByDate = {};
    balances.forEach(b => { balanceByDate[b.date] = b.balance; });
    const priceByDate = {};
    benchPrices.forEach(p => { priceByDate[p.date] = p.price; });

    const rows = sortedDates.map(date => ({
      date,
      portfolio: balanceByDate[date] != null && firstBalance
        ? parseFloat((((balanceByDate[date] - firstBalance) / firstBalance) * 100).toFixed(2))
        : null,
      benchmark: priceByDate[date] != null && firstPrice
        ? parseFloat((((priceByDate[date] - firstPrice) / firstPrice) * 100).toFixed(2))
        : null,
    }));

    return { data: rows, hasBenchmark: benchPrices.length > 0 };
  }, [weeklyBalance, fundPrices]);

  const hasContribData = contribChartData.length >= 2;
  const hasBenchData = benchmarkChartData.data.length >= 2;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>Performance Over Time</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'contributions', label: 'Contributions vs Balance' },
            { id: 'benchmark', label: 'Portfolio vs Target Date 2060' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                color: view === v.id ? 'white' : 'var(--text-light)',
                background: view === v.id ? 'var(--navy-800)' : 'var(--sand-100)',
                border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'contributions' && (
        hasContribData ? (
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={contribChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sand-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => fmtDate(d)}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  labelFormatter={d => fmtDate(d)}
                  formatter={(val, name) => [fmt(val), name === 'contributions' ? 'Contributions (LTD)' : 'Account Balance']}
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                />
                <Legend
                  formatter={v => v === 'contributions' ? 'Contributions (LTD)' : 'Account Balance'}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  type="stepAfter"
                  dataKey="contributions"
                  stroke="var(--blue-500)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--green-gain)"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: 'var(--text-light)', fontSize: 14, padding: 30, textAlign: 'center' }}>
            Add more weekly balance updates via Admin to build this chart over time.
          </div>
        )
      )}

      {view === 'benchmark' && (
        hasBenchData && benchmarkChartData.hasBenchmark ? (
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={benchmarkChartData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sand-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => fmtDate(d)}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v + '%'} />
                <Tooltip
                  labelFormatter={d => fmtDate(d)}
                  formatter={(val, name) => [val + '%', name === 'portfolio' ? 'Your Portfolio' : 'Target Date 2060 (TRRLX)']}
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                />
                <Legend
                  formatter={v => v === 'portfolio' ? 'Your Portfolio' : 'Target Date 2060 (TRRLX)'}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line type="monotone" dataKey="portfolio" stroke="var(--navy-800)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="benchmark" stroke="var(--tan-500)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: 'var(--text-light)', fontSize: 14, padding: 30, textAlign: 'center' }}>
            No Target Date 2060 (TRRLX) price history yet. This builds automatically as weekly
            balances are logged and fund prices are captured over time.
          </div>
        )
      )}
    </div>
  );
}
