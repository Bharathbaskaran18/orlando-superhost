import { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setPendingIdFile } from './agentBookingSession';
import { AgentStepBar } from './AgentHeroCard';

const ID_TYPES = ['Passport', 'Driver\'s License', 'National ID Card', 'State ID', 'Military ID'];
const PURPOSES = ['Tourism & Sightseeing', 'Business Travel', 'Cultural Experience', 'Food & Dining', 'Adventure & Outdoor', 'Shopping', 'Family Trip', 'Photography', 'Other'];

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

const inp = (err) => ({
  width: '100%', padding: '12px 14px', borderRadius: 10, outline: 'none', fontFamily: 'inherit',
  border: `2px solid ${err ? '#E53935' : '#E0E0E0'}`, fontSize: 14, background: 'white',
  color: '#1a1a1a', transition: 'border-color 0.2s', boxSizing: 'border-box',
});

const SECTION_HDR = { fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' };

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmt12 = (t) => {
  if (!t) return '';
  const h = parseInt(t);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};

export default function AgentCustomerDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const step1 = location.state || {};

  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName:  user?.name?.split(' ').slice(1).join(' ') || '',
    dob: '', phone: user?.phone || '', email: user?.email || '',
    address: '', idType: '', purpose: '', specialRequests: '',
  });
  const [idFile, setIdFile]       = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [agreedCancel, setAgreedCancel] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim() || !/^[a-zA-Z '\-]+$/.test(form.firstName)) e.firstName = 'Letters only';
    if (!form.lastName.trim()  || !/^[a-zA-Z '\-]+$/.test(form.lastName))  e.lastName  = 'Letters only';
    if (!form.dob) {
      e.dob = 'Required';
    } else {
      const [y, m, d] = form.dob.split('-').map(Number);
      const age = (Date.now() - new Date(y, m - 1, d, 12)) / (365.25 * 86400000);
      if (age < 18) e.dob = 'Must be 18 or older';
    }
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.idType) e.idType = 'Required';
    if (!idFile) e.idFile = 'Government-issued ID photo required';
    if (!agreedCancel) e.agreedCancel = 'Please agree to the cancellation policy';
    return e;
  };

  const handleIdFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setIdFile(f);
    const reader = new FileReader();
    reader.onload = ev => setIdPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleContinue = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPendingIdFile(idFile);
    navigate(`/agent/book/${agentId}/payment`, {
      state: {
        ...step1,
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        dob:       form.dob,
        phone:     form.phone.trim(),
        email:     form.email.trim(),
        address:   form.address.trim(),
        idType:    form.idType,
        purpose:   form.purpose,
        specialRequests: form.specialRequests.trim(),
      },
    });
  };

  if (!step1.bookingDate) {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 32, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p>Missing booking info. <Link to={`/agent/book/${agentId}`}>Go back to Step 1</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 720 }}>
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        </div>

        <AgentStepBar currentStep={2} />

        {/* Booking Summary Strip */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 18px', marginBottom: 20, color: 'white', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
          <span>📅 {fmtDate(step1.bookingDate)}</span>
          <span>🕐 {fmt12(step1.startTime)} — {fmt12(step1.endTime)}</span>
          <span>⏱ {step1.totalHours}h session</span>
          <span style={{ fontWeight: 800 }}>💰 ${Number(step1.totalAmount).toFixed(2)}</span>
        </div>

        <form onSubmit={handleContinue}>
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION_HDR}>👤 Personal Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="First Name" required error={errors.firstName}>
                <input style={inp(errors.firstName)} value={form.firstName} onChange={set('firstName')} placeholder="John" onFocus={() => setErrors(e => ({ ...e, firstName: undefined }))} />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input style={inp(errors.lastName)} value={form.lastName} onChange={set('lastName')} placeholder="Doe" onFocus={() => setErrors(e => ({ ...e, lastName: undefined }))} />
              </Field>
              <Field label="Date of Birth" required error={errors.dob}>
                <input type="date" style={inp(errors.dob)} value={form.dob} onChange={set('dob')} max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split('T')[0]} onFocus={() => setErrors(e => ({ ...e, dob: undefined }))} />
              </Field>
              <Field label="Phone Number" required error={errors.phone}>
                <input type="tel" style={inp(errors.phone)} value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" onFocus={() => setErrors(e => ({ ...e, phone: undefined }))} />
              </Field>
            </div>
            <Field label="Email Address" required error={errors.email}>
              <input type="email" style={inp(errors.email)} value={form.email} onChange={set('email')} placeholder="john@example.com" onFocus={() => setErrors(e => ({ ...e, email: undefined }))} />
            </Field>
            <Field label="Current Address" required error={errors.address}>
              <textarea style={{ ...inp(errors.address), resize: 'vertical', minHeight: 72 }} value={form.address} onChange={set('address')} placeholder="123 Main St, City, State, ZIP" onFocus={() => setErrors(e => ({ ...e, address: undefined }))} />
            </Field>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION_HDR}>🪪 Government ID</div>
            <Field label="ID Type" required error={errors.idType}>
              <select style={inp(errors.idType)} value={form.idType} onChange={set('idType')} onFocus={() => setErrors(e => ({ ...e, idType: undefined }))}>
                <option value="">— Select ID Type —</option>
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="ID Photo" required error={errors.idFile}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${errors.idFile ? '#E53935' : '#D0D7E3'}`, borderRadius: 10,
                  padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                  background: idPreview ? '#f0fdf4' : '#fafbff',
                  transition: 'border-color 0.2s',
                }}
              >
                {idPreview ? (
                  <img src={idPreview} alt="ID preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6 }} />
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🪪</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Click to upload your ID photo</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>JPG, PNG, GIF or WEBP · Max 10 MB</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIdFile} />
              {idFile && <div style={{ marginTop: 6, fontSize: 12, color: '#2E7D32' }}>✓ {idFile.name}</div>}
            </Field>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={SECTION_HDR}>🎯 Trip Details</div>
            <Field label="Purpose of Visit">
              <select style={inp(false)} value={form.purpose} onChange={set('purpose')}>
                <option value="">— Select a purpose (optional) —</option>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Special Requests">
              <textarea
                style={{ ...inp(false), resize: 'vertical', minHeight: 80 }}
                value={form.specialRequests}
                onChange={set('specialRequests')}
                placeholder="Any specific requirements, accessibility needs, or preferences..."
              />
            </Field>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 20 }}>
            <div style={SECTION_HDR}>📋 Policies</div>
            <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
              <strong>Cancellation Policy:</strong> Please cancel at least 24 hours before your session start time to avoid charges. Cancellations within 24 hours may be subject to a cancellation fee. Payment is held and only captured after admin approval.
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreedCancel} onChange={e => { setAgreedCancel(e.target.checked); setErrors(er => ({ ...er, agreedCancel: undefined })); }} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#333' }}>I have read and agree to the cancellation policy and understand that my payment will be held pending admin approval.</span>
            </label>
            {errors.agreedCancel && <div style={{ marginTop: 6, fontSize: 12, color: '#C62828' }}>⚠ {errors.agreedCancel}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-full btn-lg"
            style={{ background: '#0D2B6B', color: 'white', border: 'none' }}
          >
            Continue to Payment →
          </button>
        </form>
      </div>
    </div>
  );
}
