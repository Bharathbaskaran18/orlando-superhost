import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';
import { formatDate, formatTime } from '../../utils/dateHelper';

const STATUS_LABEL = {
  payment_pending:          'Payment Pending',
  confirmed:                'Confirmed',
  agreement_sent:           'Agreement Sent',
  awaiting_admin_signature: 'Awaiting Rep Signature',
  agreement_complete:       'Agreement Complete',
  active_car_out:           'Active — Car Out',
  returned:                 'Returned',
  completed:                'Completed',
  completed_with_charges:   'Completed — Extra Charged',
  cancelled:                'Cancelled',
  auto_cancelled:           'Auto Cancelled — Agreement Not Signed',
};

const FUEL_LEVELS = ['Full', '3/4', '1/2', '1/4', 'Empty'];
const FUEL_LEVEL_ORDER = { 'Full': 4, '3/4': 3, '1/2': 2, '1/4': 1, 'Empty': 0 };

const fmtDate = formatDate;
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';
const opt   = (v) => (v != null && v !== '') ? String(v) : '—';

function StatusBadge({ status }) {
  if (status === 'active_car_out') {
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3E0', color:'#E65100', border:'1px solid #FFCC80', borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:700 }}>
        🚗 Active — Car Out
      </span>
    );
  }
  if (status === 'completed_with_charges') {
    return <span style={{ background:'#FFF3E0', color:'#E65100', border:'1px solid #FFCC80', borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:700 }}>⚠️ Completed — Extra Charged</span>;
  }
  if (status === 'payment_pending') {
    return <span style={{ background:'#FFF9C4', color:'#F57F17', border:'1px solid #FFF176', borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:700 }}>Pending</span>;
  }
  if (status === 'cancelled' || status === 'auto_cancelled') {
    return <span className="badge badge-cancelled">{STATUS_LABEL[status] || status}</span>;
  }
  return <span className="badge badge-confirmed">{STATUS_LABEL[status] || status}</span>;
}

