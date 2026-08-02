import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [expiring, setExpiring] = useState([]);
  const [showExpiring, setShowExpiring] = useState(false);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/api/admin/car-rental/expiring-agreements')
      .then(r => setExpiring(r.data || []))
      .catch(() => {});
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          Welcome back! Here's what's happening.
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { label: 'Total Bookings', value: stats?.totalBookings ?? 0, prefix: '', accent: '#0D2B6B' },
            { label: 'Revenue',        value: `$${(stats?.totalRevenue ?? 0).toFixed(0)}`, prefix: '', accent: '#2E7D32' },
            { label: 'Active Cars',    value: stats?.totalCars ?? 0,    prefix: '', accent: '#0D2B6B' },
            { label: 'Active Houses',  value: stats?.totalHouses ?? 0,  prefix: '', accent: '#0D2B6B' },
            { label: 'Active Agents',  value: stats?.totalAgents ?? 0,  prefix: '', accent: '#F57C00' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 16,
              padding: '20px 22px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              borderTop: `4px solid ${accent}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {label}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: accent, lineHeight: 1.1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Expiring Agreements Warning ── */}
      {expiring.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowExpiring(s => !s)}
            style={{
              width: '100%', textAlign: 'left', background: '#FFEBEE',
              border: '2px solid #FFCDD2', borderRadius: 12, padding: '14px 20px',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#b71c1c', fontSize: 15 }}>
                {expiring.length} booking{expiring.length !== 1 ? 's' : ''} expiring soon — less than 2 hours left to sign
              </div>
              <div style={{ fontSize: 13, color: '#c62828', marginTop: 2 }}>
                These bookings will be auto-cancelled if the customer does not sign. Click to view.
              </div>
            </div>
            <span style={{ color: '#b71c1c', fontWeight: 700, fontSize: 14 }}>{showExpiring ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {showExpiring && (
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '0 0 12px 12px', border: '2px solid #FFCDD2', borderTop: 'none', overflow: 'hidden' }}>
              {expiring.map(b => {
                const deadline = new Date(b.rental_agreement_sent_at).getTime() + 24 * 60 * 60 * 1000;
                const msLeft   = Math.max(0, deadline - Date.now());
                const hLeft    = Math.floor(msLeft / 3600000);
                const mLeft    = Math.floor((msLeft % 3600000) / 60000);
                return (
                  <div key={b.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 14 }}>
                        #{b.id} — {b.year} {b.make} {b.model}
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        {b.customer_full_name} · {b.customer_email}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#b71c1c', fontSize: 14 }}>
                        {hLeft}h {mLeft}m left
                      </div>
                    </div>
                    <Link
                      to={`/admin/car-rentals/${b.id}`}
                      style={{ background: '#0D2B6B', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      View →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 16, textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
        Quick Actions
      </h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        {[
          { to: '/admin/locations', label: '🗺️ Manage Locations' },
          { to: '/admin/cars',      label: '🚗 Manage Cars' },
          { to: '/admin/houses',    label: '🏠 Manage Houses' },
          { to: '/admin/agents',    label: '🧭 Manage Agents' },
          { to: '/admin/bookings',  label: '📅 View All Bookings' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 20px',
              background: 'rgba(255,255,255,0.97)',
              color: '#0D2B6B',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: '1px solid rgba(13,43,107,0.15)',
              transition: 'all 0.2s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0D2B6B';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.97)';
              e.currentTarget.style.color = '#0D2B6B';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{
        padding: '20px 24px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 14,
        borderLeft: '5px solid #F57C00',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        fontSize: 14,
        color: '#0D2B6B',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: '#F57C00' }}>Getting started:</strong>{' '}
        First go to <strong>Locations</strong> to enable states and cities,
        then add Cars, Houses, and Agents for those cities. Users will only see enabled states and cities.
      </div>
    </AdminLayout>
  );
}
