'use client';

import { useState, useMemo } from 'react';

function fmt(n) {
  if (n == null) return '—';
  const s = n < 0 ? '-' : '';
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TYPE_COLORS = {
  Transfer: { bg: '#e3f0fd', text: '#1565c0' },
  Dividend: { bg: '#e8f5e9', text: '#2d8a4e' },
  Fee: { bg: '#fde8e6', text: '#c0392b' },
  'Employee Contribution': { bg: '#f3e5f5', text: '#7b1fa2' },
  'Employer Contribution': { bg: '#fff3e0', text: '#e65100' },
};

export default function ActivityTab({ data }) {
  const { transactions, transferDetail, dividendDetail } = data;
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const types = useMemo(() => {
    const t = new Set();
    (transactions || []).forEach(tx => t.add(tx.type));
    return ['All', ...Array.from(t).sort()];
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...(transactions || [])];
    if (filter !== 'All') list = list.filter(tx => tx.type === filter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(tx =>
        tx.confirmation?.toString().includes(term) ||
        tx.type?.toLowerCase().includes(term) ||
        tx.notes?.toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    const c = {};
    (transactions || []).forEach(tx => {
      c[tx.type] = (c[tx.type] || 0) + 1;
    });
    return c;
  }, [transactions]);

  function getDetail(tx) {
    if (tx.type === 'Transfer') {
      return (transferDetail || []).filter(
        td => td.confirmation?.toString() === tx.confirmation?.toString()
      );
    }
    if (tx.type === 'Dividend') {
      return (dividendDetail || []).filter(
        dd => dd.confirmation?.toString() === tx.confirmation?.toString()
      );
    }
    return [];
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Filter bar */}
      <div className="card" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by confirmation # or notes…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 14px',
              fontSize: 14,
              border: '1px solid var(--sand-200)',
              borderRadius: 'var(--radius)',
              outline: 'none',
              width: 280,
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: filter === t ? 'white' : 'var(--text-mid)',
                  background: filter === t ? 'var(--navy-800)' : 'var(--sand-100)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              >
                {t} {t !== 'All' && counts[t] ? `(${counts[t]})` : t === 'All' ? `(${transactions?.length || 0})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Confirmation</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => {
              const detail = getDetail(tx);
              const isExpanded = expanded === i;
              const tc = TYPE_COLORS[tx.type] || { bg: '#f5f5f5', text: '#333' };

              return (
                <tbody key={i}>
                  <tr>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                      {tx.date ? new Date(tx.date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text-mid)' }}>
                      {tx.confirmation}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: tc.bg,
                        color: tc.text,
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 14,
                      color: tx.amount < 0 ? 'var(--red-loss)' : 'var(--text-dark)',
                    }}>
                      {fmt(tx.amount)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {tx.detail_status || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 200 }}>
                      {tx.notes || '—'}
                    </td>
                    <td>
                      {detail.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : i)}
                          style={{
                            fontSize: 12,
                            color: 'var(--blue-500)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {isExpanded ? '▾' : '▸'} {detail.length}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && detail.map((d, j) => (
                    <tr key={`detail-${j}`} style={{ background: 'var(--ivory)' }}>
                      <td colSpan={2} style={{ paddingLeft: 40, fontSize: 12, color: 'var(--text-light)' }}>
                        {d.source}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{
                          fontWeight: 600,
                          color: d.direction === 'Buy' ? 'var(--green-gain)' : 'var(--red-loss)',
                        }}>
                          {d.direction || ''}
                        </span>
                        {' '}
                        <span style={{ color: 'var(--text-mid)' }}>{d.ticker || d.fund || d.fund_name || ''}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(d.amount)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        {d.shares ? d.shares.toFixed(4) + ' sh' : ''}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        {d.price ? '@$' + d.price.toFixed(2) : ''}
                      </td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-light)' }}>
            No transactions match your filter.
          </div>
        )}
      </div>

      {/* Export */}
      <div style={{ textAlign: 'right' }}>
        <button
          onClick={() => {
            const rows = [['Date', 'Confirmation', 'Type', 'Amount', 'Status', 'Notes']];
            filtered.forEach(tx => {
              rows.push([
                tx.date || '',
                tx.confirmation || '',
                tx.type || '',
                tx.amount || '',
                tx.detail_status || '',
                tx.notes || '',
              ]);
            });
            const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'trade_tracker_activity.csv';
            a.click();
          }}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--navy-800)',
            background: 'var(--sand-200)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
