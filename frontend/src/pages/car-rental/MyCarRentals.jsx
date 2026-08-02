import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateShort } from '../../utils/dateHelper';

const STATUS = {
  payment_pending:          { label: 'Payment Pending',          color: '#1E88E5', bg: '#E3F2FD' },
  confirmed:                { label: 'Confirmed',                color: '#1e7e34', bg: '#e6f4ea' },
  agreement_sent:           { label: 'Sign Agreement',           color: '#e65100', bg: '#fff3e0' },
  awaiting_admin_signature: { label: 'Awaiting Rep Signature',   color: '#0277bd', bg: '#e1f5fe' },
  agreement_complete:       { label: 'Agreement Complete',       color: '#0D2B6B', bg: '#e3f2fd' },
  active_car_out:           { label: '🚗 Car Out',               color: '#E65100', bg: '#FFF3E0' },
  returned:                 { label: 'Returned',                 color: '#2e7d32', bg: '#e8f5e9' },
  completed:                { label: 'Completed',                color: '#0D2B6B', bg: '#e3f2fd' },
  completed_with_charges:   { label: 'Completed — Extra Charged', color: '#E65100', bg: '#FFF3E0' },
  cancelled:                { label: 'Cancelled',                color: '#c62828', bg: '#fce8e6' },
  auto_cancelled:           { label: 'Cancelled — Not Signed',   color: '#c62828', bg: '#fce8e6' },
};

const fmtDate = formatDateShort;

export default function MyCarRentals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/api/car-rental/my-bookings')
      .then(r => setRentals(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.85)' }}>Home</Link> › My Rentals
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>🔑 My Car Rentals</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Track the status of your car rental bookings.</p>
      </div>

      {rentals.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚗</div>
          <h3>No rentals yet</h3>
          <p style={{ marginBottom: 20 }}>Browse available cars and start your booking.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Cities</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rentals.map(rental => {
            const s = STATUS[rental.status] || { label: rental.status, color: '#555', bg: '#eee' };
            return (
              <div
                key={rental.id}
                onClick={() => navigate(`/car-rental/rental/${rental.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 20,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'pointer',
                  display: 'flex', gap: 16, alignItems: 'center',
                  border: '1px solid #f0f0f0',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
              >
                {rental.car_photos?.[0] ? (
                  <img
                    src={`${API_URL}/uploads/${rental.car_photos[0]}`}
                    alt=""
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                    onError={e => e.target.style.display = 'none'}
                  />
                ) : (
                  <div style={{ width: 80, height: 60, background: '#E3F2FD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🚗</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0D2B6B', marginBottom: 4 }}>
                    {rental.year} {rental.make} {rental.model}
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    {rental.city_name}, {rental.state_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
                    {fmtDate(rental.pickup_date)} → {fmtDate(rental.return_date)} · {rental.total_days} day{rental.total_days !== 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 8 }}>
                    {s.label}
                  </span>
                  <div style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 15 }}>
                    ${Number(rental.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
      </div>
    </div>
  );
}
