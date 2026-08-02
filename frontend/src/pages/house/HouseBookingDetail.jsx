import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';

const STATUS_CONFIG = {
  pending_approval:        { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176', icon: '⏳' },
  approved:                { label: 'Approved',         bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB', icon: '✅' },
  checked_in:              { label: 'Checked In',       bg: '#FFF3E0', color: '#E65100', border: '#FFCC80', icon: '🏠' },
  completed:               { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7', icon: '✓' },
  completed_with_charges:  { label: 'Completed (Charges)', bg: '#FFF8E1', color: '#F57C00', border: '#FFE082', icon: '⚠️' },
  completed_extra_charged: { label: 'Extra Charge',     bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2', icon: '⚠️' },
  cancelled:               { label: 'Cancelled',        bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2', icon: '✕' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m-1, d, 12).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ampm}`;
};

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
      <div style={{ fontSize: 15, fontWeight: 800, color: '#1565C0', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>{title}</div>
      {children}
    </div>
  );
}

export default function HouseBookingDetail() {
  const { id }     = useParams();
  const [b, setB]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/api/house-booking/booking/${id}`)
      .then(r => setB(r.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (notFound || !b) return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: 16, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
        <h2 style={{ color: '#1565C0' }}>Booking not found</h2>
        <Link to="/house/my-bookings" style={{ color: '#1565C0', fontWeight: 700 }}>← My Stays</Link>
      </div>
    </div>
  );

  const cfg = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0', icon: '?' };
  const photo = b.house_photos?.[0];
  const isApproved = ['approved', 'checked_in', 'completed', 'completed_with_charges', 'completed_extra_charged'].includes(b.status);
  const isCompleted = ['completed', 'completed_with_charges', 'completed_extra_charged'].includes(b.status);

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 780 }}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/house/my-bookings" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← My House Stays</Link>
        </div>

        {/* Header */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16, display: 'flex' }}>
          {photo ? (
            <img src={`${API_URL}/uploads/${photo}`} alt="" style={{ width: 160, height: 130, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 160, height: 130, background: 'linear-gradient(135deg, #1565C0, #42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, flexShrink: 0 }}>🏠</div>
          )}
          <div style={{ padding: '18px 22px', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1565C0', marginBottom: 4 }}>{b.house_name}</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>{b.house_address}</div>
            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div style={{ padding: '18px', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Booking</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1565C0' }}>#{b.id}</div>
          </div>
        </div>

        {/* Booking Details */}
        <Section title="Booking Details">
          <Row label="Check-In"  value={fmtDate(b.checkin_date)} />
          <Row label="Check-Out" value={fmtDate(b.checkout_date)} />
          <Row label="Nights"    value={`${b.total_nights} night${b.total_nights !== 1 ? 's' : ''}`} />
          <Row label="Guests"    value={`${b.num_guests} guest${b.num_guests !== 1 ? 's' : ''}${b.pets ? ' · 🐾 Pets' : ''}`} />
          {isApproved && b.checkin_time  && <Row label="Check-In Time"  value={fmtTime(b.checkin_time)} />}
          {isApproved && b.checkout_time && <Row label="Check-Out Time" value={fmtTime(b.checkout_time)} />}
        </Section>

        {/* Price Breakdown */}
        <Section title="Price Breakdown">
          <Row label={`${b.total_nights} nights × $${Number(b.price_per_night).toFixed(2)}/night`} value={`$${Number(b.rental_cost).toFixed(2)}`} />
          {Number(b.extra_guest_fee_total) > 0 && <Row label="Extra Guest Fee" value={`$${Number(b.extra_guest_fee_total).toFixed(2)}`} />}
          {Number(b.deposit_amount) > 0 && <Row label="Deposit (refundable)" value={`$${Number(b.deposit_amount).toFixed(2)}`} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 18, fontWeight: 800, color: '#1565C0' }}>
            <span>Total</span>
            <span>${Number(b.total_amount).toFixed(2)}</span>
          </div>
        </Section>

        {/* Check-In Instructions (shown once approved) */}
        {isApproved && b.checkin_instructions && (
          <Section title="Check-In Instructions">
            <div style={{ background: '#F0F7FF', borderLeft: '4px solid #1565C0', borderRadius: 8, padding: '14px 16px', fontSize: 14, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {b.checkin_instructions}
            </div>
          </Section>
        )}

        {/* Checkout Summary (once completed) */}
        {isCompleted && (
          <Section title="Checkout Summary">
            {b.actual_checkout_date && <Row label="Actual Checkout Date" value={fmtDate(b.actual_checkout_date)} />}
            {b.actual_checkout_time && <Row label="Actual Checkout Time" value={fmtTime(b.actual_checkout_time)} />}
            {b.property_condition   && <Row label="Property Condition"   value={b.property_condition} />}
            {b.late_checkout_fee_charged > 0 && <Row label="Late Checkout Fee" value={`$${Number(b.late_checkout_fee_charged).toFixed(2)}`} />}
            {b.actual_extra_guest_fee > 0    && <Row label="Extra Guest Fee"   value={`$${Number(b.actual_extra_guest_fee).toFixed(2)}`} />}
            {b.damage_repair_cost > 0        && <Row label="Damage Repair"     value={`$${Number(b.damage_repair_cost).toFixed(2)}`} />}
            {b.cleaning_fee > 0              && <Row label="Cleaning Fee"      value={`$${Number(b.cleaning_fee).toFixed(2)}`} />}
            {b.damage_description && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6 }}>DAMAGE NOTES</div>
                <div style={{ background: '#FFF8E1', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#555' }}>{b.damage_description}</div>
              </div>
            )}
          </Section>
        )}

        {/* What's Next */}
        {b.status === 'pending_approval' && (
          <div style={{ background: '#E3F2FD', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: '#1565C0', fontWeight: 600 }}>
            📋 Your booking is under review. You'll receive an email once it's approved (within 24 hours).
          </div>
        )}
        {b.status === 'approved' && (
          <div style={{ background: '#E8F5E9', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: '#2E7D32', fontWeight: 600 }}>
            ✅ Your booking is approved! Check-in instructions are shown above.
          </div>
        )}
        {b.status === 'checked_in' && (
          <div style={{ background: '#FFF3E0', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: '#E65100', fontWeight: 600 }}>
            🏠 You are currently checked in. Enjoy your stay!
          </div>
        )}
      </div>
    </div>
  );
}
