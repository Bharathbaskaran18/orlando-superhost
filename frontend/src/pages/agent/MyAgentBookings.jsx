import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';

const STATUS_CONFIG = {
  payment_pending:  { label: 'Payment Pending',  bg: '#E3F2FD', color: '#0D2B6B', border: '#90CAF9' },
  pending_approval: { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:         { label: 'Confirmed',         bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  cancelled:        { label: 'Cancelled',         bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmt12 = (t) => {
  if (!t) return '—';
  const h = parseInt(t);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export default function MyAgentBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/agent-booking/my-bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 800 }}>
        <div style={{ marginBottom: 8 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
        </div>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 24 }}>🧭 My Agent Bookings</h1>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : bookings.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧭</div>
            <h3 style={{ color: '#0D2B6B', marginBottom: 8 }}>No agent bookings yet</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>Book a local travel agent to see your sessions here.</p>
            <Link to="/" style={{ display: 'inline-block', background: '#0D2B6B', color: 'white', padding: '10px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
              Browse Agents
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookings.map(b => (
              <div
                key={b.id}
                onClick={() => navigate(`/agent/booking/${b.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.97)', borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden',
                  display: 'flex', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; }}
              >
                {b.agent_photo ? (
                  <img src={`${API_URL}/uploads/${b.agent_photo}`} alt={b.agent_name} style={{ width: 110, height: 110, objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                ) : (
                  <div style={{ width: 110, height: 110, background: 'linear-gradient(135deg, #0D2B6B, #1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>🧭</div>
                )}
                <div style={{ padding: '14px 18px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>{b.agent_name}</div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div style={{ fontSize: 13, color: '#0D2B6B', fontWeight: 600, marginBottom: 6 }}>{b.agent_specialty}</div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
                    <span>📅 {fmtDate(b.booking_date)}</span>
                    <span>🕐 {fmt12(b.start_time)} — {fmt12(b.end_time)}</span>
                    <span>📍 {b.city_name}</span>
                  </div>
                </div>
                <div style={{ padding: '14px 18px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0D2B6B' }}>${Number(b.total_amount).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{b.total_hours}h session</div>
                  <div style={{ fontSize: 12, color: '#1565C0', fontWeight: 600, marginTop: 8 }}>View →</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
