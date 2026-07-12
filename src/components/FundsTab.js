'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmtDate } from '@/lib/format';

function fmt(n) {
  if (n == null) return '—';
  const s = n < 0 ? '-' : '';
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FundsTab({ data }) {
  const { ytdSummary, transferDetail, dividendDetail } = data;
  const [selectedFund, setSelectedFund] = useState(null);

  const funds = useMemo(() => {
    return (ytdSummary?.funds || []).filter(f => f.ending_balance > 0 || f.beginning_balance > 0);
  }, [ytdSummary]);

  const activeFund = funds.find(f => f.ticker === selectedFund) || null;

  // Transfer activity for selected fund
  const fundTransfers = useMemo(() => {
    if (!selectedFund || !transferDetail) return [];
    return transferDetail
      .filter(td => td.ticker === selectedFund || td.fund_name === activeFund?.fund)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedFund, transferDetail, activeFund]);

  // Group transfers by month for chart
  const transfersByMonth = useMemo(() => {
    const months = {};
    fundTransfers.forEach(td => {
      const m = td.date?.substring(0, 7); // YYYY-MM
      if (!m) return;
      if (!months[m]) months[m] = { month: m, buys: 0, sells: 0 };
      if (td.direction === 'Buy') months[m].buys += td.amount || 0;
      else months[m].sells -= td.amount || 0;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [fundTransfers]);

  // Dividends for selected fund
  const fundDividends = useMemo(() => {
    if (!selectedFund || !dividendDetail) return [];
    return dividendDetail.filter(dd => dd.ticker === selectedFund);
  }, [selectedFund, dividendDetail]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Fund list */}
      <div className="card">
        <div className="card-header">Fund Holdings</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Ticker</th>
              <th style={{ textAlign: 'right' }}>Opening</th>
              <th style={{ textAlign: 'right' }}>Ending</th>
              <th style={{ textAlign: 'right' }}>Change</th>
              <th style={{ textAlign: 'right' }}>Shares</th>
            </tr>
          </thead>
          <tbody>
            {funds.map(f => {
              const change = (f.ending_balance || 0) - (f.beginning_balance || 0);
              const isSelected = f.ticker === selectedFund;
              return (
                <tr
                  key={f.ticker}
                  onClick={() => setSelectedFund(isSelected ? null : f.ticker)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'var(--ivory)' : undefined,
                  }}
                >
                  <td style={{
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 13,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {f.fund}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--blue-500)', fontSize: 13 }}>{f.ticker}</td>
                  <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(f.beginning_balance)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmt(f.ending_balance)}</td>
                  <td style={{ textAlign: 'right', fontSize: 13 }} className={change >= 0 ? 'gain' : 'loss'}>
                    {change >= 0 ? '+' : ''}{fmt(change)}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {f.shares ? f.shares.toFixed(2) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected fund detail */}
      {activeFund && (
        <>
          <div className="card" style={{ borderTop: '3px solid var(--blue-500)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>
                  {activeFund.fund}
                </div>
                <div style={{ fontSize: 14, color: 'var(--blue-500)', fontWeight: 600 }}>
                  {activeFund.ticker}
                </div>
              </div>
              <button
                onClick={() => setSelectedFund(null)}
                style={{
                  fontSize: 13,
                  color: 'var(--text-light)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
            }}>
              {[
                { label: 'Shares Held', value: activeFund.shares ? activeFund.shares.toFixed(4) : '—' },
                { label: 'Ending Balance', value: fmt(activeFund.ending_balance) },
                { label: 'Deposits', value: fmt(activeFund.deposits) },
                { label: 'Transfers (net)', value: fmt(activeFund.transfers) },
                { label: 'Dividends', value: fmt(activeFund.dividends), color: 'var(--green-gain)' },
                { label: 'Change in Value', value: fmt(activeFund.change), color: activeFund.change >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '12px',
                  background: 'var(--ivory)',
                  borderRadius: 'var(--radius)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.color || 'var(--navy-800)', marginTop: 4 }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer timeline */}
          {transfersByMonth.length > 0 && (
            <div className="card">
              <div className="card-header">Transfer Activity — {activeFund.ticker}</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={transfersByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sand-200)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
                    <Tooltip formatter={v => fmt(Math.abs(v))} />
                    <Bar dataKey="buys" name="Buys" fill="var(--green-gain)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="sells" name="Sells" fill="var(--red-loss)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Dividends from this fund */}
          {fundDividends.length > 0 && (
            <div className="card">
              <div className="card-header">Dividend History — {activeFund.ticker}</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {fundDividends.map((dd, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13 }}>{fmtDate(dd.date)}</td>
                      <td style={{ fontSize: 13 }}>{dd.source}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--green-gain)' }}>
                        {fmt(dd.amount)}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 13 }}>${dd.price?.toFixed(2) || '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                        {dd.shares?.toFixed(6) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
