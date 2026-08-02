import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { HouseStepBar, HouseHeroCard } from './HouseHeroCard';
import { useAuth } from '../../context/AuthContext';
import { setPendingIdFile } from './houseBookingSession';

function Field({ label, required, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#E53935', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ marginTop: 5, fontSize: 12, color: '#C62828' }}>⚠ {error}</div>}
    </div>
  );
}

function inp(err) {
  return {
    width: '100%', padding: '12px 14px', borderRadius: 10, outline: 'none', fontFamily: 'inherit',
    border: `2px solid ${err ? '#E53935' : '#E0E0E0'}`, fontSize: 14, background: 'white',
    color: '#1a1a1a', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
}

const SECTION = { fontSize: 15, fontWeight: 800, color: '#1565C0', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' };

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m-1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function HouseCustomerDetails() {
  const { houseId } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user }    = useAuth();
  const step1       = location.state || {};

  const [house, setHouse] = useState(null);
  useEffect(() => { api.get(`/api/house-booking/house/${houseId}`).then(r => setHouse(r.data)); }, [houseId]);

  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName:  user?.name?.split(' ').slice(1).join(' ') || '',
    dob: '', phone: user?.phone || '', email: user?.email || '',
    address: '', specialRequests: '', idType: '',
  });
  const [idFile, setIdFile]       = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [agreedRules, setAgreedRules]   = useState(false);
  const [agreedCancel, setAgreedCancel] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim() || !/^[a-zA-Z '\-]+$/.test(form.firstName)) e.firstName = 'Letters only';
    if (!form.lastName.trim()  || !/^[a-zA-Z '\-]+$/.test(form.lastName))  e.lastName  = 'Letters only';
    if (!form.dob) { e.dob = 'Required'; }
    else {
      const [y, m, d] = form.dob.split('-').map(Number);
      const age = (Date.now() - new Date(y, m-1, d, 12)) / (365.25 * 86400000);
      if (age < 18) e.dob = 'Must be 18 or older';
    }
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.idType) e.idType = 'Required';
    if (!idFile) e.idFile = 'ID photo required';
    if (house?.house_rules && !agreedRules)  e.agreedRules  = 'Please agree to the house rules';
    if (!agreedCancel) e.agreedCancel = 'Please agree to the cancellation policy';
    return e;
  };

  const handleIdFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIdFile(f);
    setIdPreview(URL.createObjectURL(f));
  };

  const handleContinue = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Store file in module-level variable for Step 3 to access
    setPendingIdFile(idFile);

    navigate(`/house/book/${houseId}/payment`, {
      state: {
        ...step1,
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        dob:       form.dob,
        phone:     form.phone.trim(),
        email:     form.email.trim(),
        address:   form.address.trim(),
        specialRequests: form.specialRequests.trim(),
        idType:    form.idType,
      },
    });
  };

  const lateCheckoutFee = house?.late_checkout_fee || 25;

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 780 }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        </div>

        <HouseStepBar currentStep={2} />
        <HouseHeroCard house={house} />

        {step1.checkin && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', color: 'white', fontSize: 14 }}>
            <span>📅 {fmtDate(step1.checkin)} → {fmtDate(step1.checkout)} ({step1.totalNights} nights)</span>
            <span>👥 {step1.numGuests} guest{step1.numGuests !== 1 ? 's' : ''}{step1.pets ? ' · 🐾 Pets' : ''}</span>
            <span style={{ fontWeight: 700 }}>Total: ${Number(step1.total || 0).toFixed(2)}</span>
          </div>
        )}

        <form onSubmit={handleContinue}>
          {/* Personal Info */}
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION}>Personal Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="First Name" required error={errors.firstName}>
                <input value={form.firstName} onChange={set('firstName')} style={inp(errors.firstName)} placeholder="John" />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input value={form.lastName} onChange={set('lastName')} style={inp(errors.lastName)} placeholder="Smith" />
              </Field>
            </div>
            <Field label="Date of Birth" required error={errors.dob}>
              <input type="date" value={form.dob} onChange={set('dob')} max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().slice(0,10)} style={inp(errors.dob)} />
            </Field>
            <Field label="Phone Number" required error={errors.phone}>
              <input value={form.phone} onChange={set('phone')} style={inp(errors.phone)} placeholder="+1 (555) 000-0000" />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <input type="email" value={form.email} onChange={set('email')} style={inp(errors.email)} placeholder="john@example.com" />
            </Field>
            <Field label="Home Address" required error={errors.address}>
              <input value={form.address} onChange={set('address')} style={inp(errors.address)} placeholder="123 Main St, City, State, ZIP" />
            </Field>
          </div>

          {/* Trip Details */}
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION}>Trip Details</div>
            <div style={{ background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 14, color: '#555' }}>
              <span style={{ fontWeight: 600, color: '#1565C0' }}>Guests: </span>{step1.numGuests}{step1.pets ? ' · 🐾 Bringing pets' : ''}
            </div>
            <Field label="Special Requests (optional)">
              <textarea value={form.specialRequests} onChange={set('specialRequests')} rows={3} style={{ ...inp(false), resize: 'vertical', minHeight: 80 }} placeholder="Any special requests for your stay..." />
            </Field>
          </div>

          {/* ID Verification */}
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION}>ID Verification</div>
            <Field label="ID Type" required error={errors.idType}>
              <select value={form.idType} onChange={set('idType')} style={inp(errors.idType)}>
                <option value="">Select ID type</option>
                <option value="passport">Passport</option>
                <option value="driver_license">Driver License</option>
                <option value="government_id">Government ID</option>
              </select>
            </Field>
            <Field label="Upload ID Photo" required error={errors.idFile}>
              <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${errors.idFile ? '#E53935' : '#1565C0'}`, borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#F0F7FF' }}>
                {idPreview ? (
                  <img src={idPreview} alt="ID" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8 }} />
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1565C0' }}>Click to upload ID photo</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>JPG, PNG · Max 10MB</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleIdFile} style={{ display: 'none' }} />
            </Field>
          </div>

          {/* House Rules */}
          {house?.house_rules && (
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
              <div style={SECTION}>House Rules</div>
              <div style={{ background: '#F0F7FF', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.8, marginBottom: 14 }}>
                {house.house_rules}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={agreedRules} onChange={e => setAgreedRules(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18 }} />
                <span>I have read and agree to the house rules</span>
              </label>
              {errors.agreedRules && <div style={{ marginTop: 6, fontSize: 12, color: '#C62828' }}>⚠ {errors.agreedRules}</div>}
            </div>
          )}

          {/* Cancellation Policy */}
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION}>Cancellation Policy</div>
            <div style={{ background: '#FFF8E1', borderLeft: '4px solid #F57C00', borderRadius: 8, padding: '14px 16px', fontSize: 13, lineHeight: 1.9, marginBottom: 14 }}>
              ✅ Cancel 24+ hours before check-in = Full refund<br />
              ❌ Cancel less than 24 hours = No refund<br />
              ❌ No-show = No refund<br />
              ⏰ Late checkout = ${Number(lateCheckoutFee).toFixed(2)}/hr
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={agreedCancel} onChange={e => setAgreedCancel(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18 }} />
              <span>I understand and agree to the cancellation policy</span>
            </label>
            {errors.agreedCancel && <div style={{ marginTop: 6, fontSize: 12, color: '#C62828' }}>⚠ {errors.agreedCancel}</div>}
          </div>

          <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#F57C00', color: '#1565C0', fontWeight: 800, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit' }}>
            Continue to Payment →
          </button>
        </form>
      </div>
    </div>
  );
}
