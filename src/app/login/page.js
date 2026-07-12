'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Incorrect password');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--blue-500)',
            marginBottom: 8,
          }}>
            403(b) Trade Tracker
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
            Eagle Mountain International Church
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 15,
              border: `2px solid ${error ? 'var(--red-loss)' : 'var(--sand-200)'}`,
              borderRadius: 'var(--radius)',
              outline: 'none',
              transition: 'border-color 0.2s',
              marginBottom: error ? 8 : 20,
            }}
          />
          {error && (
            <div style={{ color: 'var(--red-loss)', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              background: loading ? 'var(--blue-400)' : 'var(--navy-800)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
