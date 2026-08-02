import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';
import PhotoLightbox from '../../components/PhotoLightbox';

const STATUS_CONFIG = {
  payment_pending:  { label: 'Payment Pending',  bg: '#E3F2FD', color: '#0D2B6B', border: '#90CAF9' },
  pending_approval: { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:         { label: 'Confirmed',         bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  cancelled:        { label: 'Cancelled',         bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14, gap: 12 }}>
      <span style={{ color: '#666', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>{title}</div>
      {children}
    </div>
  );
}

export default function AdminAgentBookingDetail(props) {
  const { id: paramId } = useParams();
  const id = props.bookingId ?? paramId;
  const [b, setB]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [msg, setMsg]   = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/api/admin/agent-bookings/${id}`)
      .then(r => setB(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    if (!confirm('Approve this booking? This will capture the payment and send a confirmation email.')) return;
    setWorking(true);
    try {
      await api.put(`/api/admin/agent-bookings/${id}/approve`);
      setMsg('✅ Booking approved! Confirmation email sent.');
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Failed to approve'));
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setMsg('Please provide a cancellation reason.'); return; }
    if (!confirm('Cancel this booking? This will trigger a refund and send a cancellation email.')) return;
    setWorking(true);
    try {
      await api.put(`/api/admin/agent-bookings/${id}/cancel`, { cancellationReason: cancelReason });
      setMsg('Booking cancelled. Cancellation email sent.');
      setCancelReason('');
      setShowCancelForm(false);
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Failed to cancel'));
    } finally {
      setWorking(false);
    }
  };

  const Wrap = ({ children }) => props.onClose
    ? <>{children}</>
    : <AdminLayout>{children}</AdminLayout>;

  if (loading) return <Wrap><div className="loading"><div className="spinner" /></div></Wrap>;

  if (!b) {
    return (
      <Wrap>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p>Booking not found. {!props.onClose && <Link to="/admin/agent-bookings">← Back to list</Link>}</p>
        </div>
      </Wrap>
    );
  }

  const cfg = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };

  return (
    <>
    {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    <Wrap>
      <div style={{ maxWidth: 800 }}>
        {!props.onClose && (
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin/agent-bookings" style={{ color: '#0D2B6B', fontSize: 13, fontWeight: 600 }}>← All Agent Bookings</Link>
          </div>
        )}

        {msg && (
          <div style={{ background: msg.startsWith('❌') ? '#FFEBEE' : '#E8F5E9', border: `1px solid ${msg.startsWith('❌') ? '#FFCDD2' : '#A5D6A7'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: msg.startsWith('❌') ? '#C62828' : '#2E7D32', fontSize: 14 }}>
            {msg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Agent Booking #{b.id}</h1>
          <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 700 }}>
            {cfg.label}
          </span>
        </div>

        {/* Admin Actions */}
        {b.status === 'pending_approval' && (
          <Section title="⚙️ Admin Actions">
            <p style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>Payment is authorized and held. Approve to capture payment and confirm the booking, or cancel to release the hold.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={working}
                style={{ background: '#2E7D32', borderColor: '#2E7D32' }}
              >
                ✅ Approve & Confirm Booking
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowCancelForm(!showCancelForm)}
                disabled={working}
              >
                ✕ Cancel Booking
              </button>
            </div>
            {showCancelForm && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Cancellation Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Explain why the booking is being cancelled..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <button className="btn btn-danger" onClick={handleCancel} disabled={working || !cancelReason.trim()}>
                    Confirm Cancellation
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowCancelForm(false); setCancelReason(''); }}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        {b.status === 'approved' && (
          <Section title="⚙️ Admin Actions">
            <button
              className="btn btn-danger"
              onClick={() => setShowCancelForm(!showCancelForm)}
              disabled={working}
            >
              ✕ Cancel Booking
            </button>
            {showCancelForm && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Cancellation Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Explain why the booking is being cancelled..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <button className="btn btn-danger" onClick={handleCancel} disabled={working || !cancelReason.trim()}>
                    Confirm Cancellation
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowCancelForm(false); setCancelReason(''); }}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Agent */}
        <Section title="🧭 Agent">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            {b.agent_photo ? (
              <img
                src={`${API_URL}/uploads/${b.agent_photo}`}
                alt={b.agent_name}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', cursor: 'zoom-in' }}
                onClick={() => setLightboxSrc(`${API_URL}/uploads/${b.agent_photo}`)}
                onError={e => e.target.style.display='none'}
              />
            ) : (
              <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #0D2B6B, #1565C0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧭</div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{b.agent_name}</div>
              <div style={{ fontSize: 13, color: '#0D2B6B' }}>{b.agent_specialty}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{b.city_name}, {b.state_name}</div>
            </div>
          </div>
          {b.meeting_location && <Row label="Meeting Location" value={b.meeting_location} />}
        </Section>

        {/* Session Details */}
        <Section title="📅 Session Details">
          <Row label="Date"         value={fmtDate(b.booking_date)} />
          <Row label="Start Time"   value={fmt12(b.start_time)} />
          <Row label="End Time"     value={fmt12(b.end_time)} />
          <Row label="Duration"     value={`${b.total_hours}h`} />
          {b.purpose && <Row label="Purpose" value={b.purpose} />}
          {b.special_requests && <Row label="Special Requests" value={b.special_requests} />}
        </Section>

        {/* Payment */}
        <Section title="💰 Payment">
          <Row label={`$${Number(b.hourly_rate).toFixed(2)}/hr × ${b.total_hours}h`} value={money(b.rental_cost)} />
          {Number(b.deposit_amount) > 0 && <Row label="Deposit" value={money(b.deposit_amount)} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 16, fontWeight: 800, color: '#0D2B6B' }}>
            <span>Total</span><span>{money(b.total_amount)}</span>
          </div>
          {b.stripe_payment_intent_id && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              Stripe PI: <code style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{b.stripe_payment_intent_id}</code>
            </div>
          )}
        </Section>

        {/* Customer */}
        <Section title="👤 Customer">
          <Row label="Name"    value={b.customer_full_name} />
          <Row label="Email"   value={b.customer_email} />
          <Row label="Phone"   value={b.customer_phone} />
          <Row label="DOB"     value={b.customer_dob ? fmtDate(b.customer_dob) : '—'} />
          <Row label="Address" value={b.customer_address || '—'} />
          <Row label="ID Type" value={b.id_type || '—'} />
          {b.id_photo && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 6 }}>ID Photo</div>
              <img src={`${API_URL}/uploads/${b.id_photo}`} alt="ID" style={{ maxWidth: 280, maxHeight: 180, borderRadius: 8, border: '1px solid #eee' }} onError={e => e.target.style.display='none'} />
            </div>
          )}
        </Section>

        {/* Account */}
        <Section title="👤 Account">
          <Row label="Username" value={b.user_name} />
          <Row label="Email"    value={b.user_email} />
          <Row label="Booking Created" value={new Date(b.created_at).toLocaleString()} />
        </Section>

        {b.cancellation_reason && (
          <Section title="✕ Cancellation">
            <div style={{ background: '#FFF3E0', borderLeft: '4px solid #F57C00', borderRadius: 8, padding: '12px 16px', fontSize: 14 }}>
              {b.cancellation_reason}
            </div>
          </Section>
        )}
      </div>
    </Wrap>
    </>
  );
}
