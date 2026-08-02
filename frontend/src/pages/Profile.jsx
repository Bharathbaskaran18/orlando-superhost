import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

const BG = "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')";

function InfoRow({ icon, label, value }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px', borderRadius: 10,
        background: hov ? '#F8F9FF' : 'transparent',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#888', fontSize: 13, fontWeight: 500, width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontSize: 14, fontWeight: 600 }}>{value || <span style={{ color: '#bbb' }}>Not set</span>}</span>
    </div>
  );
}

function StatBox({ icon, label, value, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '20px 8px',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#0D2B6B' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats,   setStats]   = useState({ bookings: 0, rentals: 0, leases: 0 });
  const [cards,   setCards]   = useState([]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/user/profile'),
      api.get('/api/user/stats'),
      api.get('/api/user/cards'),
    ]).then(([p, s, c]) => {
      setProfile(p.data);
      setStats(s.data);
      setCards(c.data);
      setTimeout(() => setLoaded(true), 60);
    }).catch(() => navigate('/login'));
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const initial = profile?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || '?';
  const avatarSrc = profile?.avatar_url ? `${API_URL}${profile.avatar_url}` : null;

  const cardStyle = (delay = 0) => ({
    background: 'white', borderRadius: 20, padding: '28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
  });

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Fixed background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: BG, backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(0,0,20,0.62)' }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        maxWidth: 600, margin: '0 auto',
        padding: '90px 20px 60px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* ── HERO CARD ── */}
        <div style={{
          ...cardStyle(0),
          textAlign: 'center', padding: '40px 28px 32px',
        }}>
          {/* Avatar */}
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: avatarSrc ? 'transparent' : '#0D2B6B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, fontWeight: 800, color: 'white',
            margin: '0 auto 16px',
            boxShadow: '0 0 0 4px #F57C00, 0 0 0 10px rgba(245,124,0,0.22), 0 8px 32px rgba(13,43,107,0.3)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>

          {/* Customer ID badge */}
          {profile?.customer_id && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(245,124,0,0.1)', border: '1px solid rgba(245,124,0,0.35)',
              color: '#F57C00', padding: '4px 16px', borderRadius: 20,
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              {profile.customer_id}
            </div>
          )}

          {/* Name */}
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B', margin: '0 0 6px' }}>
            {profile?.name || user?.name}
          </h1>

          {/* Member since */}
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 28px' }}>
            Member since {profile?.member_since || '—'}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/profile/manage"
              style={{
                display: 'inline-block',
                background: '#F57C00', color: 'white',
                padding: '12px 32px', borderRadius: 10,
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(245,124,0,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E65100'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F57C00'; e.currentTarget.style.transform = 'none'; }}
            >
              ⚙️ Manage Account
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent', border: '1.5px solid #e0e0e0',
                color: '#888', padding: '12px 24px', borderRadius: 10,
                fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#cc0000'; e.currentTarget.style.color = '#cc0000'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#888'; }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* ── PERSONAL INFO ── */}
        <div style={cardStyle(0.12)}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0D2B6B', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            👤 Personal Information
          </h2>
          <div style={{ height: 1, background: '#f0f0f0', marginBottom: 8 }} />
          <InfoRow icon="🪪" label="Full Name"     value={profile?.name} />
          <InfoRow icon="🎂" label="Date of Birth" value={profile?.date_of_birth} />
          <InfoRow icon="✉️"  label="Email"         value={profile?.email} />
          <InfoRow icon="📱"  label="Phone"         value={profile?.phone} />
          <InfoRow icon="📍"  label="Address"       value={profile?.address} />
        </div>

        {/* ── SAVED CARDS ── */}
        <div style={cardStyle(0.22)}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0D2B6B', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            💳 Saved Payment Cards
          </h2>
          <div style={{ height: 1, background: '#f0f0f0', marginBottom: 16 }} />
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
              <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 16px' }}>No saved cards yet</p>
              <Link to="/profile/manage"
                style={{
                  display: 'inline-block', background: '#0D2B6B', color: 'white',
                  padding: '9px 22px', borderRadius: 8, textDecoration: 'none',
                  fontSize: 13, fontWeight: 700,
                }}>
                + Add a Card
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cards.map(card => (
                <div key={card.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  border: '1.5px solid #e8e8e8', background: '#FAFAFA',
                }}>
                  <span style={{ fontSize: 28 }}>{card.card_brand === 'Mastercard' ? '💳' : '💳'}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 14 }}>
                      {card.card_brand} •••• {card.card_last4}
                    </div>
                    <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                      Expires {card.card_expiry}
                      {card.cardholder_name ? ` · ${card.cardholder_name}` : ''}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/profile/manage" style={{ color: '#F57C00', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>
                Manage cards →
              </Link>
            </div>
          )}
        </div>

        {/* ── STATS ── */}
        <div style={cardStyle(0.32)}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0D2B6B', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 My Activity
          </h2>
          <div style={{ height: 1, background: '#f0f0f0', marginBottom: 8 }} />
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden' }}>
            <StatBox icon="🏠" label="House Bookings" value={stats.bookings} delay={400} />
            <div style={{ width: 1, background: '#f0f0f0', margin: '16px 0' }} />
            <StatBox icon="🚗" label="Car Rentals"    value={stats.rentals}  delay={500} />
            <div style={{ width: 1, background: '#f0f0f0', margin: '16px 0' }} />
            <StatBox icon="🏡" label="Lease Applications" value={stats.leases}   delay={600} />
          </div>
        </div>

      </div>
    </div>
  );
}
