'use client';
import { useState, useRef } from 'react';

export default function AdminTab({ data, onRefresh }) {
  const [activeForm, setActiveForm] = useState('seed');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // Balance form state
  const [balDate, setBD] = useState(new Date().toISOString().split('T')[0]);
  const [balAmt, setBA] = useState('');
  const [balC, setBC] = useState('');

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

  async function handleSeed() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ type: 'error', msg: 'Please select your xlsx file first' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'info', msg: 'Uploading and processing spreadsheet… this may take 15–30 seconds.' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/seed', { method: 'POST', body: formData });
      const json = await res.json();

      if (res.ok) {
        const r = json.results;
        setStatus({
          type: 'success',
          msg: `Seed complete! Loaded ${r.transactions} transactions, ${r.transferDetail} transfer details, ${r.trades} trades, ${r.dividendDetail} dividends, ${r.ytdFunds} fund summaries, ${r.fundUniverse} funds, ${r.weeklyBalance} balance entries, ${r.fundPrices} price entries.`,
        });
        if (onRefresh) onRefresh();
      } else {
        setStatus({ type: 'error', msg: json.error || 'Seed failed' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
    setLoading(false);
  }

  const inputStyle = {
    padding: '10px 14px', fontSize: 14,
    border: '1px solid var(--sand-200)', borderRadius: 'var(--radius)',
    outline: 'none', width: '100%', background: 'white',
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-light)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block',
  };

  const forms = [
    { id: 'seed', label: 'Seed Data' },
    { id: 'balance', label: 'Weekly Balance' },
    { id: 'trade', label: 'Trade Decision' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      {/* Form selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {forms.map(f => (
          <button
            key={f.id}
            onClick={() => { setActiveForm(f.id); setStatus(null); }}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              color: activeForm === f.id ? 'white' : 'var(--text-mid)',
              background: activeForm === f.id ? 'var(--navy-800)' : 'var(--sand-100)',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            }}
          >
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

      {/* ===== SEED DATA ===== */}
      {activeForm === 'seed' && (
        <div className="card">
          <div className="card-header">Load Spreadsheet Data</div>
          <div style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 16, lineHeight: 1.6 }}>
            Upload your <strong>401k_Trade_Tracker</strong> xlsx file to populate all dashboard tabs
            with transactions, transfers, dividends, fund data, and trade decisions.
            This replaces any existing data in Redis.
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Spreadsheet File (.xlsx)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{
                  ...inputStyle,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              />
            </div>
            <button
              disabled={loading}
              onClick={handleSeed}
              style={{
                padding: '14px', fontSize: 15, fontWeight: 600, color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--green-gain)',
                border: 'none', borderRadius: 'var(--radius)',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Processing spreadsheet…' : 'Upload & Seed Redis'}
            </button>
          </div>
        </div>
      )}

      {/* ===== WEEKLY BALANCE ===== */}
      {activeForm === 'balance' && (
        <div className="card">
          <div className="card-header">Weekly Balance Update</div>
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={balDate} onChange={e => setBD(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Total Balance ($)</label>
              <input type="number" step="0.01" value={balAmt} onChange={e => setBA(e.target.value)} placeholder="61221.54" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cumulative Contributions YTD ($)</label>
              <input type="number" step="0.01" value={balC} onChange={e => setBC(e.target.value)} placeholder="3127.81" style={inputStyle} />
            </div>
            <button
              disabled={loading || !balAmt}
              onClick={() => submitForm('update_balance', { date: balDate, balance: parseFloat(balAmt), contributions_ytd: parseFloat(balC) || 0 })}
              style={{
                padding: 12, fontSize: 15, fontWeight: 600, color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
                border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Saving…' : 'Save Balance'}
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
              <div><label style={labelStyle}>Trade #</label><input type="number" value={tradeNum} onChange={e => setTN(e.target.value)} style={inputStyle} placeholder="3" /></div>
              <div><label style={labelStyle}>Date</label><input type="date" value={tradeDate} onChange={e => setTDate(e.target.value)} style={inputStyle} /></div>
            </div>
            <div><label style={labelStyle}>Description</label><input value={tradeDesc} onChange={e => setTDe(e.target.value)} style={inputStyle} placeholder="Cash → PIMIX + PRRIX (all sources)" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Total Sold ($)</label><input type="number" step="0.01" value={tradeSold} onChange={e => setTS(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Total Bought ($)</label><input type="number" step="0.01" value={tradeBought} onChange={e => setTB(e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Funds Sold</label><input value={tradeFundsSold} onChange={e => setTFS(e.target.value)} style={inputStyle} placeholder="NOBOX, PIMIX" /></div>
              <div><label style={labelStyle}>Funds Bought</label><input value={tradeFundsBought} onChange={e => setTFB(e.target.value)} style={inputStyle} placeholder="General Account" /></div>
            </div>
            <div><label style={labelStyle}>Macro Regime</label><input value={tradeRegime} onChange={e => setTR(e.target.value)} style={inputStyle} placeholder="Risk-On Expansion" /></div>
            <div><label style={labelStyle}>Trade Notes / Rationale</label><textarea value={tradeNotes} onChange={e => setTNo(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Why did you make this trade? What was the thesis?" /></div>
            <div><label style={labelStyle}>Status</label><select value={tradeStatus} onChange={e => setTSt(e.target.value)} style={inputStyle}><option>Open</option><option>Closed</option></select></div>
            <button
              disabled={loading || !tradeNum || !tradeDesc}
              onClick={() => submitForm('update_trade', {
                trade_num: parseInt(tradeNum), date: tradeDate, description: tradeDesc,
                total_sold: parseFloat(tradeSold) || null, total_bought: parseFloat(tradeBought) || null,
                funds_sold: tradeFundsSold, funds_bought: tradeFundsBought,
                notes: tradeNotes, macro_regime: tradeRegime, status: tradeStatus,
              })}
              style={{
                padding: 12, fontSize: 15, fontWeight: 600, color: 'white',
                background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
                border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer',
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