function AgreementCountdown({ sentAt }) {
  const [remaining, setRemaining] = useState('');
  const [urgency, setUrgency]     = useState('green');

  useEffect(() => {
    const calc = () => {
      const deadline = new Date(sentAt).getTime() + 24 * 60 * 60 * 1000;
      const ms = deadline - Date.now();
      if (ms <= 0) { setRemaining('Expired'); setUrgency('red'); return; }
      const totalMins = Math.floor(ms / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setRemaining(`${hrs}h ${mins}m`);
      setUrgency(hrs < 2 ? 'red' : hrs < 6 ? 'orange' : 'green');
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [sentAt]);

  const colors = {
    green:  { bg:'#E8F5E9', border:'#A5D6A7', color:'#2e7d32' },
    orange: { bg:'#FFF3E0', border:'#FFCC80', color:'#E65100' },
    red:    { bg:'#FFEBEE', border:'#FFCDD2', color:'#b71c1c' },
  };
  const c = colors[urgency];
  return (
    <div style={{ background:c.bg, border:`1.5px solid ${c.border}`, borderRadius:10, padding:'12px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12, fontSize:14 }}>
      <span style={{ fontSize:20 }}>⏰</span>
      <div>
        <strong style={{ color:c.color }}>
          {urgency === 'red' && remaining !== 'Expired' ? '⚠️ ' : ''}
          Customer has {remaining} left to sign the agreement
        </strong>
        <div style={{ fontSize:12, color:'#666', marginTop:2 }}>
          Booking will be automatically cancelled if unsigned. Agreement sent: {new Date(sentAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:8, padding:'6px 0', borderBottom:'1px solid #f0f0f0' }}>
      <span style={{ color:'#888', fontWeight:600, fontSize:13 }}>{label}</span>
      <span style={{ color:'#1a1a1a', fontSize:13 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:12, padding:24, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', marginBottom:20 }}>
      <h3 style={{ fontWeight:700, color:'#0D2B6B', marginBottom:16, marginTop:0, fontSize:16 }}>{title}</h3>
      {children}
    </div>
  );
}

function BillRow({ label, value, sub, color, bold, big, indent }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'9px 0', borderBottom:'1px solid #f0f0f0', paddingLeft: indent ? 16 : 0 }}>
      <div>
        <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 500, color: color || '#555' }}>{label}</span>
        {sub && <span style={{ fontSize:11, color:'#aaa', marginLeft:6 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: big ? 16 : 13, fontWeight: bold ? 800 : 600, color: color || '#1a1a1a' }}>{value}</span>
    </div>
  );
}

export default function AdminCarRentalDetail(props) {
  const { id: paramId } = useParams();
  const id = props.bookingId ?? paramId;

  const [booking,   setBooking]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [actionError, setActionError] = useState('');
  const [saving,    setSaving]    = useState(false);

  // Modal flags
  const [showSendModal,        setShowSendModal]        = useState(false);
  const [showAdminSignModal,   setShowAdminSignModal]   = useState(false);
  const [showCancelConfirm,    setShowCancelConfirm]    = useState(false);
  const [showPickupConfirm,    setShowPickupConfirm]    = useState(false);

  // Form state
  const [agreementForm,  setAgreementForm]  = useState({ odometerAtPickup:'', fuelLevelAtPickup:'Full', adminNotes:'' });
  const [adminSignForm,  setAdminSignForm]  = useState({ adminSignatureName:'', adminSignatureTitle:'' });
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  // Return form state
  const [showReturnForm,  setShowReturnForm]  = useState(false);
  const [returnForm,      setReturnForm]      = useState({
    actualReturnDate: new Date().toISOString().slice(0, 10),
    actualReturnTime: new Date().toTimeString().slice(0, 5),
    odometerAtReturn: '',
    fuelLevelAtReturn: 'Full',
    fuelFee: '',
    conditionAtReturn: 'Good Condition',
    damageDescription: '',
    damageRepairCost: '',
    returnNotes: '',
  });
  const [damagePhotoFiles,    setDamagePhotoFiles]    = useState([]);
  const [damagePhotoPreviews, setDamagePhotoPreviews] = useState([]);
  const [testReturnMode,      setTestReturnMode]      = useState(false);
  const [returnCompleted,     setReturnCompleted]     = useState(null); // null | 'normal' | 'extra_charge'
  const damagePhotoRef  = useRef();
  const returnFormRef   = useRef();

  useEffect(() => { loadBooking(); }, [id]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/car-rental/bookings/${id}`);
      setBooking(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load booking');
    } finally { setLoading(false); }
  };

  // ── Auto-calculate return bill ─────────────────────────────────────────────
  const calcBill = () => {
    if (!booking) return { lateHours:0, lateFee:0, extraMiles:0, extraMileageFee:0, fuelFee:0, damageRepairCost:0, totalDeductions:0, depositRefund:0, extraCharge:0 };
    let lateHours = 0, lateFee = 0;
    if (returnForm.actualReturnDate && returnForm.actualReturnTime) {
      const bookedReturn = new Date(`${String(booking.return_date).slice(0,10)}T${String(booking.return_time).slice(0,5)}`);
      const actualReturn = new Date(`${returnForm.actualReturnDate}T${returnForm.actualReturnTime}`);
      const diffMs = actualReturn - bookedReturn;
      if (diffMs > 0) { lateHours = Math.ceil(diffMs / 3600000); lateFee = lateHours * 25; }
    }
    let extraMiles = 0, extraMileageFee = 0;
    if (returnForm.odometerAtReturn && booking.odometer_at_pickup != null && booking.mileage_cap_per_day) {
      const driven  = Math.max(0, parseInt(returnForm.odometerAtReturn) - booking.odometer_at_pickup);
      const allowed = parseFloat((parseFloat(booking.mileage_cap_per_day) * booking.total_days).toFixed(2));
      extraMiles        = Math.max(0, driven - allowed);
      extraMileageFee   = parseFloat((extraMiles * parseFloat(booking.overage_rate_per_mile || 0)).toFixed(2));
    }
    const fuelFee         = parseFloat(Number(returnForm.fuelFee || 0).toFixed(2));
    const damageRepairCost = returnForm.conditionAtReturn === 'Damaged' ? parseFloat(Number(returnForm.damageRepairCost || 0).toFixed(2)) : 0;
    const totalDeductions  = parseFloat((lateFee + extraMileageFee + fuelFee + damageRepairCost).toFixed(2));
    const deposit          = parseFloat(Number(booking.deposit_amount).toFixed(2));
    const depositRefund    = parseFloat(Math.max(0, deposit - totalDeductions).toFixed(2));
    const extraCharge      = parseFloat(Math.max(0, totalDeductions - deposit).toFixed(2));
    return { lateHours, lateFee, extraMiles, extraMileageFee, fuelFee, damageRepairCost, totalDeductions, depositRefund, extraCharge };
  };

  const calc = calcBill();
  const hasCharges = calc.totalDeductions > 0;

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleMarkPickup = async () => {
    setSaving(true); setActionError('');
    try {
      await api.put(`/api/admin/car-rental/bookings/${id}/mark-pickup`);
      setShowPickupConfirm(false);
      await loadBooking();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to mark as picked up');
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    setSaving(true); setActionError('');
    try {
      await api.put(`/api/admin/car-rental/bookings/${id}/cancel`);
      setShowCancelConfirm(false); await loadBooking();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to cancel');
    } finally { setSaving(false); }
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

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const { data } = await api.get(`/api/admin/car-rental/bookings/${id}/receipt`, { responseType:'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setActionError('Failed to download receipt'); }
    finally { setDownloadingReceipt(false); }
  };

  const handleAdminSign = async (e) => {
    e.preventDefault(); setSaving(true); setActionError('');
    try {
      await api.put(`/api/admin/car-rental/bookings/${id}/admin-sign`, adminSignForm);
      setShowAdminSignModal(false); await loadBooking();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to sign');
    } finally { setSaving(false); }
  };

  const handleSendAgreement = async (e) => {
    e.preventDefault(); setSaving(true); setActionError('');
    try {
      await api.put(`/api/admin/car-rental/bookings/${id}/send-agreement`, agreementForm);
      setShowSendModal(false); await loadBooking();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to send agreement');
    } finally { setSaving(false); }
  };

  const handleDamagePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setDamagePhotoFiles(f => [...f, ...files]);
    setDamagePhotoPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };
  const removeDamagePhoto = (idx) => {
    setDamagePhotoFiles(f => f.filter((_,i) => i !== idx));
    setDamagePhotoPreviews(p => p.filter((_,i) => i !== idx));
  };

  const handleProcessReturn = async (returnType) => {
    const isExtraCharge = returnType === 'with_charges' && calc.extraCharge > 0;

    console.log('[RETURN] ── Button clicked ──────────────────────────────────');
    console.log('[RETURN] returnType:', returnType, '| isExtraCharge:', isExtraCharge);
    console.log('[RETURN] Form state:', {
      actualReturnDate:  returnForm.actualReturnDate,
      actualReturnTime:  returnForm.actualReturnTime,
      odometerAtReturn:  returnForm.odometerAtReturn,
      fuelLevelAtReturn: returnForm.fuelLevelAtReturn,
      fuelFee:           returnForm.fuelFee,
      conditionAtReturn: returnForm.conditionAtReturn,
      damageDescription: returnForm.damageDescription,
      damageRepairCost:  returnForm.damageRepairCost,
      damagePhotos:      damagePhotoFiles.length,
    });
    console.log('[RETURN] Bill calc:', calc);

    setSaving(true); setActionError('');
    try {
      const fd = new FormData();
      fd.append('actualReturnDate',  returnForm.actualReturnDate);
      fd.append('actualReturnTime',  returnForm.actualReturnTime);
      fd.append('odometerAtReturn',  returnForm.odometerAtReturn);
      fd.append('fuelLevelAtReturn', returnForm.fuelLevelAtReturn);
      fd.append('fuelFee',           returnForm.fuelFee || '0');
      fd.append('conditionAtReturn', returnForm.conditionAtReturn);
      fd.append('damageDescription', returnForm.damageDescription || '');
      fd.append('damageRepairCost',  returnForm.damageRepairCost || '0');
      fd.append('returnNotes',       returnForm.returnNotes || '');
      fd.append('returnType',        returnType);
      damagePhotoFiles.forEach(f => fd.append('damagePhotos', f));

      console.log(`[RETURN] PUT /api/admin/car-rental/bookings/${id}/process-return`);
      const response = await api.put(`/api/admin/car-rental/bookings/${id}/process-return`, fd);
      const data = response.data;
      console.log('[RETURN] ✓ Success — response:', data);

      if (data && !data.success) {
        throw new Error(data.error || 'Return processing failed');
      }

      setShowReturnForm(false);
      setReturnCompleted(isExtraCharge ? 'extra_charge' : 'normal');
      await loadBooking();
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch (err) {
      let errMsg = 'Failed to process return. Please try again.';
      if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      } else if (err.message && err.message !== 'Unexpected end of JSON input') {
        errMsg = err.message;
      }
      console.error('[RETURN] ✗ Error:', err.response?.status, err.response?.data, err.message);
      setActionError(errMsg);
    } finally { setSaving(false); }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  const Wrap = ({ children }) => props.onClose
    ? <>{children}</>
    : <AdminLayout>{children}</AdminLayout>;

  if (loading) return <Wrap><div className="loading"><div className="spinner"/></div></Wrap>;
  if (error || !booking) {
    return (
      <Wrap>
        <div className="form-error">{error || 'Booking not found'}</div>
        {!props.onClose && <Link to="/admin/car-rentals" className="btn btn-ghost" style={{ marginTop:12 }}>← Back</Link>}
      </Wrap>
    );
  }

  // ── Derived conditions ─────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0,0,0,0);
  const pickupDate = new Date(String(booking.pickup_date).slice(0,10) + 'T00:00:00');
  const pickupHasPassed = today >= pickupDate;

  const PRE_PICKUP = ['confirmed','agreement_sent','awaiting_admin_signature','agreement_complete'];
  const canCancel        = !['returned','completed','completed_with_charges','active_car_out','cancelled','auto_cancelled'].includes(booking.status);
  const canSendAgreement = booking.status === 'confirmed';
  const canAdminSign     = booking.status === 'awaiting_admin_signature';
  const canMarkPickup    = PRE_PICKUP.includes(booking.status) && pickupHasPassed;
  const RETURNABLE       = ['active_car_out','confirmed','agreement_sent','awaiting_admin_signature','agreement_complete'];
  const canProcessReturn = booking.status === 'active_car_out' || (testReturnMode && RETURNABLE.includes(booking.status));
  const isComplete       = ['completed','completed_with_charges'].includes(booking.status);

  return (
    <Wrap>
      {/* ── HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          {!props.onClose && (
            <Link to="/admin/car-rentals" style={{ color:'#6b6b6b', fontSize:13, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, marginBottom:8 }}>
              ← Back to Car Rentals
            </Link>
          )}
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0D2B6B', margin:0 }}>
            Booking #{booking.id} — {booking.year} {booking.make} {booking.model}
          </h1>
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:12 }}>
            <StatusBadge status={booking.status} />
            <span style={{ color:'#6b6b6b', fontSize:13 }}>{booking.city_name}, {booking.state_name}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end', alignItems:'center' }}>
          {/* Test Return Mode toggle — only show for returnable statuses that aren't already active_car_out */}
          {RETURNABLE.includes(booking.status) && booking.status !== 'active_car_out' && !isComplete && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {testReturnMode && (
                <span style={{ background:'#FFF9C4', color:'#E65100', border:'1px solid #FFE082', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:800, letterSpacing:0.5 }}>
                  TEST MODE
                </span>
              )}
              <button
                onClick={() => { setTestReturnMode(m => !m); setShowReturnForm(false); setActionError(''); }}
                title="Allow processing return without waiting for actual return date"
                style={{
                  background: testReturnMode ? '#E65100' : 'transparent',
                  border: `1.5px solid ${testReturnMode ? '#E65100' : '#ccc'}`,
                  color: testReturnMode ? 'white' : '#888',
                  borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                }}
              >
                🧪 Test: Override Return Date {testReturnMode ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {canSendAgreement && (
            <button className="btn btn-primary" onClick={() => { setAgreementForm({ odometerAtPickup:'', fuelLevelAtPickup:'Full', adminNotes:'' }); setActionError(''); setShowSendModal(true); }}>
              Send Rental Agreement
            </button>
          )}
          {canAdminSign && (
            <button className="btn btn-primary" onClick={() => { setAdminSignForm({ adminSignatureName:'', adminSignatureTitle:'' }); setActionError(''); setShowAdminSignModal(true); }}>
              Sign as Orlando Travels Rep
            </button>
          )}
          {canMarkPickup && (
            <button
              className="btn btn-primary"
              style={{ background:'#2e7d32' }}
              onClick={() => { setActionError(''); setShowPickupConfirm(true); }}
            >
              🚗 Mark as Picked Up
            </button>
          )}
          {canProcessReturn && (
            <button
              className="btn btn-primary"
              style={{ background: testReturnMode && booking.status !== 'active_car_out' ? '#888' : '#E65100' }}
              onClick={() => {
                setReturnForm({
                  actualReturnDate: '',
                  actualReturnTime: '',
                  odometerAtReturn: '',
                  fuelLevelAtReturn: 'Full',
                  fuelFee: '',
                  conditionAtReturn: 'Good Condition',
                  damageDescription: '',
                  damageRepairCost: '',
                  returnNotes: '',
                });
                setDamagePhotoFiles([]);
                setDamagePhotoPreviews([]);
                setReturnCompleted(null);
                setShowReturnForm(true);
                setActionError('');
                setTimeout(() => returnFormRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
              }}
            >
              🔑 Process Car Return{testReturnMode && booking.status !== 'active_car_out' ? ' (Test)' : ''}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger" onClick={() => { setActionError(''); setShowCancelConfirm(true); }}>
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="form-error" style={{ marginBottom:16 }}>{actionError}</div>}

      {returnCompleted && (
        <div style={{ background:'#E8F5E9', border:'1.5px solid #4CAF50', borderRadius:10, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:12 }}>
          <span style={{ fontSize:22, lineHeight:1 }}>✅</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, color:'#2e7d32', fontSize:15 }}>✅ Return completed successfully</div>
            <div style={{ color:'#2e7d32', fontSize:13, marginTop:4 }}>📧 Return summary email sent to customer.</div>
            {returnCompleted === 'extra_charge' && (
              <div style={{ color:'#E65100', fontSize:13, marginTop:3 }}>⚠️ Additional charge details included in the email.</div>
            )}
          </div>
          <button onClick={() => setReturnCompleted(null)} style={{ background:'none', border:'none', color:'#4CAF50', cursor:'pointer', fontSize:18, lineHeight:1, fontFamily:'inherit' }}>✕</button>
        </div>
      )}

      {testReturnMode && (
        <div style={{ background:'#FFF9C4', border:'1.5px dashed #F57C00', borderRadius:10, padding:'10px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
          <span style={{ fontSize:18 }}>🧪</span>
          <div>
            <strong style={{ color:'#E65100' }}>TEST MODE ACTIVE</strong>
            <span style={{ color:'#5d4037', marginLeft:8 }}>Return date override is on — you can process the return regardless of the actual return date. All calculations still apply normally.</span>
          </div>
          <button onClick={() => { setTestReturnMode(false); setShowReturnForm(false); }} style={{ marginLeft:'auto', background:'none', border:'none', color:'#E65100', cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:'inherit' }}>
            ✕ Disable
          </button>
        </div>
      )}

      {/* ── STATUS BANNERS ── */}
      {booking.status === 'agreement_sent' && booking.rental_agreement_sent_at && (
        <AgreementCountdown sentAt={booking.rental_agreement_sent_at} />
      )}
      {booking.status === 'agreement_sent' && !booking.rental_agreement_sent_at && (
        <div style={{ background:'#fff3e0', border:'1px solid #ffa726', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          Rental agreement sent — waiting for customer to sign.
        </div>
      )}
      {booking.status === 'auto_cancelled' && (
        <div style={{ background:'#FFEBEE', border:'1.5px solid #FFCDD2', borderRadius:10, padding:'14px 20px', marginBottom:20, fontSize:14 }}>
          <strong style={{ color:'#b71c1c' }}>⚠️ Auto Cancelled — Agreement Not Signed</strong>
          <div style={{ color:'#555', marginTop:4 }}>This booking was automatically cancelled because the customer did not sign the rental agreement within 24 hours. Please process a refund if applicable.</div>
        </div>
      )}
      {booking.status === 'awaiting_admin_signature' && (
        <div style={{ background:'#E3F2FD', border:'1px solid #90caf9', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          Customer signed on {fmtDate(booking.customer_signed_at)} — click <strong>"Sign as Orlando Travels Rep"</strong> to complete the agreement.
        </div>
      )}
      {booking.status === 'agreement_complete' && (
        <div style={{ background:'#e8f5e9', border:'1px solid #66bb6a', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          Agreement fully signed. {pickupHasPassed ? <strong>Pickup date has arrived — click "Mark as Picked Up" when the customer collects the car.</strong> : 'Ready to hand over the car on the pickup date.'}
        </div>
      )}
      {canMarkPickup && !['agreement_complete'].includes(booking.status) && (
        <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🚗</span>
          <span>Pickup date has arrived. Click <strong>Mark as Picked Up</strong> when the customer collects the car.</span>
        </div>
      )}
      {booking.status === 'active_car_out' && !showReturnForm && (
        <div style={{ background:'#FFF3E0', border:'2px solid #FFCC80', borderRadius:10, padding:'14px 20px', marginBottom:20, fontSize:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>🚗</span>
          <div>
            <strong style={{ color:'#E65100' }}>Car is currently out with the customer.</strong>
            <div style={{ fontSize:13, color:'#555', marginTop:2 }}>
              Expected return: <strong>{fmtDate(booking.return_date)} at {fmtTime(booking.return_time)}</strong>.
              When the car is returned, click <strong>"Process Car Return"</strong> above.
            </div>
          </div>
        </div>
      )}
      {booking.status === 'completed' && (
        <div style={{ background:'#e8f5e9', border:'1px solid #66bb6a', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          ✅ Return completed with no extra charges. Full deposit refunded.
        </div>
      )}
      {booking.status === 'completed_with_charges' && Number(booking.extra_charge_amount) > 0 && (
        <div style={{ background:'#FFF3E0', border:'1.5px solid #FFCC80', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          ⚠️ Return completed with extra charges.
          <span style={{ color:'#c62828', fontWeight:700 }}>
            {' '}An additional {money(booking.extra_charge_amount)} beyond the deposit has been applied.
          </span>
          {' '}Charge notification sent to customer.
        </div>
      )}
      {booking.status === 'completed_with_charges' && !Number(booking.extra_charge_amount) && (
        <div style={{ background:'#fff8e1', border:'1px solid #ffc107', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14 }}>
          ⚠️ Return completed with charges. Deposit partially deducted.
        </div>
      )}
      {booking.status === 'cancelled' && (
        <div style={{ background:'#fce8e6', border:'1px solid #ef9a9a', borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:14, color:'#c62828' }}>
          This booking has been cancelled.
        </div>
      )}

      {/* ── TWO-COLUMN GRID ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div>
          <Section title="Rental Period">
            <Row label="Pickup" value={`${fmtDate(booking.pickup_date)} at ${fmtTime(booking.pickup_time)}`} />
            <Row label="Return" value={`${fmtDate(booking.return_date)} at ${fmtTime(booking.return_time)}`} />
            <Row label="Duration" value={`${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`} />
          </Section>

          <Section title="Payment Summary">
            <Row label="Daily Rate"      value={money(booking.daily_rate)} />
            <Row label="Rental Cost"     value={money(booking.rental_cost)} />
            <Row label="Security Deposit" value={money(booking.deposit_amount)} />
            <Row label="Total Paid" value={<strong style={{ color:'#0D2B6B', fontSize:15 }}>{money(booking.total_amount)}</strong>} />
            {booking.stripe_payment_intent_id && (
              <Row label="Payment ID" value={<span style={{ fontFamily:'monospace', fontSize:12 }}>{booking.stripe_payment_intent_id}</span>} />
            )}
            <div style={{ marginTop:14 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleDownloadReceipt} disabled={downloadingReceipt}>
                {downloadingReceipt ? 'Downloading...' : 'Download Payment Receipt (PDF)'}
              </button>
            </div>
          </Section>

          {booking.odometer_at_pickup != null && (
            <Section title="Vehicle at Pickup">
              <Row label="Odometer"    value={`${booking.odometer_at_pickup} miles`} />
              <Row label="Fuel Level"  value={opt(booking.fuel_level_at_pickup)} />
              {booking.admin_notes && <Row label="Admin Notes" value={opt(booking.admin_notes)} />}
            </Section>
          )}

          {booking.rental_agreement_pdf && (
            <Section title="Rental Agreement">
              <Row label="Sent"             value={booking.rental_agreement_sent_at ? fmtDate(booking.rental_agreement_sent_at) : '—'} />
              <Row label="Customer Signed"  value={booking.customer_signed_at ? `${opt(booking.customer_signature_name)} — ${fmtDate(booking.customer_signed_at)}` : 'Not yet signed'} />
              <Row label="Rep Signed"       value={booking.admin_signed_at ? `${opt(booking.admin_signature_name)}, ${opt(booking.admin_signature_title)} — ${fmtDate(booking.admin_signed_at)}` : 'Not yet signed'} />
              <div style={{ marginTop:14, display:'flex', gap:8 }}>
                <a href={`${API_URL}/uploads/${booking.rental_agreement_pdf}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View PDF</a>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(`${API_URL}/uploads/${booking.rental_agreement_pdf}`, `rental-agreement-${id}.pdf`)}>Download PDF</button>
              </div>
            </Section>
          )}
        </div>

        <div>
          <Section title="Customer Information">
            <Row label="Full Name"    value={opt(booking.customer_full_name)} />
            <Row label="Date of Birth" value={booking.customer_dob ? fmtDate(booking.customer_dob) : '—'} />
            <Row label="Phone"        value={opt(booking.customer_phone)} />
            <Row label="Email"        value={opt(booking.customer_email)} />
            <Row label="Home Address" value={opt(booking.customer_address)} />
            <Row label="Account"      value={`${booking.user_name} (${booking.user_email})`} />
          </Section>

          <Section title="Driver's License">
            <Row label="License Number" value={opt(booking.dl_number)} />
            <Row label="Issuing State"  value={opt(booking.dl_state)} />
            <Row label="Expiration"     value={booking.dl_expiration ? fmtDate(booking.dl_expiration) : '—'} />
            {booking.dl_photo && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:12, color:'#888', marginBottom:8, fontWeight:600 }}>DL Photo</div>
                <img src={`${API_URL}/uploads/${booking.dl_photo}`} alt="Driver License" style={{ width:'100%', maxHeight:200, objectFit:'contain', border:'1px solid #ddd', borderRadius:8, background:'#f9f9f9' }} onError={e => { e.target.style.display='none'; }} />
                <div style={{ marginTop:10, display:'flex', gap:8 }}>
                  <a href={`${API_URL}/uploads/${booking.dl_photo}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View Full Size</a>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const ext = booking.dl_photo.split('.').pop(); downloadFile(`${API_URL}/uploads/${booking.dl_photo}`, `customer-dl-${id}.${ext}`); }}>Download Photo</button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Insurance Information">
            <Row label="Company"          value={opt(booking.insurance_company)} />
            <Row label="Policy Number"    value={opt(booking.insurance_policy_number)} />
            <Row label="Policy Expiration" value={booking.insurance_policy_expiration ? fmtDate(booking.insurance_policy_expiration) : '—'} />
            <Row label="Liability Limits" value={opt(booking.insurance_liability_limits)} />
            <Row label="Covers Rental"    value={opt(booking.insurance_covers_rental)} />
          </Section>
        </div>
      </div>

      {/* ── COMPLETED RETURN SUMMARY ── */}
      {isComplete && booking.actual_return_date && (
        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:12, padding:28, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', marginTop:4, borderTop:`4px solid ${booking.status === 'completed_with_charges' ? '#F57C00' : '#2e7d32'}` }}>
          <h3 style={{ fontWeight:800, color:'#0D2B6B', marginTop:0, marginBottom:20, fontSize:18, display:'flex', alignItems:'center', gap:10 }}>
            {booking.status === 'completed_with_charges' ? '⚠️' : '✅'} Return Summary
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div>
              <Row label="Actual Return" value={`${fmtDate(booking.actual_return_date)} at ${fmtTime(booking.actual_return_time)}`} />
              <Row label="Odometer at Return" value={booking.odometer_at_return != null ? `${booking.odometer_at_return} miles` : '—'} />
              <Row label="Fuel Level Returned" value={opt(booking.fuel_level_at_return)} />
              <Row label="Vehicle Condition" value={<span style={{ color: booking.condition_at_return === 'Damaged' ? '#c62828' : '#2e7d32', fontWeight:700 }}>{opt(booking.condition_at_return)}</span>} />
              {booking.damage_description && <Row label="Damage Description" value={opt(booking.damage_description)} />}
              {booking.return_notes && <Row label="Notes" value={opt(booking.return_notes)} />}
            </div>
            <div style={{ background:'#f8f9ff', borderRadius:12, padding:18, borderLeft:'4px solid #0D2B6B' }}>
              <div style={{ fontWeight:700, color:'#0D2B6B', marginBottom:12, fontSize:14 }}>Final Bill</div>
              <BillRow label="Rental Cost" value={money(booking.rental_cost)} />
              {Number(booking.late_return_fee)  > 0 && <BillRow label="Late Fee" sub={`${booking.late_return_hours} hr(s) × $25`} value={money(booking.late_return_fee)} color="#c62828" indent />}
              {Number(booking.extra_mileage_fee)> 0 && <BillRow label="Extra Mileage" sub={`${booking.extra_miles_driven} mi`} value={money(booking.extra_mileage_fee)} color="#c62828" indent />}
              {Number(booking.fuel_fee)         > 0 && <BillRow label="Fuel Fee" value={money(booking.fuel_fee)} color="#c62828" indent />}
              {Number(booking.damage_amount)    > 0 && <BillRow label="Damage / Repair" value={money(booking.damage_amount)} color="#c62828" indent />}
              <div style={{ borderTop:'2px solid #e0e0e0', marginTop:8, paddingTop:8 }}>
                <BillRow label="Deposit Held" value={money(booking.deposit_amount)} bold />
                <BillRow label={Number(booking.deposit_refunded_amount) > 0 ? 'Deposit Refund' : 'No Refund'} value={money(booking.deposit_refunded_amount)} color={Number(booking.deposit_refunded_amount) > 0 ? '#2e7d32' : '#888'} bold big />
                {Number(booking.extra_charge_amount) > 0 && (
                  <BillRow
                    label={booking.extra_charge_stripe_id ? '💳 Extra Charge (Charged to Card)' : '⚠️ Extra Charge Owed'}
                    value={money(booking.extra_charge_amount)}
                    color="#c62828" bold big
                  />
                )}
              </div>
              <div style={{ marginTop:10, fontSize:12, color:'#888' }}>
                Refund status: <strong>{booking.deposit_refund_status?.replace(/_/g,' ')}</strong>
              </div>
            </div>
          </div>
          {booking.damage_photos && (() => { try { const p = JSON.parse(booking.damage_photos); return p.length > 0 ? (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0D2B6B', marginBottom:10 }}>Damage Photos</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {p.map((photo, i) => (
                  <a key={i} href={`${API_URL}/uploads/${photo}`} target="_blank" rel="noreferrer">
                    <img src={`${API_URL}/uploads/${photo}`} alt={`Damage ${i+1}`} style={{ width:120, height:90, objectFit:'cover', borderRadius:8, border:'2px solid #ffcdd2', cursor:'pointer' }} />
                  </a>
                ))}
              </div>
            </div>
          ) : null; } catch { return null; } })()}
        </div>
      )}

      {/* ── RETURN INSPECTION FORM (inline, slides in when active_car_out) ── */}
      {showReturnForm && (
        <div
          ref={returnFormRef}
          style={{ background:'rgba(255,255,255,0.97)', borderRadius:16, padding:32, boxShadow:'0 8px 40px rgba(0,0,0,0.18)', marginTop:24, borderTop:'4px solid #E65100', animation:'slideDown 0.3s ease' }}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#0D2B6B', margin:0 }}>🔑 Return Inspection</h2>
            <button onClick={() => setShowReturnForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#aaa' }}>✕</button>
          </div>

          {/* Section 1: Return Details */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0D2B6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #E3F2FD' }}>
              1 · Return Date, Time & Odometer
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
              <div className="form-group" style={{ margin:0 }}>
                <label>Actual Return Date *</label>
                <input type="date" value={returnForm.actualReturnDate} onChange={e => setReturnForm(f => ({ ...f, actualReturnDate:e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label>Actual Return Time *</label>
                <input type="time" value={returnForm.actualReturnTime} onChange={e => setReturnForm(f => ({ ...f, actualReturnTime:e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label>Odometer at Return (miles) *</label>
                <input type="number" min="0" placeholder="e.g. 15230" value={returnForm.odometerAtReturn} onChange={e => setReturnForm(f => ({ ...f, odometerAtReturn:e.target.value }))} />
              </div>
            </div>

            {returnForm.actualReturnDate && returnForm.actualReturnTime && (
              <div style={{ marginTop:10, padding:'10px 16px', borderRadius:8, background: calc.lateHours > 0 ? '#FFF3E0' : '#E8F5E9', border:`1px solid ${calc.lateHours > 0 ? '#FFCC80' : '#A5D6A7'}` }}>
                {calc.lateHours > 0
                  ? <span style={{ color:'#e65100', fontWeight:600, fontSize:13 }}>⏰ Late by {calc.lateHours} hr{calc.lateHours!==1?'s':''} — Late fee: <strong>${calc.lateFee.toFixed(2)}</strong> ({calc.lateHours} × $25/hr)</span>
                  : <span style={{ color:'#2e7d32', fontWeight:600, fontSize:13 }}>✅ On time — no late fee</span>}
              </div>
            )}
            {returnForm.odometerAtReturn && booking.odometer_at_pickup != null && (
              <div style={{ marginTop:8, padding:'10px 16px', borderRadius:8, background: calc.extraMiles > 0 ? '#FFF3E0' : '#E8F5E9', border:`1px solid ${calc.extraMiles > 0 ? '#FFCC80' : '#A5D6A7'}` }}>
                {booking.mileage_cap_per_day
                  ? calc.extraMiles > 0
                    ? <span style={{ color:'#e65100', fontWeight:600, fontSize:13 }}>📍 {calc.extraMiles} extra mile{calc.extraMiles!==1?'s':''} — Extra mileage fee: <strong>${calc.extraMileageFee.toFixed(2)}</strong></span>
                    : <span style={{ color:'#2e7d32', fontWeight:600, fontSize:13 }}>✅ Within mileage cap — no overage fee</span>
                  : <span style={{ color:'#888', fontSize:13 }}>No mileage cap configured for this car</span>}
              </div>
            )}
            {returnForm.odometerAtReturn && booking.odometer_at_pickup == null && (
              <div style={{ marginTop:8, padding:'10px 16px', borderRadius:8, background:'#F5F5F5', border:'1px solid #E0E0E0', fontSize:13, color:'#888' }}>
                ℹ️ Odometer at pickup not recorded — mileage fee cannot be auto-calculated.
              </div>
            )}
          </div>

          {/* Section 2: Fuel */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0D2B6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #E3F2FD' }}>
              2 · Fuel
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="form-group" style={{ margin:0 }}>
                <label>Fuel Level at Return *</label>
                <select value={returnForm.fuelLevelAtReturn} onChange={e => setReturnForm(f => ({ ...f, fuelLevelAtReturn:e.target.value }))}>
                  {FUEL_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label>Fuel Fee $ (0 if none)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={returnForm.fuelFee} onChange={e => setReturnForm(f => ({ ...f, fuelFee:e.target.value }))} />
              </div>
            </div>
            {booking.fuel_level_at_pickup && (
              <div style={{ marginTop:8, fontSize:12, color:'#888' }}>
                Fuel at pickup: <strong>{booking.fuel_level_at_pickup}</strong>
                {FUEL_LEVEL_ORDER[returnForm.fuelLevelAtReturn] < FUEL_LEVEL_ORDER[booking.fuel_level_at_pickup]
                  ? <span style={{ color:'#e65100', marginLeft:8 }}>⚠️ Returned with less fuel</span>
                  : <span style={{ color:'#2e7d32', marginLeft:8 }}>✅ Fuel OK</span>}
              </div>
            )}
          </div>

          {/* Section 3: Vehicle Condition */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0D2B6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #E3F2FD' }}>
              3 · Vehicle Condition
            </div>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              {['Good Condition','Damaged'].map(o => (
                <button key={o} type="button"
                  onClick={() => setReturnForm(f => ({ ...f, conditionAtReturn:o }))}
                  style={{ flex:1, padding:'14px 20px', borderRadius:12, border:'2px solid', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                    borderColor: returnForm.conditionAtReturn === o ? (o === 'Damaged' ? '#c62828' : '#2e7d32') : '#e0e0e0',
                    background:  returnForm.conditionAtReturn === o ? (o === 'Damaged' ? '#FFF5F5' : '#E8F5E9') : 'white',
                    color:       returnForm.conditionAtReturn === o ? (o === 'Damaged' ? '#c62828' : '#2e7d32') : '#555',
                  }}
                >
                  {o === 'Good Condition' ? '✅ Good Condition' : '⚠️ Damaged'}
                </button>
              ))}
            </div>

            {returnForm.conditionAtReturn === 'Damaged' && (
              <div style={{ background:'#FFF5F5', border:'1px solid #FFCDD2', borderRadius:12, padding:18 }}>
                <div className="form-group" style={{ margin:'0 0 14px' }}>
                  <label>Damage Description *</label>
                  <textarea rows={3} placeholder="Describe the damage in detail..." value={returnForm.damageDescription} onChange={e => setReturnForm(f => ({ ...f, damageDescription:e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin:'0 0 14px' }}>
                  <label>Damage Photos (up to 10)</label>
                  <input ref={damagePhotoRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleDamagePhotoChange} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => damagePhotoRef.current?.click()}>+ Add Photos</button>
                  {damagePhotoPreviews.length > 0 && (
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12 }}>
                      {damagePhotoPreviews.map((src,i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={src} alt={`damage-${i}`} style={{ width:90, height:70, objectFit:'cover', borderRadius:8, border:'2px solid #FFCDD2' }} />
                          <button onClick={() => removeDamagePhoto(i)} style={{ position:'absolute', top:-6, right:-6, background:'#c62828', border:'none', color:'white', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ margin:0 }}>
                  <label>Damage / Repair Cost $</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={returnForm.damageRepairCost} onChange={e => setReturnForm(f => ({ ...f, damageRepairCost:e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Notes */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0D2B6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #E3F2FD' }}>
              4 · Additional Notes
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label>Any additional notes (optional)</label>
              <textarea rows={2} placeholder="Any other observations..." value={returnForm.returnNotes} onChange={e => setReturnForm(f => ({ ...f, returnNotes:e.target.value }))} />
            </div>
          </div>

          {/* Bill Summary */}
          <div style={{ background:'linear-gradient(135deg,#f8f9ff 0%,#EEF2FF 100%)', border:'2px solid #C5CAE9', borderRadius:14, padding:24, marginBottom:24 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#0D2B6B', marginBottom:16 }}>📋 Final Bill Summary</div>
            <BillRow label="Original Rental Cost" value={money(booking.rental_cost)} />
            <BillRow label="Late Fee" sub={calc.lateHours > 0 ? `${calc.lateHours} hr${calc.lateHours!==1?'s':''} × $25/hr` : 'on time'} value={calc.lateHours > 0 ? `+${money(calc.lateFee)}` : '—'} color={calc.lateHours > 0 ? '#c62828' : '#aaa'} />
            <BillRow label="Extra Mileage Fee" sub={calc.extraMiles > 0 ? `${calc.extraMiles} mi × $${parseFloat(booking.overage_rate_per_mile||0).toFixed(2)}/mi` : booking.mileage_cap_per_day ? 'within cap' : 'no cap'} value={calc.extraMiles > 0 ? `+${money(calc.extraMileageFee)}` : '—'} color={calc.extraMiles > 0 ? '#c62828' : '#aaa'} />
            <BillRow label="Fuel Fee"           value={calc.fuelFee > 0 ? `+${money(calc.fuelFee)}` : '—'} color={calc.fuelFee > 0 ? '#c62828' : '#aaa'} />
            <BillRow label="Damage / Repair"    value={returnForm.conditionAtReturn==='Damaged' && calc.damageRepairCost > 0 ? `+${money(calc.damageRepairCost)}` : '—'} color={calc.damageRepairCost > 0 ? '#c62828' : '#aaa'} />
            <div style={{ height:2, background:'#C5CAE9', margin:'12px 0' }} />
            <BillRow label="Total Deductions"   value={calc.totalDeductions > 0 ? money(calc.totalDeductions) : '$0.00'} color={calc.totalDeductions > 0 ? '#c62828' : '#888'} bold />
            <BillRow label="Security Deposit Held" value={money(booking.deposit_amount)} bold />
            <div style={{ height:2, background:'#C5CAE9', margin:'12px 0' }} />
            <BillRow label={calc.depositRefund > 0 ? 'Deposit to Refund (within 48 hrs)' : 'Deposit Refund'} value={money(calc.depositRefund)} color={calc.depositRefund > 0 ? '#2e7d32' : '#888'} bold big />
            {calc.extraCharge > 0 && (
              <div style={{ marginTop:12, padding:'12px 16px', background:'#FFEBEE', borderRadius:10, border:'2px solid #FFCDD2' }}>
                <BillRow label="⚠️ Extra Charge (exceeds deposit)" value={money(calc.extraCharge)} color="#c62828" bold big />
                <p style={{ fontSize:12, color:'#c62828', margin:'6px 0 0' }}>Deductions exceed the security deposit. Completing the return will charge this amount to the customer's card on file and send them a notification email.</p>
              </div>
            )}
          </div>

          {actionError && (
            <div className="form-error" style={{ marginBottom:16, fontSize:14, padding:'12px 16px' }}>
              ✗ {actionError}
            </div>
          )}

          {/* Validation hints — show what is blocking the submit button */}
          {(() => {
            const missing = [];
            if (!returnForm.actualReturnDate) missing.push('Actual return date (Section 1)');
            if (!returnForm.actualReturnTime) missing.push('Actual return time (Section 1)');
            if (!returnForm.odometerAtReturn) missing.push('Odometer at return (Section 1)');
            if (returnForm.conditionAtReturn === 'Damaged' && !returnForm.damageDescription) missing.push('Damage description (Section 3)');
            return missing.length > 0 ? (
              <div style={{ background:'#FFF3E0', border:'1px solid #FFCC80', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#E65100' }}>
                ⚠️ Complete these required fields before submitting:
                <ul style={{ margin:'4px 0 0', paddingLeft:20 }}>
                  {missing.map(m => <li key={m}>{m}</li>)}
                </ul>
              </div>
            ) : null;
          })()}

          {/* Action Buttons */}
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', flexWrap:'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowReturnForm(false)} disabled={saving}>Cancel</button>
            {(() => {
              const disabled = saving || !returnForm.actualReturnDate || !returnForm.actualReturnTime || !returnForm.odometerAtReturn || (returnForm.conditionAtReturn === 'Damaged' && !returnForm.damageDescription);
              const baseStyle = { color:'white', border:'none', padding:'12px 28px', borderRadius:10, fontWeight:700, fontSize:15, fontFamily:'inherit', transition:'opacity .15s', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' };
              if (!hasCharges) {
                return (
                  <button type="button" disabled={disabled} onClick={() => handleProcessReturn('no_charges')}
                    style={{ ...baseStyle, background:'#2e7d32' }}>
                    {saving ? 'Processing...' : '✅ Complete Return — No Issues'}
                  </button>
                );
              } else if (calc.extraCharge > 0) {
                return (
                  <button type="button" disabled={disabled} onClick={() => handleProcessReturn('with_charges')}
                    style={{ ...baseStyle, background:'#c62828' }}>
                    {saving ? 'Processing...' : `⚠️ Complete Return + Charge Extra ${money(calc.extraCharge)} to Card`}
                  </button>
                );
              } else {
                return (
                  <button type="button" disabled={disabled} onClick={() => handleProcessReturn('with_charges')}
                    style={{ ...baseStyle, background:'#2e7d32' }}>
                    {saving ? 'Processing...' : `✅ Complete Return + Refund ${money(calc.depositRefund)} Deposit`}
                  </button>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* ── MARK AS PICKED UP MODAL ── */}
      {showPickupConfirm && (
        <div className="modal-overlay" onClick={() => setShowPickupConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🚗 Mark as Picked Up</h2>
            <p style={{ color:'#555', marginBottom:20 }}>
              Confirm that <strong>{booking.customer_full_name || booking.user_name}</strong> has collected the <strong>{booking.year} {booking.make} {booking.model}</strong>.
              The status will change to <strong>Active — Car Out</strong>.
            </p>
            {actionError && <div className="form-error" style={{ marginBottom:12 }}>{actionError}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowPickupConfirm(false)}>Cancel</button>
              <button style={{ background:'#2e7d32', color:'white', border:'none', padding:'10px 24px', borderRadius:8, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.7:1 }} onClick={handleMarkPickup} disabled={saving}>
                {saving ? 'Saving...' : 'Yes, Car is Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Cancel Booking</h2>
            <p style={{ color:'#555', marginBottom:20 }}>Are you sure you want to cancel booking #{booking.id}? This cannot be undone.</p>
            {actionError && <div className="form-error" style={{ marginBottom:12 }}>{actionError}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCancelConfirm(false)}>Keep Booking</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={saving}>{saving ? 'Cancelling...' : 'Yes, Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN SIGN MODAL ── */}
      {showAdminSignModal && (
        <div className="modal-overlay" onClick={() => setShowAdminSignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Sign as Orlando Travels Representative</h2>
            <p style={{ fontSize:13, color:'#6b6b6b', marginBottom:16 }}>Your signature will be added to page 13 of the rental agreement.</p>
            {actionError && <div className="form-error" style={{ marginBottom:12 }}>{actionError}</div>}
            <form onSubmit={handleAdminSign}>
              <div className="form-group">
                <label>Your Full Name *</label>
                <input placeholder="e.g. John Smith" value={adminSignForm.adminSignatureName} onChange={e => setAdminSignForm(f => ({ ...f, adminSignatureName:e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Your Title *</label>
                <input placeholder="e.g. Fleet Manager" value={adminSignForm.adminSignatureTitle} onChange={e => setAdminSignForm(f => ({ ...f, adminSignatureTitle:e.target.value }))} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdminSignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Signing...' : 'Sign Agreement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SEND AGREEMENT MODAL ── */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Send Rental Agreement</h2>
            <p style={{ fontSize:13, color:'#6b6b6b', marginBottom:16 }}>Enter vehicle details at pickup, then generate and send the agreement PDF.</p>
            {actionError && <div className="form-error" style={{ marginBottom:12 }}>{actionError}</div>}
            <form onSubmit={handleSendAgreement}>
              <div className="form-group">
                <label>Odometer at Pickup (miles) *</label>
                <input type="number" min="0" placeholder="e.g. 12345" value={agreementForm.odometerAtPickup} onChange={e => setAgreementForm(f => ({ ...f, odometerAtPickup:e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Fuel Level at Pickup</label>
                <select value={agreementForm.fuelLevelAtPickup} onChange={e => setAgreementForm(f => ({ ...f, fuelLevelAtPickup:e.target.value }))}>
                  {FUEL_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Admin Notes (optional)</label>
                <textarea rows={3} placeholder="Any notes about vehicle condition..." value={agreementForm.adminNotes} onChange={e => setAgreementForm(f => ({ ...f, adminNotes:e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSendModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sending...' : 'Generate & Send Agreement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Wrap>
  );
}
