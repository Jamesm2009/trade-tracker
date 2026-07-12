'use client';

import { useState } from 'react';

export default function AdminTab({ data, onRefresh }) {
  const [activeForm, setActiveForm] = useState('balance');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Balance form
  const [balDate, setBalDate] = useState(new Date().toISOString().split('T')[0]);
  const [balAmount, setBalAmount] = useState('');
  const [balContribs, setBalContribs] = useState('');

  // Trade form
  const [tradeNum, setTradeNum] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeDesc, setTradeDesc] = useState('');
  const [tradeSold, setTradeSold] = useState('');
  const [tradeBought, setTradeBought] = useState('');
  const [tradeFundsSold, setTradeFundsSold] = useState('');
  const [tradeFundsBought, setTradeFundsBought] = useState('');
  const [tradeNotes, setTradeNotes] = useState('');
  const [tradeRegime, setTradeRegime] = useState('');
  const [tradeStatus, setTradeStatus] = useState('Open');

  async function submitForm(action, payload) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Saved successfully' });
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

  const inputStyle = {
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid var(--sand-200)',
    borderRadius: 'var(--radius)',
    outline: 'none',
    width: '100%',
    background: 'white',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
    display: 'block',
  };

  const forms = [
    { id: 'balance', label: 'Weekly Balance' },
    { id: 'trade', label: 'Trade Decision' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      {/* Form selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {forms.map(f => (
          <button
            key={f.id}
            onClick={() => { setActiveForm(f.id); setStatus(null); }}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: activeForm === f.id ? 'white' : 'var(--text-mid)',
              background: activeForm === f.id ? 'var(--navy-800)' : 'var(--sand-100)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius)',
          fontSize: 14,
          fontWeight: 600,
          background: status.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: status.type === 'success' ? 'var(--green-gain)' : 'var(--red-loss)',
        }}>
          {status.msg}
        </div>
      )}

      {/* Weekly Balance Update */}
      {activeForm === 'balance' && (
        <div className="card">
          <div className="card-header">Weekly Balance Update</div>
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Total Balance ($)</label>
              <input
                type="number"
                step="0.01"
                value={balAmount}
                onChange={e => setBalAmount(e.target.value)}
                placeholder="61221.54"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cumulative Contributions YTD ($)</label>
              <input
                type="number"
                step="0.01"
                value={balContribs}
                onChange={e => setBalContribs(e.target.value)}
                placeholder="3127.81"
                style={inputStyle}
              />
            </div>
            <button
              disabled={loading || !balAmount}
              onClick={() => submitForm('update_balance', {
                date: balDate,
                balance: parseFloat(balAmount),
                contributions_ytd: parseFloat(balContribs) || 0,
              })}
              style={{
                padding: '12px',
                fontSize: 15,
                fontWeight: 600,
                color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Saving…' : 'Save Balance'}
            </button>
          </div>
        </div>
      )}

      {/* Trade Decision */}
      {activeForm === 'trade' && (
        <div className="card">
          <div className="card-header">Log Trade Decision</div>
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Trade #</label>
                <input type="number" value={tradeNum} onChange={e => setTradeNum(e.target.value)} style={inputStyle} placeholder="3" />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={tradeDesc} onChange={e => setTradeDesc(e.target.value)} style={inputStyle} placeholder="Cash → PIMIX + PRRIX (all sources)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Total Sold ($)</label>
                <input type="number" step="0.01" value={tradeSold} onChange={e => setTradeSold(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Total Bought ($)</label>
                <input type="number" step="0.01" value={tradeBought} onChange={e => setTradeBought(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Funds Sold</label>
                <input value={tradeFundsSold} onChange={e => setTradeFundsSold(e.target.value)} style={inputStyle} placeholder="NOBOX, PIMIX" />
              </div>
              <div>
                <label style={labelStyle}>Funds Bought</label>
                <input value={tradeFundsBought} onChange={e => setTradeFundsBought(e.target.value)} style={inputStyle} placeholder="General Account" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Macro Regime</label>
              <input value={tradeRegime} onChange={e => setTradeRegime(e.target.value)} style={inputStyle} placeholder="Risk-On Expansion" />
            </div>
            <div>
              <label style={labelStyle}>Trade Notes / Rationale</label>
              <textarea
                value={tradeNotes}
                onChange={e => setTradeNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Why did you make this trade? What was the thesis?"
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={tradeStatus} onChange={e => setTradeStatus(e.target.value)} style={inputStyle}>
                <option>Open</option>
                <option>Closed</option>
                <option>Closed → Trade #</option>
              </select>
            </div>
            <button
              disabled={loading || !tradeNum || !tradeDesc}
              onClick={() => submitForm('update_trade', {
                trade_num: parseInt(tradeNum),
                date: tradeDate,
                description: tradeDesc,
                total_sold: parseFloat(tradeSold) || null,
                total_bought: parseFloat(tradeBought) || null,
                funds_sold: tradeFundsSold,
                funds_bought: tradeFundsBought,
                notes: tradeNotes,
                macro_regime: tradeRegime,
                status: tradeStatus,
              })}
              style={{
                padding: '12px',
                fontSize: 15,
                fontWeight: 600,
                color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Saving…' : 'Save Trade'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
