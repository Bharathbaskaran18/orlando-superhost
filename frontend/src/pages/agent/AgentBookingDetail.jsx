import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import PhotoLightbox from '../../components/PhotoLightbox';

const STATUS_CONFIG = {
  payment_pending:  { label: 'Payment Pending',   bg: '#E3F2FD', color: '#0D2B6B', border: '#90CAF9', icon: '⏳' },
  pending_approval: { label: 'Pending Approval',  bg: '#FFF9C4', color: '#F57F17', border: '#FFF176', icon: '⏳' },
  approved:         { label: 'Confirmed',          bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7', icon: '✅' },
  cancelled:        { label: 'Cancelled',          bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2', icon: '✕'  },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const fmt12 = (t) => {
  if (!t) return '—';
  const h = parseInt(t);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—';

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14 }}>
      <span style={{ color: '#666', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>{title}</div>
      {children}
    </div>
  );
}

export default function AgentBookingDetail() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    api.get(`/api/agent-booking/booking/${id}`)
      .then(r => setB(r.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  if (notFound || !b) {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 40, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ color: '#1565C0', marginBottom: 8 }}>Booking not found</h3>
          <Link to="/agent/my-bookings" style={{ color: '#0D2B6B', fontWeight: 700 }}>← My Bookings</Link>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0', icon: '📋' };
  const isApproved = b.status === 'approved';

  return (
    <>
    {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 700 }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/agent/my-bookings" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>← My Agent Bookings</Link>
        </div>

        {/* Celebration for new bookings */}
        {b.status === 'pending_approval' && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Booking Submitted!</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>Your payment is authorized and held. We'll confirm your booking shortly.</div>
          </div>
        )}

        {isApproved && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Booking Confirmed!</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>Your agent session is confirmed. Check details below.</div>
          </div>
        )}

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>Booking #{b.id}</div>
          <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 700 }}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Agent Info */}
        <Section title="🧭 Your Travel Agent">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {b.agent_photo ? (
              <img
                src={`${API_URL}/uploads/${b.agent_photo}`}
                alt={b.agent_name}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, cursor: 'zoom-in' }}
                onClick={() => setLightboxSrc(`${API_URL}/uploads/${b.agent_photo}`)}
                onError={e => e.target.style.display='none'}
              />
            ) : (
              <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #0D2B6B, #1565C0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🧭</div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1565C0' }}>{b.agent_name}</div>
              <div style={{ fontSize: 13, color: '#0D2B6B', fontWeight: 600 }}>{b.agent_specialty}</div>
              {b.meeting_location && isApproved && (
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>📍 Meet at: {b.meeting_location}</div>
              )}
            </div>
          </div>
        </Section>

        {/* Session Details */}
        <Section title="📅 Session Details">
          <Row label="Date"         value={fmtDate(b.booking_date)} />
          <Row label="Start Time"   value={fmt12(b.start_time)} />
          <Row label="End Time"     value={fmt12(b.end_time)} />
          <Row label="Duration"     value={`${b.total_hours}h`} />
          <Row label="City"         value={`${b.city_name}, ${b.state_name}`} />
          {b.purpose && <Row label="Purpose" value={b.purpose} />}
        </Section>

        {/* Cost Breakdown */}
        <Section title="💰 Payment">
          <Row label={`$${Number(b.hourly_rate).toFixed(2)}/hr × ${b.total_hours}h`} value={money(b.rental_cost)} />
          {Number(b.deposit_amount) > 0 && <Row label="Security deposit" value={money(b.deposit_amount)} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 16, fontWeight: 800, color: '#0D2B6B' }}>
            <span>Total</span><span>{money(b.total_amount)}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
            {b.status === 'pending_approval'
              ? 'Payment authorized and held — will only be captured after approval'
              : b.status === 'approved'
              ? 'Payment captured'
              : b.status === 'cancelled'
              ? 'If charged, refund will be processed within 3-5 business days'
              : ''}
          </div>
        </Section>

        {/* Your Details */}
        <Section title="👤 Your Details">
          <Row label="Name"    value={b.customer_full_name} />
          <Row label="Email"   value={b.customer_email} />
          <Row label="Phone"   value={b.customer_phone} />
          {b.special_requests && <Row label="Special Requests" value={b.special_requests} />}
        </Section>

        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Link to="/agent/my-bookings" style={{ display: 'inline-block', background: '#0D2B6B', color: 'white', padding: '12px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            View All My Bookings
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
