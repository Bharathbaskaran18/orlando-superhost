import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const STATUS_CONFIG = {
  pending_approval:        { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:                { label: 'Approved',         bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
  checked_in:              { label: 'Checked In',       bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
  completed:               { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  completed_with_charges:  { label: 'Completed w/ Charges', bg: '#FFF8E1', color: '#F57C00', border: '#FFE082' },
  completed_extra_charged: { label: 'Extra Charged',    bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
  cancelled:               { label: 'Cancelled',        bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
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
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ap}`;
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
  const dmgRef    = useRef();

  const [b, setB]               = useState(null);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason]       = useState('customer_request');
  const [cancelNotes, setCancelNotes]         = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toTimeString().slice(0, 5);

  const [co, setCo] = useState({
    actualCheckoutDate: today,
    actualCheckoutTime: now,
    actualNumGuests: '',
    propertyCondition: 'good',
    damageDescription: '',
    damageRepairCost: '',
    cleaningFee: '',
    checkoutNotes: '',
  });
  const [dmgFiles, setDmgFiles]     = useState([]);
  const [dmgPreviews, setDmgPreviews] = useState([]);

  const load = () => {
    api.get(`/api/admin/house-bookings/${id}`)
      .then(r => { setB(r.data); setCo(c => ({ ...c, actualNumGuests: String(r.data.num_guests) })); })
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
    act(`/api/admin/house-bookings/${id}/cancel`, 'put', { cancellationReason: reasonLabel, cancellationNotes });
  };

  const handleDmgFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setDmgFiles(files);
    setDmgPreviews(files.map(f => URL.createObjectURL(f)));
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

  const handleCheckout = async () => {
    setWorking(true); setMsg(''); setErr('');
    try {
      const fd = new FormData();
      Object.entries(co).forEach(([k, v]) => fd.append(k, v));
      dmgFiles.forEach(f => fd.append('damagePhotos', f));
      const { data } = await api.post(`/api/admin/house-bookings/${id}/checkout`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg(`Checkout complete. Status: ${data.status}. Total charges: $${Number(data.totalCharges).toFixed(2)}`);
      setShowCheckout(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Checkout failed');
    } finally {
      setWorking(false);
    }
  };

  // ── LIVE CHECKOUT TOTALS ─────────────────────────────────────────────────────
  const liveLateCheckoutFee = (() => {
    if (!b || !co.actualCheckoutTime) return 0;
    const [sh, sm] = String(b.checkout_time || '11:00:00').split(':').map(Number);
    const parts    = String(co.actualCheckoutTime).split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0])) return 0;
    const [ah, am] = parts;
    const diffHours = Math.max(0, Math.ceil(((ah * 60 + am) - (sh * 60 + sm)) / 60));
    return diffHours > 0 ? diffHours * parseFloat(b.late_checkout_fee || 25) : 0;
  })();
  const liveActualGuests  = Math.max(1, parseInt(co.actualNumGuests) || b?.num_guests || 1);
  const liveExtraGuests   = b ? Math.max(0, liveActualGuests - (b.max_guests || 2)) : 0;
  const liveExtraGuestFee = b ? liveExtraGuests * parseFloat(b.extra_guest_fee || 0) * (b.total_nights || 0) : 0;
  const liveRepairCost    = parseFloat(co.damageRepairCost) || 0;
  const liveCleaningFee   = parseFloat(co.cleaningFee) || 0;
  const liveTotalCharges  = liveLateCheckoutFee + liveExtraGuestFee + liveRepairCost + liveCleaningFee;
  const liveDeposit       = parseFloat(b?.deposit_amount) || 0;
  const liveRefund        = Math.max(0, liveDeposit - liveTotalCharges);
  const liveExtraCharge   = Math.max(0, liveTotalCharges - liveDeposit);

  const Wrap = ({ children }) => props.onClose
    ? <>{children}</>
    : <AdminLayout>{children}</AdminLayout>;

  if (loading) return <Wrap><div className="loading"><div className="spinner" /></div></Wrap>;
  if (!b) return <Wrap><div style={{ padding: 40, color: '#555' }}>Booking not found.</div></Wrap>;

  const cfg = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };
  const photo = b.house_photos?.[0];
  const isCompleted = ['completed', 'completed_with_charges', 'completed_extra_charged'].includes(b.status);

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
                ✅ Approve Booking
              </button>
              <button onClick={() => setShowCancelModal(true)} disabled={working} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#C62828', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Cancel Booking
              </button>
            </div>
          )}

          {b.status === 'approved' && (() => {
            const checkinDateStr = String(b.checkin_date).slice(0, 10);
            const todayStr = new Date().toISOString().slice(0, 10);
            const isPast = checkinDateStr < todayStr;
            return (
              <div>
                {isPast ? (
                  <div style={{ background: '#FFF8E1', border: '1.5px solid #FFE082', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 14, color: '#F57C00', fontWeight: 600 }}>
                    ⚠️ Check-in date ({fmtDate(b.checkin_date)}) has passed — guest was not checked in. Use the override to process checkout.
                  </div>
                ) : (
                  <div style={{ background: '#E3F2FD', border: '1.5px solid #BBDEFB', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 14, color: '#1565C0', fontWeight: 600 }}>
                    ⏳ Check-in on <strong>{fmtDate(b.checkin_date)}</strong> at <strong>{fmtTime(b.checkin_time)}</strong> — check-in email will be sent automatically when the time arrives
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => setShowCancelModal(true)} disabled={working} style={{ padding: '10px 22px', borderRadius: 10, border: '1.5px solid #C62828', background: 'transparent', color: '#C62828', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✕ Cancel Booking
                  </button>
                  {/* ── TEST BUTTONS ── remove before going live ── */}
                  <button
                    onClick={() => act(`/api/admin/house-bookings/${id}/checkin`)}
                    disabled={working}
                    title="TEST: Sends check-in email and marks booking as Checked In — use to test without waiting for check-in date"
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #9E9E9E', background: '#F5F5F5', color: '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    🧪 Send Check-In Email Now (Test)
                  </button>
                  <button onClick={() => setShowCheckout(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #9E9E9E', background: '#F5F5F5', color: '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ⚙ Override: Process Checkout Now (Test)
                  </button>
                </div>
              </div>
            );
          })()}

          {b.status === 'checked_in' && (
            <div>
              <div style={{ background: '#E8F5E9', border: '1.5px solid #A5D6A7', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 14, color: '#2E7D32', fontWeight: 600 }}>
                ✅ Guest checked in — check-in email sent automatically on {fmtDate(b.checkin_date)}
              </div>
              {!showCheckout && (
                <button onClick={() => setShowCheckout(true)} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  📋 Process Checkout
                </button>
              )}
            </div>
          )}
        </div>

        {/* Checkout Inspection Form */}
        {showCheckout && (
          <Section title="Checkout Inspection">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Checkout Date</label>
                <input type="date" value={co.actualCheckoutDate} onChange={e => setCo(c => ({ ...c, actualCheckoutDate: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>
                  Checkout Time <span style={{ color: '#888', fontWeight: 400 }}>(scheduled: {fmtTime(b.checkout_time)})</span>
                </label>
                <input type="time" value={co.actualCheckoutTime} onChange={e => setCo(c => ({ ...c, actualCheckoutTime: e.target.value }))} style={inp} />
                {liveLateCheckoutFee > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#E65100' }}>⏰ Late checkout fee: ${liveLateCheckoutFee.toFixed(2)}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>
                  Actual # Guests <span style={{ color: '#888', fontWeight: 400 }}>(max: {b.max_guests})</span>
                </label>
                <input type="number" min="1" value={co.actualNumGuests} onChange={e => setCo(c => ({ ...c, actualNumGuests: e.target.value }))} style={inp} />
                {liveExtraGuestFee > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#E65100' }}>👥 Extra guest fee: ${liveExtraGuestFee.toFixed(2)}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Property Condition</label>
                <select value={co.propertyCondition} onChange={e => setCo(c => ({ ...c, propertyCondition: e.target.value }))} style={inp}>
                  <option value="good">Good — No Issues</option>
                  <option value="fair">Fair — Minor Issues</option>
                  <option value="damaged">Damaged — Repair Needed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cleaning Fee ($)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={co.cleaningFee} onChange={e => setCo(c => ({ ...c, cleaningFee: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Damage Repair Cost ($)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={co.damageRepairCost} onChange={e => setCo(c => ({ ...c, damageRepairCost: e.target.value }))} style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Damage Description</label>
                <textarea rows={3} value={co.damageDescription} onChange={e => setCo(c => ({ ...c, damageDescription: e.target.value }))} placeholder="Describe any damage or issues found..." style={{ ...inp, resize: 'vertical', minHeight: 70 }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Checkout Notes (internal)</label>
                <textarea rows={2} value={co.checkoutNotes} onChange={e => setCo(c => ({ ...c, checkoutNotes: e.target.value }))} placeholder="Internal notes..." style={{ ...inp, resize: 'vertical', minHeight: 60 }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Damage Photos</label>
                <div onClick={() => dmgRef.current?.click()} style={{ border: '2px dashed #1565C0', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#F0F7FF' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1565C0' }}>Click to upload damage photos</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>JPG, PNG · Max 10MB each · Up to 10 photos</div>
                </div>
                <input ref={dmgRef} type="file" accept="image/*" multiple onChange={handleDmgFiles} style={{ display: 'none' }} />
                {dmgPreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {dmgPreviews.map((p, i) => <img key={i} src={p} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #E3F2FD' }} />)}
                  </div>
                )}
              </div>
            </div>

            {/* LIVE CHARGE SUMMARY */}
            <div style={{ background: '#F0F7FF', border: '2px solid #BBDEFB', borderRadius: 12, padding: '18px 20px', marginTop: 20 }}>
              <div style={{ fontWeight: 800, color: '#1565C0', marginBottom: 12, fontSize: 14 }}>💰 Live Charge Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #DEEFFE', color: '#555' }}>
                <span>Rental cost (already paid)</span>
                <span style={{ fontWeight: 600 }}>${Number(b.rental_cost || 0).toFixed(2)}</span>
              </div>
              {liveCleaningFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #DEEFFE', color: '#555' }}>
                  <span>Cleaning fee</span><span style={{ fontWeight: 600 }}>${liveCleaningFee.toFixed(2)}</span>
                </div>
              )}
              {liveLateCheckoutFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #DEEFFE', color: '#E65100' }}>
                  <span>⏰ Late checkout fee</span><span style={{ fontWeight: 600 }}>${liveLateCheckoutFee.toFixed(2)}</span>
                </div>
              )}
              {liveExtraGuestFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #DEEFFE', color: '#E65100' }}>
                  <span>👥 Extra guest fee ({liveExtraGuests} extra × ${parseFloat(b.extra_guest_fee || 0).toFixed(2)} × {b.total_nights} nights)</span><span style={{ fontWeight: 600 }}>${liveExtraGuestFee.toFixed(2)}</span>
                </div>
              )}
              {liveRepairCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #DEEFFE', color: '#C62828' }}>
                  <span>🔧 Damage repair</span><span style={{ fontWeight: 600 }}>${liveRepairCost.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, padding: '10px 0 6px', color: '#1a1a1a', borderTop: '2px solid #BBDEFB', marginTop: 4 }}>
                <span>Total charges</span><span>${liveTotalCharges.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#555' }}>
                <span>Deposit held</span><span style={{ fontWeight: 600 }}>${liveDeposit.toFixed(2)}</span>
              </div>
              {liveTotalCharges === 0 && (
                <div style={{ marginTop: 10, background: '#E8F5E9', borderRadius: 8, padding: '10px 14px', color: '#2E7D32', fontWeight: 700, fontSize: 13 }}>
                  ✅ No additional charges — full deposit of ${liveDeposit.toFixed(2)} will be refunded
                </div>
              )}
              {liveRefund > 0 && liveTotalCharges > 0 && (
                <div style={{ marginTop: 10, background: '#E8F5E9', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', color: '#2E7D32', fontWeight: 800, fontSize: 14 }}>
                  <span>✅ Deposit refund to customer</span><span>${liveRefund.toFixed(2)}</span>
                </div>
              )}
              {liveExtraCharge > 0 && (
                <div style={{ marginTop: 10, background: '#FFEBEE', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', color: '#C62828', fontWeight: 800, fontSize: 14 }}>
                  <span>⚠️ Extra charge needed from customer</span><span>${liveExtraCharge.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={handleCheckout} disabled={working} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {working ? 'Processing...' : '✓ Complete Checkout'}
              </button>
              <button onClick={() => setShowCheckout(false)} style={{ padding: '12px 20px', borderRadius: 10, border: '1.5px solid #E0E0E0', background: '#fff', color: '#555', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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

          {/* Booking Details */}
          <Section title="Booking Details">
            <Row label="Check-In"         value={fmtDate(b.checkin_date)} />
            <Row label="Check-Out"        value={fmtDate(b.checkout_date)} />
            <Row label="Nights"           value={`${b.total_nights}`} />
            <Row label="Guests"           value={`${b.num_guests}${b.pets ? ' · 🐾 Pets' : ''}`} />
            <Row label="Check-In Time"    value={fmtTime(b.checkin_time)} />
            <Row label="Check-Out Time"   value={fmtTime(b.checkout_time)} />
            {b.special_requests && <Row label="Special Requests" value={b.special_requests} />}
          </Section>

          {/* Price Breakdown */}
          <Section title="Price Breakdown">
            <Row label={`${b.total_nights} nights × ${money(b.price_per_night)}/night`} value={money(b.rental_cost)} />
            {Number(b.extra_guest_fee_total) > 0 && <Row label="Extra Guest Fee" value={money(b.extra_guest_fee_total)} />}
            <Row label="Deposit" value={money(b.deposit_amount)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 800, fontSize: 16, color: '#1565C0' }}>
              <span>Total</span><span>{money(b.total_amount)}</span>
            </div>
          </Section>

          {/* House Rules */}
          {b.house_rules && (
            <Section title="House Rules">
              <div style={{ background: '#F0F7FF', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{b.house_rules}</div>
            </Section>
          )}
        </div>

        {/* Checkout Summary (completed) */}
        {isCompleted && (
          <Section title="Checkout Summary">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <Row label="Actual Checkout Date" value={fmtDate(b.actual_checkout_date)} />
              <Row label="Actual Checkout Time" value={fmtTime(b.actual_checkout_time)} />
              <Row label="Actual Guests"         value={b.actual_num_guests} />
              <Row label="Property Condition"    value={b.property_condition} />
              {b.late_checkout_fee_charged > 0  && <Row label="Late Checkout Fee"   value={money(b.late_checkout_fee_charged)} />}
              {b.actual_extra_guest_fee > 0      && <Row label="Extra Guest Fee"     value={money(b.actual_extra_guest_fee)} />}
              {b.damage_repair_cost > 0          && <Row label="Damage Repair"       value={money(b.damage_repair_cost)} />}
              {b.cleaning_fee > 0                && <Row label="Cleaning Fee"        value={money(b.cleaning_fee)} />}
            </div>
            {b.damage_description && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>DAMAGE NOTES</div>
                <div style={{ background: '#FFF8E1', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{b.damage_description}</div>
              </div>
            )}
            {b.checkout_notes && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>CHECKOUT NOTES</div>
                <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{b.checkout_notes}</div>
              </div>
            )}
            {b.damage_photos && (() => {
              const photos = typeof b.damage_photos === 'string' ? JSON.parse(b.damage_photos) : b.damage_photos;
              return photos.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 8 }}>DAMAGE PHOTOS</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {photos.map((p, i) => (
                      <img key={i} src={`${API_URL}/uploads/${p}`} alt="" style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 6, border: '2px solid #E3F2FD', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </Section>
        )}
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
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              style={{ position: 'absolute', top: -16, right: -16, width: 36, height: 36, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >✕</button>
            {/* Download button */}
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
