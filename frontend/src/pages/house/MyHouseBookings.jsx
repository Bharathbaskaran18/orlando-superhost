import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';

const STATUS_CONFIG = {
  pending_approval:        { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:                { label: 'Approved',         bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
  checked_in:              { label: 'Checked In',       bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
  completed:               { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  completed_with_charges:  { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  completed_extra_charged: { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  cancelled:               { label: 'Cancelled',        bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m-1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function MyHouseBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/house-booking/my-bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 800 }}>
        <div style={{ marginBottom: 8 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
        </div>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 24 }}>🏠 My House Stays</h1>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : bookings.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏠</div>
            <h3 style={{ color: '#1565C0', marginBottom: 8 }}>No house bookings yet</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>Book a house to see your stays here.</p>
            <Link to="/" style={{ display: 'inline-block', background: '#F57C00', color: '#1565C0', padding: '10px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
              Browse Houses
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map(b => {
              const photo = b.house_photos?.[0];
              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/house/booking/${b.id}`)}
                  style={{
                    background: 'rgba(255,255,255,0.97)', borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden',
                    display: 'flex', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; }}
                >
                  {photo ? (
                    <img src={`${API_URL}/uploads/${photo}`} alt="" style={{ width: 130, height: 120, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 130, height: 120, background: 'linear-gradient(135deg, #1565C0, #42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>🏠</div>
                  )}
                  <div style={{ padding: '16px 20px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                          {b.house_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>{b.city_name}, {b.state_name}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
                      <span>📅 {fmtDate(b.checkin_date)} → {fmtDate(b.checkout_date)}</span>
                      <span>🌙 {b.total_nights} night{b.total_nights !== 1 ? 's' : ''}</span>
                      <span>👥 {b.num_guests} guest{b.num_guests !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1565C0' }}>${Number(b.total_amount).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>total</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#1565C0', fontWeight: 600 }}>View →</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
