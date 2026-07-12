'use client';

import { useState, useEffect, useCallback } from 'react';
import Nav from '@/components/Nav';
import PortfolioTab from '@/components/PortfolioTab';
import TradesTab from '@/components/TradesTab';
import FundsTab from '@/components/FundsTab';
import DividendsTab from '@/components/DividendsTab';
import ActivityTab from '@/components/ActivityTab';
import AdminTab from '@/components/AdminTab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to load data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--navy-800)',
            marginBottom: 8,
          }}>
            Loading Trade Tracker…
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-light)' }}>
            Fetching data from Redis
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <Nav activeTab={activeTab} onTabChange={setActiveTab} />

      <main style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px',
      }}>
        {error && (
          <div style={{
            padding: '12px 20px',
            background: 'var(--red-bg)',
            color: 'var(--red-loss)',
            borderRadius: 'var(--radius)',
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {activeTab === 'portfolio' && <PortfolioTab data={data} />}
        {activeTab === 'trades' && <TradesTab data={data} />}
        {activeTab === 'funds' && <FundsTab data={data} />}
        {activeTab === 'dividends' && <DividendsTab data={data} />}
        {activeTab === 'activity' && <ActivityTab data={data} />}
        {activeTab === 'admin' && <AdminTab data={data} onRefresh={fetchData} />}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: 12,
        color: 'var(--text-light)',
        borderTop: '1px solid var(--sand-200)',
        marginTop: 40,
      }}>
        403(b) Trade P&L Tracker · Empower Plan #781339-01 · Data as of {data?.account?.as_of_date || '7/9/2026'}
      </footer>
    </div>
  );
}
