'use client';
import { useState, useRef, useMemo } from 'react';

export default function AdminTab({ data, onRefresh }) {
  const [activeForm, setActiveForm] = useState('balance');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // Get active funds from ytdSummary
  const activeFunds = useMemo(() => {
    return (data?.ytdSummary?.funds || []).filter(f => f.ending_balance > 0)
      .sort((a, b) => b.ending_balance - a.ending_balance);
  }, [data]);

  // Balance form state
  const [balDate, setBD] = useState(new Date().toISOString().split('T')[0]);
  const [balAmt, setBA] = useState('');
  const [fundBalances, setFundBalances] = useState({});

  // Trade form state
  const [tradeNum, setTN] = useState('');
  const [tradeDate, setTDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeDesc, setTDe] = useState('');
  const [tradeSold, setTS] = useState('');
  const [tradeBought, setTB] = useState('');
  const [tradeFundsSold, setTFS] = useState('');
  const [tradeFundsBought, setTFB] = useState('');
  const [tradeNotes, setTNo] = useState('');
  const [tradeRegime, setTR] = useState('');
  const [tradeStatus, setTSt] = useState('Open');

  function setFundBal(ticker, val) {
    setFundBalances(prev => ({ ...prev, [ticker]: val }));
  }

  // Auto-sum fund balances into total
  const fundTotal = useMemo(() => {
    return Object.values(fundBalances).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }, [fundBalances]);

  async function submitBalance() {
    setLoading(true);
    setStatus(null);
    try {
      // Build updated fund data
      const updatedFunds = activeFunds.map(f => {
        const key = f.ticker || f.fund;
        const newBal = parseFloat(fundBalances[key]);
        if (isNaN(newBal)) return f;
        return { ...f, ending_balance: newBal };
      });

      const totalBalance = parseFloat(balAmt) || fundTotal;

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_balance_full',
          payload: {
            date: balDate,
            balance: totalBalance,
            funds: updatedFunds,
          },
        }),
      });

      if (res.ok) {
        setStatus({ type: 'success', msg: `Balance updated to $${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} with ${Object.keys(fundBalances).filter(k => fundBalances[k]).length} fund balances.` });
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        setStatus({ type: 'error', msg: err.error || 'Save failed' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
    setLoading(false);
  }

  async function submitTrade() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_trade',
          payload: {
            trade_num: parseInt(tradeNum), date: tradeDate, description: tradeDesc,
            total_sold: parseFloat(tradeSold) || null, total_bought: parseFloat(tradeBought) || null,
            funds_sold: tradeFundsSold, funds_bought: tradeFundsBought,
            notes: tradeNotes, macro_regime: tradeRegime, status: tradeStatus,
          },
        }),
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Trade saved' });
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        setStatus({ type: 'error', msg: err.error || 'Failed' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
    setLoading(false);
  }

  async function handleSeed() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setStatus({ type: 'error', msg: 'Select your xlsx file first' }); return; }
    setLoading(true);
    setStatus({ type: 'info', msg: 'Uploading and processing spreadsheet… 15–30 seconds.' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/seed', { method: 'POST', body: formData });
      const json = await res.json();
      if (res.ok) {
        const r = json.counts || {};
        setStatus({ type: 'success', msg: `Seed complete! Loaded data into Redis.` });
        if (onRefresh) onRefresh();
      } else {
        setStatus({ type: 'error', msg: json.error || 'Seed failed' });
      }
    } catch (e) { setStatus({ type: 'error', msg: e.message }); }
    setLoading(false);
  }

  const is = {
    padding: '10px 14px', fontSize: 14,
    border: '1px solid var(--sand-200)', borderRadius: 'var(--radius)',
    outline: 'none', width: '100%', background: 'white',
  };
  const ls = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-light)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block',
  };

  const forms = [
    { id: 'balance', label: 'Weekly Balance' },
    { id: 'trade', label: 'Trade Decision' },
    { id: 'seed', label: 'Seed Data' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      {/* Form selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {forms.map(f => (
          <button key={f.id} onClick={() => { setActiveForm(f.id); setStatus(null); }}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              color: activeForm === f.id ? 'white' : 'var(--text-mid)',
              background: activeForm === f.id ? 'var(--navy-800)' : 'var(--sand-100)',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: 14, lineHeight: 1.6,
          fontWeight: status.type === 'info' ? 500 : 600,
          background: status.type === 'success' ? 'var(--green-bg)' : status.type === 'error' ? 'var(--red-bg)' : 'var(--ivory)',
          color: status.type === 'success' ? 'var(--green-gain)' : status.type === 'error' ? 'var(--red-loss)' : 'var(--text-mid)',
        }}>
          {status.msg}
        </div>
      )}

      {/* ===== WEEKLY BALANCE ===== */}
      {activeForm === 'balance' && (
        <div className="card">
          <div className="card-header">Weekly Balance Update</div>
          <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16, lineHeight: 1.5 }}>
            Enter each fund's current balance from Empower. The total auto-calculates
            and the allocation pie chart updates immediately.
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={ls}>Date</label>
              <input type="date" value={balDate} onChange={e => setBD(e.target.value)} style={is} />
            </div>

            {/* Per-fund balances */}
            <div style={{
              border: '1px solid var(--sand-200)', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px', background: 'var(--ivory)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--sand-200)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Fund Balances
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)' }}>
                  Current
                </span>
              </div>
              {activeFunds.map(f => {
                const key = f.ticker || f.fund;
                const label = f.ticker && f.ticker !== '—' ? f.ticker : f.fund;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 16px', borderBottom: '1px solid var(--sand-100)',
                  }}>
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 500,
                      color: 'var(--text-mid)',
                    }}>
                      {label}
                      <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 8 }}>
                        was {f.ending_balance ? '$' + f.ending_balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                      </span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={f.ending_balance?.toFixed(2) || '0.00'}
                      value={fundBalances[key] || ''}
                      onChange={e => setFundBal(key, e.target.value)}
                      style={{
                        ...is, width: 150, textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  </div>
                );
              })}
              {/* Running total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'var(--ivory)',
                borderTop: '2px solid var(--navy-800)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total</span>
                <span style={{
                  fontSize: 16, fontWeight: 700, color: 'var(--navy-800)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ${fundTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label style={ls}>Total Balance Override (optional)</label>
              <input type="number" step="0.01" value={balAmt} onChange={e => setBA(e.target.value)}
                placeholder={fundTotal ? fundTotal.toFixed(2) + ' (auto from funds above)' : '61221.54'}
                style={is} />
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                Leave blank to use the sum of fund balances above
              </div>
            </div>

            <button
              disabled={loading || (fundTotal === 0 && !balAmt)}
              onClick={submitBalance}
              style={{
                padding: 14, fontSize: 15, fontWeight: 600, color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
                border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Saving…' : 'Update Balance & Allocations'}
            </button>
          </div>
        </div>
      )}

      {/* ===== TRADE DECISION ===== */}
      {activeForm === 'trade' && (
        <div className="card">
          <div className="card-header">Log Trade Decision</div>
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div><label style={ls}>Trade #</label><input type="number" value={tradeNum} onChange={e => setTN(e.target.value)} style={is} placeholder="3" /></div>
              <div><label style={ls}>Date</label><input type="date" value={tradeDate} onChange={e => setTDate(e.target.value)} style={is} /></div>
            </div>
            <div><label style={ls}>Description</label><input value={tradeDesc} onChange={e => setTDe(e.target.value)} style={is} placeholder="Cash → PIMIX + PRRIX (all sources)" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={ls}>Total Sold ($)</label><input type="number" step="0.01" value={tradeSold} onChange={e => setTS(e.target.value)} style={is} /></div>
              <div><label style={ls}>Total Bought ($)</label><input type="number" step="0.01" value={tradeBought} onChange={e => setTB(e.target.value)} style={is} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={ls}>Funds Sold</label><input value={tradeFundsSold} onChange={e => setTFS(e.target.value)} style={is} placeholder="NOBOX, PIMIX" /></div>
              <div><label style={ls}>Funds Bought</label><input value={tradeFundsBought} onChange={e => setTFB(e.target.value)} style={is} placeholder="General Account" /></div>
            </div>
            <div><label style={ls}>Macro Regime</label><input value={tradeRegime} onChange={e => setTR(e.target.value)} style={is} placeholder="Risk-On Expansion" /></div>
            <div><label style={ls}>Trade Notes / Rationale</label><textarea value={tradeNotes} onChange={e => setTNo(e.target.value)} rows={3} style={{ ...is, resize: 'vertical' }} placeholder="Why did you make this trade?" /></div>
            <div><label style={ls}>Status</label><select value={tradeStatus} onChange={e => setTSt(e.target.value)} style={is}><option>Open</option><option>Closed</option></select></div>
            <button disabled={loading || !tradeNum || !tradeDesc} onClick={submitTrade}
              style={{ padding: 12, fontSize: 15, fontWeight: 600, color: 'white', background: loading ? 'var(--blue-400)' : 'var(--navy-800)', border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Saving…' : 'Save Trade'}
            </button>
          </div>
        </div>
      )}

      {/* ===== SEED DATA ===== */}
      {activeForm === 'seed' && (
        <div className="card">
          <div className="card-header">Load Spreadsheet Data</div>
          <div style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 16, lineHeight: 1.6 }}>
            Upload your <strong>401k_Trade_Tracker</strong> xlsx file to repopulate all dashboard data.
            This replaces existing data in Redis.
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={ls}>Spreadsheet File (.xlsx)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ ...is, padding: '8px 12px', cursor: 'pointer' }} />
            </div>
            <button disabled={loading} onClick={handleSeed}
              style={{ padding: 14, fontSize: 15, fontWeight: 600, color: 'white', background: loading ? 'var(--blue-400)' : 'var(--green-gain)', border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Processing…' : 'Upload & Seed Redis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
