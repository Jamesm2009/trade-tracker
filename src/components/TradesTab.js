'use client';

import { useState } from 'react';

function fmt(n) {
  if (n == null) return '—';
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TradesTab({ data }) {
  const { trades, transferDetail } = data;
  const [expanded, setExpanded] = useState(null);

  if (!trades || trades.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>
        No trade decisions recorded yet. Add trades via the Admin panel.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-header">Total Trades</div>
          <div className="metric-value">{trades.length}</div>
        </div>
        <div className="card">
          <div className="card-header">Open</div>
          <div className="metric-value" style={{ color: 'var(--blue-500)' }}>
            {trades.filter(t => t.status && t.status.toLowerCase().includes('open')).length}
          </div>
        </div>
        <div className="card">
          <div className="card-header">Closed</div>
          <div className="metric-value" style={{ color: 'var(--tan-500)' }}>
            {trades.filter(t => t.status && t.status.toLowerCase().includes('closed')).length}
          </div>
        </div>
      </div>

      {/* Trade cards */}
      {[...trades].reverse().map((trade) => {
        const isOpen = trade.status && trade.status.toLowerCase().includes('open');
        const isExpanded = expanded === trade.trade_num;

        // Find related transfers
        const relatedTransfers = (transferDetail || []).filter(td => {
          if (!td.date || !trade.date) return false;
          const tdDate = new Date(td.date).toDateString();
          const trDate = new Date(trade.date).toDateString();
          return tdDate === trDate;
        });

        return (
          <div key={trade.trade_num} className="card" style={{
            borderLeft: `4px solid ${isOpen ? 'var(--blue-500)' : 'var(--sand-400)'}`,
          }}>
            {/* Trade header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--blue-500)',
                  }}>
                    Trade #{trade.trade_num}
                  </span>
                  <span className={`badge ${isOpen ? 'badge-open' : 'badge-closed'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy-800)' }}>
                  {trade.description}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {fmtDate(trade.date)}
                </div>
                {trade.status && !isOpen && (
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                    {trade.status}
                  </div>
                )}
              </div>
            </div>

            {/* Trade details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              padding: '12px 0',
              borderTop: '1px solid var(--sand-100)',
              borderBottom: '1px solid var(--sand-100)',
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 2 }}>Sold</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{trade.funds_sold || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                  {trade.total_sold ? fmt(trade.total_sold) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 2 }}>Bought</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{trade.funds_bought || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                  {trade.total_bought ? fmt(trade.total_bought) : '—'}
                </div>
              </div>
              {trade.realized_pl != null && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 2 }}>P&L</div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: trade.realized_pl >= 0 ? 'var(--green-gain)' : 'var(--red-loss)',
                  }}>
                    {trade.realized_pl >= 0 ? '+' : '-'}{fmt(trade.realized_pl)}
                  </div>
                </div>
              )}
              {trade.days_since != null && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 2 }}>Holding Period</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{trade.days_since} days</div>
                </div>
              )}
            </div>

            {/* Notes & Macro Regime */}
            {(trade.notes || trade.macro_regime) && (
              <div style={{ padding: '12px 0', fontSize: 14 }}>
                {trade.macro_regime && (
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: 'var(--ivory)',
                    border: '1px solid var(--sand-200)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--brown-600)',
                    marginBottom: 8,
                  }}>
                    {trade.macro_regime}
                  </div>
                )}
                {trade.notes && (
                  <div style={{ color: 'var(--text-mid)', lineHeight: 1.6 }}>
                    {trade.notes}
                  </div>
                )}
              </div>
            )}

            {/* Expand for transfer detail */}
            {relatedTransfers.length > 0 && (
              <div style={{ paddingTop: 8 }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : trade.trade_num)}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--blue-500)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isExpanded ? '▾ Hide' : '▸ Show'} transfer detail ({relatedTransfers.length} lines)
                </button>

                {isExpanded && (
                  <div style={{ marginTop: 12, overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Direction</th>
                          <th>Fund</th>
                          <th style={{ textAlign: 'right' }}>Shares</th>
                          <th style={{ textAlign: 'right' }}>Price</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedTransfers.map((td, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 13 }}>{td.source}</td>
                            <td>
                              <span style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: td.direction === 'Buy' ? 'var(--green-gain)' : 'var(--red-loss)',
                              }}>
                                {td.direction}
                              </span>
                            </td>
                            <td style={{ fontSize: 13 }}>{td.ticker || td.fund}</td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                              {td.shares ? td.shares.toFixed(6) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                              {td.price ? '$' + td.price.toFixed(2) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                              {fmt(td.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
