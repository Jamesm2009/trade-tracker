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
  const [benchPrice, setBenchPrice] = useState('');

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
            benchmark_ticker: 'TRRLX',
            benchmark_price: parseFloat(benchPrice) || null,
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
    setStatus({ type: 'info', msg: 'Reading spreadsheet in browser…' });

    try {
      // Load SheetJS from CDN
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load spreadsheet parser'));
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;

      setStatus({ type: 'info', msg: 'Parsing spreadsheet data…' });

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true });

      function parseDate(v) {
        if (!v) return null;
        if (v instanceof Date) return v.toISOString().split('T')[0];
        if (typeof v === 'number') { const d = new Date((v - 25569) * 86400000); return d.toISOString().split('T')[0]; }
        return String(v);
      }

      // Transactions
      const txRows = XLSX.utils.sheet_to_json(wb.Sheets['Transactions'] || {});
      const transactions = txRows.map(r => ({
        date: parseDate(r['Date']), confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
        type: r['Type'] || null, amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
        trade_group: r['Trade Group'] || null, detail_status: r['Detail Status'] || null, notes: r['Notes'] || null,
      })).filter(t => t.date);

      // Transfer Detail
      const tdRows = XLSX.utils.sheet_to_json(wb.Sheets['Transfer Detail'] || {});
      const transferDetail = tdRows.map(r => ({
        date: parseDate(r['Date']), confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
        trade_group: r['Trade Group'] || null, source: r['Source'] || null, direction: r['Direction'] || null,
        fund: r['Fund'] || null, ticker: r['Ticker'] || null,
        shares: r['Shares'] != null ? parseFloat(r['Shares']) : null,
        price: r['Share Price'] != null ? parseFloat(r['Share Price']) : null,
        amount: r['Amount'] != null ? parseFloat(r['Amount']) : null, notes: r['Notes'] || null,
      })).filter(t => t.date);

      // Dividend Detail
      const ddRows = XLSX.utils.sheet_to_json(wb.Sheets['Dividend Detail'] || {});
      const dividendDetail = ddRows.map(r => ({
        date: parseDate(r['Date']), confirmation: r['Confirmation #'] ? String(r['Confirmation #']) : null,
        fund: r['Fund'] || null, ticker: r['Ticker'] || null, source: r['Source'] || null,
        amount: r['Amount'] != null ? parseFloat(r['Amount']) : null,
        price: r['Share Price'] != null ? parseFloat(r['Share Price']) : null,
        shares: r['Shares Purchased'] != null ? parseFloat(r['Shares Purchased']) : null, notes: r['Notes'] || null,
      })).filter(d => d.date);

      // YTD Summary
      const ytdData = XLSX.utils.sheet_to_json(wb.Sheets['YTD Summary'] || {}, { header: 1 });
      // null = "not present in this upload" so the server preserves the existing
      // value instead of resetting it. Never hardcode a fallback number here.
      let beginBal=null,endBal=null,deps=null,fees=null,divs=null,chg=null;
      ytdData.forEach(row => {
        if(row[0]==='Beginning Balance'&&row[1]!=null) beginBal=parseFloat(row[1]);
        if(row[0]==='Total Deposits'&&row[1]!=null) deps=parseFloat(row[1]);
        if(row[0]==='Total Withdrawals/Expenses'&&row[1]!=null) fees=parseFloat(row[1]);
        if(row[0]==='Total Dividends'&&row[1]!=null) divs=parseFloat(row[1]);
        if(row[0]==='Total Change in Value'&&row[1]!=null) chg=parseFloat(row[1]);
        if(row[0]==='Ending Balance'&&row[1]!=null) endBal=parseFloat(row[1]);
      });
      const sources = [];
      ['Employee 403(b)','Employer Match','Roth'].forEach(sn => {
        ytdData.forEach(row => {
          if(row[0]===sn) sources.push({source:row[0],beginning:parseFloat(row[1])||0,deposits:parseFloat(row[2])||0,fees:parseFloat(row[3])||0,dividends:parseFloat(row[4])||0,growth:parseFloat(row[5])||0,balance:parseFloat(row[6])||0});
        });
      });
      const fundYtd = [];
      let inFS = false;
      ytdData.forEach(row => {
        if(row[0]==='Fund'&&row[1]==='Ticker'){inFS=true;return;}
        if(inFS&&row[0]==='Total'){inFS=false;return;}
        if(inFS&&row[0]&&row[0]!=='Total') fundYtd.push({fund:row[0],ticker:row[1]||'—',beginning_balance:parseFloat(row[2])||0,deposits:parseFloat(row[3])||0,transfers:parseFloat(row[4])||0,fees:parseFloat(row[5])||0,dividends:parseFloat(row[6])||0,change:parseFloat(row[7])||0,ending_balance:parseFloat(row[8])||0,shares:parseFloat(row[9])||0});
      });
      const ytdSummary = {beginning_balance:beginBal,ending_balance:endBal,total_deposits:deps,total_fees:fees,total_dividends:divs,total_change:chg,sources,funds:fundYtd};

      // Trade Decisions — optional sheet. A row with a blank Trade # or a
      // description containing "EXAMPLE" is treated as a leftover template
      // row and dropped server-side.
      const tradeDecisionRows = XLSX.utils.sheet_to_json(wb.Sheets['Trade Decisions'] || {});
      const trades = tradeDecisionRows.filter(r => r['Trade #'] != null && r['Trade #'] !== '').map(r => ({
        trade_num: r['Trade #'],
        date: parseDate(r['Date']),
        description: r['Description'] || null,
        total_sold: r['Total Sold'] != null ? parseFloat(r['Total Sold']) : null,
        total_bought: r['Total Bought'] != null ? parseFloat(r['Total Bought']) : null,
        funds_sold: r['Funds Sold'] || null,
        funds_bought: r['Funds Bought'] || null,
        status: r['Status'] || null,
        notes: r['Notes'] || null,
        macro_regime: r['Macro Regime'] || null,
      }));

      // Fund Universe
      const fuRows = XLSX.utils.sheet_to_json(wb.Sheets['Fund Universe'] || {});
      const fundUniverse = fuRows.filter(r=>r['Fund Name']).map(r=>({num:r['#'],name:r['Fund Name'],ticker:r['Ticker']||'—',category:r['Category']||null,in_use:r['In Use (YTD)']||null,opening_balance:r['Opening Balance']!=null?parseFloat(r['Opening Balance']):null}));

      // Weekly Balance
      const wbRows = XLSX.utils.sheet_to_json(wb.Sheets['Weekly Balance'] || {});
      const weeklyBalance = wbRows.filter(r=>r['Week Ending']).map(r=>({date:parseDate(r['Week Ending']),balance:r['Empower Balance']!=null?parseFloat(r['Empower Balance']):null,notes:r['Notes']||null})).filter(w=>w.balance!=null);

      // Fund Prices
      const fpData = XLSX.utils.sheet_to_json(wb.Sheets['Fund Prices'] || {}, { header: 1 });
      const tickers = fpData[1] || [];
      const fundPrices = [];
      for(let i=3;i<fpData.length;i++){const row=fpData[i];if(!row||!row[0])continue;const entry={date:parseDate(row[0]),prices:{}};for(let j=1;j<tickers.length;j++){if(tickers[j]&&row[j]!=null)entry.prices[tickers[j]]=parseFloat(row[j]);}if(Object.keys(entry.prices).length>0)fundPrices.push(entry);}

      const account = {balance:endBal,as_of_date:null,opening_balance:beginBal,contributions_ytd:deps};

      setStatus({ type: 'info', msg: 'Writing to Redis…' });

      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account, transactions, transferDetail, dividendDetail,
          ytdSummary, fundUniverse, weeklyBalance, fundPrices, trades,
          counts: { transactions: transactions.length, transferDetail: transferDetail.length, dividendDetail: dividendDetail.length, ytdFunds: fundYtd.length, fundUniverse: fundUniverse.length, weeklyBalance: weeklyBalance.length, fundPrices: fundPrices.length },
        }),
      });

      const json = await res.json();
      if (res.ok) {
        const c = json.counts || {};
        setStatus({ type: 'success', msg: `Seed complete! ${c.transactions || 0} transactions, ${c.transferDetail || 0} transfer details, ${c.dividendDetail || 0} dividends, ${c.trades || 0} trades, ${c.ytdFunds || 0} fund summaries.` });
        if (onRefresh) onRefresh();
      } else {
        setStatus({ type: 'error', msg: json.error || 'Seed failed' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
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

            <div>
              <label style={ls}>Target Date 2060 (TRRLX) Price (optional)</label>
              <input type="number" step="0.01" value={benchPrice} onChange={e => setBenchPrice(e.target.value)}
                placeholder="e.g. 19.85" style={is} />
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                Empower shows this as the share price/NAV for T Rowe Price Retirement 2060.
                Entering it here builds the "Portfolio vs Target Date 2060" chart on the Portfolio tab over time.
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
