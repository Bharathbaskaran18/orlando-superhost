import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const STATUS_CONFIG = {
  payment_pending:  { label: 'Payment Pending', bg: '#F5F5F5', color: '#555',    border: '#E0E0E0' },
  pending_approval: { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:         { label: 'Approved',         bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
  active:           { label: 'Active Lease',     bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
  completed:        { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  cancelled:        { label: 'Cancelled',        bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
};

const CANCEL_REASONS = [
  { value: 'customer_request', label: 'Customer requested cancellation' },
  { value: 'not_available',    label: 'Property not available' },
  { value: 'maintenance',      label: 'Maintenance issue' },
  { value: 'policy_violation', label: 'Policy violation' },
  { value: 'other',            label: 'Other' },
];

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m-1, d, 12).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const money = (v) => v != null && v !== '' ? `$${Number(v).toFixed(2)}` : '—';

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14 }}>
      <span style={{ color: '#666', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(21,101,192,0.08)', marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1565C0', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>{title}</div>
      {children}
    </div>
  );
}

const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

export default function AdminHouseBookingDetail(props) {
  const { id: paramId } = useParams();
  const id = props.bookingId ?? paramId;
  const navigate  = useNavigate();

  const [b, setB]               = useState(null);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason]       = useState('customer_request');
  const [cancelNotes, setCancelNotes]         = useState('');

  // Move-out form state
  const [showMoveOut, setShowMoveOut] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [mo, setMo] = useState({
    actualMoveOutDate: today,
    depositRefundStatus: 'full',
    depositRefundAmount: '',
    depositRefundNotes: '',
  });

  const load = () => {
    api.get(`/api/admin/house-bookings/${id}`)
      .then(r => setB(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const act = async (endpoint, method = 'put', body = null) => {
    setWorking(true); setMsg(''); setErr('');
    try {
      await api[method](endpoint, body || undefined);
      setMsg('Done!');
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Something went wrong');
    } finally {
      setWorking(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowCancelModal(false);
    const reasonLabel = CANCEL_REASONS.find(r => r.value === cancelReason)?.label || cancelReason;
    act(`/api/admin/house-bookings/${id}/cancel`, 'put', { cancellationReason: reasonLabel, cancellationNotes: cancelNotes });
  };

  const handleRecordPayment = (monthNumber) => {
    act(`/api/admin/house-bookings/${id}/record-payment`, 'post', { monthNumber });
  };

  const handleMoveOut = () => {
    act(`/api/admin/house-bookings/${id}/move-out`, 'post', {
      actualMoveOutDate: mo.actualMoveOutDate,
      depositRefundStatus: mo.depositRefundStatus,
      depositRefundAmount: mo.depositRefundAmount,
      depositRefundNotes: mo.depositRefundNotes,
    });
    setShowMoveOut(false);
  };

  const downloadFile = async (fileUrl, filename) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownloadId = () => {
    if (!b?.id_photo) return;
    const ext = b.id_photo.split('.').pop();
    downloadFile(`${API_URL}/uploads/${b.id_photo}`, `customer-id-${b.id}.${ext}`);
  };

  const Wrap = ({ children }) => props.onClose
    ? <>{children}</>
    : <AdminLayout>{children}</AdminLayout>;

  if (loading) return <Wrap><div className="loading"><div className="spinner" /></div></Wrap>;
  if (!b) return <Wrap><div style={{ padding: 40, color: '#555' }}>Booking not found.</div></Wrap>;

  const cfg = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };
  const photo = b.house_photos?.[0];
  const schedule = Array.isArray(b.payment_schedule) ? b.payment_schedule : (b.payment_schedule ? JSON.parse(b.payment_schedule) : []);
  const deposit = parseFloat(b.deposit_amount) || 0;
  const isCompleted = b.status === 'completed';

  return (
    <Wrap>
      <div style={{ maxWidth: 820 }}>
        {!props.onClose && (
          <button onClick={() => navigate('/admin/house-bookings')} style={{ background: 'none', border: 'none', color: '#1565C0', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', marginBottom: 20 }}>
            ← House Bookings
          </button>
        )}

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(21,101,192,0.08)', marginBottom: 16, display: 'flex' }}>
          {photo ? (
            <img src={`${API_URL}/uploads/${photo}`} alt="" style={{ width: 150, height: 120, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 150, height: 120, background: 'linear-gradient(135deg,#1565C0,#42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, flexShrink: 0 }}>🏠</div>
          )}
          <div style={{ padding: '18px 22px', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1565C0', marginBottom: 3 }}>{b.house_name}</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>{b.house_address} · {b.city_name}, {b.state_name}</div>
            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '3px 14px', fontSize: 13, fontWeight: 700 }}>{cfg.label}</span>
          </div>
          <div style={{ padding: '18px', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#888' }}>Booking</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1565C0' }}>#{b.id}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(b.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Messages */}
        {msg && <div style={{ background: '#E8F5E9', borderRadius: 10, padding: '12px 18px', marginBottom: 14, color: '#2E7D32', fontWeight: 600, fontSize: 14 }}>✅ {msg}</div>}
        {err && <div style={{ background: '#FFEBEE', borderRadius: 10, padding: '12px 18px', marginBottom: 14, color: '#C62828', fontWeight: 600, fontSize: 14 }}>⚠ {err}</div>}

        {/* Action Buttons */}
        <div style={{ marginBottom: 20 }}>
          {b.status === 'pending_approval' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => act(`/api/admin/house-bookings/${id}/approve`)} disabled={working} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#1565C0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✅ Approve Lease
              </button>
              <button onClick={() => setShowCancelModal(true)} disabled={working} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#C62828', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Cancel Booking
              </button>
            </div>
          )}

          {b.status === 'approved' && (() => {
            const moveInStr = String(b.move_in_date).slice(0, 10);
            const todayStr  = new Date().toISOString().slice(0, 10);
            const isDue = moveInStr <= todayStr;
            return (
              <div>
                {isDue ? (
                  <div style={{ background: '#FFF8E1', border: '1.5px solid #FFE082', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 14, color: '#F57C00', fontWeight: 600 }}>
                    ⏰ Move-in date ({fmtDate(b.move_in_date)}) has arrived — the system will activate this lease automatically, or you can move them in now.
                  </div>
                ) : (
                  <div style={{ background: '#E3F2FD', border: '1.5px solid #BBDEFB', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 14, color: '#1565C0', fontWeight: 600 }}>
                    ⏳ Move-in scheduled for <strong>{fmtDate(b.move_in_date)}</strong> — the lease will activate automatically that day.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => setShowCancelModal(true)} disabled={working} style={{ padding: '10px 22px', borderRadius: 10, border: '1.5px solid #C62828', background: 'transparent', color: '#C62828', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✕ Cancel Booking
                  </button>
                  <button
                    onClick={() => act(`/api/admin/house-bookings/${id}/move-in`)}
                    disabled={working}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #9E9E9E', background: '#F5F5F5', color: '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    🏠 Move In Now (Manual)
                  </button>
                </div>
              </div>
            );
          })()}

          {b.status === 'active' && !showMoveOut && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: '#E8F5E9', border: '1.5px solid #A5D6A7', borderRadius: 10, padding: '12px 18px', fontSize: 14, color: '#2E7D32', fontWeight: 600, flex: '1 1 100%' }}>
                ✅ Tenant moved in on {fmtDate(b.move_in_date)} — lease active
              </div>
              <button onClick={() => setShowMoveOut(true)} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                📋 Process Move-Out
              </button>
            </div>
          )}
        </div>

        {/* Payment Schedule */}
        {b.status === 'active' && (
          <Section title="Payment Schedule">
            <Row label="First Month Rent" value={`${money(b.monthly_rent)} — paid at booking`} />
            {schedule.length === 0 && <div style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>No further monthly payments due — single-month lease.</div>}
            {schedule.map(m => (
              <div key={m.monthNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F0F4F8' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Month {m.monthNumber} — {fmtDate(m.dueDate)}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{money(m.amount)}{m.status === 'paid' && m.paidAt ? ` · Paid ${new Date(m.paidAt).toLocaleDateString()}` : ''}</div>
                </div>
                {m.status === 'paid' ? (
                  <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>✅ Paid</span>
                ) : (
                  <button onClick={() => handleRecordPayment(m.monthNumber)} disabled={working} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#1565C0', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Record Payment Received
                  </button>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Move-Out Form */}
        {showMoveOut && (
          <Section title="Process Move-Out">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Move-Out Date</label>
                <input type="date" value={mo.actualMoveOutDate} onChange={e => setMo(c => ({ ...c, actualMoveOutDate: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>
                  Deposit Refund <span style={{ color: '#888', fontWeight: 400 }}>(held: {money(deposit)})</span>
                </label>
                <select value={mo.depositRefundStatus} onChange={e => setMo(c => ({ ...c, depositRefundStatus: e.target.value }))} style={inp}>
                  <option value="full">Full Refund</option>
                  <option value="partial">Partial Refund</option>
                  <option value="withheld">Withheld — No Refund</option>
                </select>
              </div>
              {mo.depositRefundStatus === 'partial' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Refund Amount ($)</label>
                  <input type="number" min="0" max={deposit} step="0.01" value={mo.depositRefundAmount} onChange={e => setMo(c => ({ ...c, depositRefundAmount: e.target.value }))} style={inp} placeholder="0.00" />
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea rows={3} value={mo.depositRefundNotes} onChange={e => setMo(c => ({ ...c, depositRefundNotes: e.target.value }))} placeholder="Reason for withholding, condition notes, etc." style={{ ...inp, resize: 'vertical', minHeight: 70 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={handleMoveOut} disabled={working} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {working ? 'Processing...' : '✓ Complete Move-Out'}
              </button>
              <button onClick={() => setShowMoveOut(false)} style={{ padding: '12px 20px', borderRadius: 10, border: '1.5px solid #E0E0E0', background: '#fff', color: '#555', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </Section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Customer Info */}
          <Section title="Customer Information">
            <Row label="Full Name"     value={b.customer_full_name} />
            <Row label="Email"         value={b.customer_email} />
            <Row label="Phone"         value={b.customer_phone} />
            <Row label="Address"       value={b.customer_address} />
            <Row label="Date of Birth" value={b.customer_dob ? fmtDate(b.customer_dob) : '—'} />
            <Row label="ID Type"       value={b.id_type?.replace('_', ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || '—'} />
            {b.id_photo && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>ID PHOTO</div>
                <img
                  src={`${API_URL}/uploads/${b.id_photo}`}
                  alt="ID"
                  onClick={() => setLightboxOpen(true)}
                  style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: '2px solid #E3F2FD', cursor: 'zoom-in', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.target.style.opacity = '0.85'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                  title="Click to view full size"
                />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Click to enlarge</div>
              </div>
            )}
          </Section>

          {/* Lease Details */}
          <Section title="Lease Details">
            <Row label="Move-In"          value={fmtDate(b.move_in_date)} />
            <Row label="Move-Out"         value={fmtDate(b.move_out_date)} />
            <Row label="Rental Period"    value={`${b.total_months} month${b.total_months !== 1 ? 's' : ''}`} />
            <Row label="Monthly Rent"     value={money(b.monthly_rent)} />
            {b.next_payment_date && <Row label="Next Payment Due" value={fmtDate(b.next_payment_date)} />}
            {b.special_requests && <Row label="Special Requests" value={b.special_requests} />}
          </Section>

          {/* Payment Summary */}
          <Section title="Payment Summary">
            <Row label="First Month Rent" value={money(b.monthly_rent)} />
            <Row label="Deposit" value={money(b.deposit_amount)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 800, fontSize: 16, color: '#1565C0' }}>
              <span>Paid Today</span><span>{money(b.total_amount)}</span>
            </div>
          </Section>

          {/* Deposit Settlement */}
          {isCompleted && (
            <Section title="Deposit Settlement">
              <Row label="Move-Out Date"    value={fmtDate(b.move_out_date)} />
              <Row label="Refund Status"    value={b.deposit_refund_status ? b.deposit_refund_status.charAt(0).toUpperCase() + b.deposit_refund_status.slice(1) : '—'} />
              <Row label="Refund Amount"    value={money(b.deposit_refund_amount)} />
              {b.deposit_refund_notes && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>NOTES</div>
                  <div style={{ background: '#FFF8E1', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{b.deposit_refund_notes}</div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* ── ID PHOTO LIGHTBOX ──────────────────────────────────────────────────── */}
      {lightboxOpen && b.id_photo && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={`${API_URL}/uploads/${b.id_photo}`}
              alt="Customer ID"
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setLightboxOpen(false)}
              style={{ position: 'absolute', top: -16, right: -16, width: 36, height: 36, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >✕</button>
            <button
              onClick={handleDownloadId}
              style={{ position: 'absolute', bottom: -48, left: '50%', transform: 'translateX(-50%)', background: '#1565C0', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >⬇ Download ID Photo</button>
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Click outside to close</div>
        </div>
      )}

      {/* ── CANCEL MODAL ──────────────────────────────────────────────────────── */}
      {showCancelModal && (
        <div
          onClick={() => setShowCancelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#C62828', marginBottom: 6 }}>Cancel Booking #{b.id}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>A cancellation email will be sent to {b.customer_email}.</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#444', display: 'block', marginBottom: 6 }}>Reason for Cancellation *</label>
              <select value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ ...inp, border: '1.5px solid #C62828' }}>
                {CANCEL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#444', display: 'block', marginBottom: 6 }}>Additional Notes (optional)</label>
              <textarea
                rows={3}
                value={cancelNotes}
                onChange={e => setCancelNotes(e.target.value)}
                placeholder="Any additional information for the customer..."
                style={{ ...inp, resize: 'vertical', minHeight: 80 }}
              />
            </div>

            <div style={{ background: '#FFF8E1', borderLeft: '4px solid #F57C00', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555', marginBottom: 20 }}>
              ⚠️ This action will cancel the booking and cannot be undone. The customer will receive a cancellation email with the reason provided.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCancelConfirm} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#C62828', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Confirm Cancel
              </button>
              <button onClick={() => setShowCancelModal(false)} style={{ padding: '12px 22px', borderRadius: 10, border: '1.5px solid #E0E0E0', background: '#F5F5F5', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </Wrap>
  );
}
