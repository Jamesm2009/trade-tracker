'use client';

const TABS = [
  { id: 'portfolio', label: 'Portfolio', icon: '◉' },
  { id: 'trades', label: 'Trade P&L', icon: '⇄' },
  { id: 'funds', label: 'Fund Detail', icon: '◫' },
  { id: 'dividends', label: 'Dividends', icon: '⟐' },
  { id: 'activity', label: 'Activity', icon: '☰' },
];

export default function Nav({ activeTab, onTabChange }) {
  return (
    <header style={{
      background: 'var(--navy-900)',
      borderBottom: '1px solid var(--navy-700)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0 10px',
        }}>
          <div>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--sand-200)',
              letterSpacing: '-0.01em',
            }}>
              403(b) Trade Tracker
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--blue-400)',
              letterSpacing: '0.04em',
            }}>
              EMICH · Plan #781339-01
            </div>
          </div>
          <button
            onClick={() => onTabChange('admin')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === 'admin' ? 'var(--navy-900)' : 'var(--sand-400)',
              background: activeTab === 'admin' ? 'var(--sand-200)' : 'transparent',
              border: `1px solid ${activeTab === 'admin' ? 'var(--sand-200)' : 'var(--navy-600)'}`,
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Admin
          </button>
        </div>

        {/* Tab bar */}
        <nav style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'white' : 'var(--blue-400)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--sand-300)'
                  : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
