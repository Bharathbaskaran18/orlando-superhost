import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { CarStepBar, CarHeroCard } from './CarHeroCard';
import { setPendingDlPhoto } from './carRentalSession';

const STATES_US = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

/* ── Field wrapper ── */
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#E53935', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function baseInput(focused) {
  return {
    width: '100%',
    padding: '14px 16px',
    border: `2px solid ${focused ? '#0D2B6B' : '#E0E0E0'}`,
    borderRadius: 10,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1a1a1a',
    background: 'white',
    boxShadow: focused ? '0 0 0 3px rgba(13,43,107,0.15)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
}

/* ── Text / date input ── */
function Input({ label, value, onChange, type = 'text', required, placeholder, max, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} required={required}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        placeholder={placeholder}
        max={max}
        style={{ ...baseInput(focused), borderColor: error ? '#E53935' : focused ? '#0D2B6B' : '#E0E0E0' }}
      />
      {error && (
        <div style={{ marginTop: 6, fontSize: 13, color: '#C62828', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>⚠</span> {error}
        </div>
      )}
    </Field>
  );
}

/* ── Select ── */
function Select({ label, value, onChange, required, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} required={required}>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          style={{ ...baseInput(focused), appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
        >
          {children}
        </select>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#aaa', fontSize: 12 }}>▼</span>
      </div>
    </Field>
  );
}

/* ── DOB 3-box input ── */
function DobInput({ value, onChange, required }) {
  const monthRef = useRef(null);
  const dayRef   = useRef(null);
  const yearRef  = useRef(null);

  // Local state for each part so controlled inputs update immediately on keypress
  const [mm,   setMm]   = useState('');
  const [dd,   setDd]   = useState('');
  const [yyyy, setYyyy] = useState('');

  // Notify parent; only emit a full date when all three are filled
  const notify = (m, d, y) => {
    if (m && d && y.length === 4) {
      onChange({ target: { value: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` } });
    } else {
      onChange({ target: { value: '' } });
    }
  };

  const handleMonth = (e) => {
    const v = e.target.value.replace(/\D/g,'').slice(0, 2);
    setMm(v);
    notify(v, dd, yyyy);
    if (v.length === 2) dayRef.current?.focus();
  };
  const handleDay = (e) => {
    const v = e.target.value.replace(/\D/g,'').slice(0, 2);
    setDd(v);
    notify(mm, v, yyyy);
    if (v.length === 2) yearRef.current?.focus();
  };
  const handleYear = (e) => {
    const v = e.target.value.replace(/\D/g,'').slice(0, 4);
    setYyyy(v);
    notify(mm, dd, v);
  };

  const boxStyle = {
    width: '100%', padding: '14px 8px', border: '2px solid #E0E0E0', borderRadius: 10,
    fontSize: 15, fontFamily: 'inherit', outline: 'none', textAlign: 'center',
    boxSizing: 'border-box', color: '#1a1a1a', background: 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s', cursor: 'text',
  };
  const onFocus = (e) => { e.target.style.borderColor = '#0D2B6B'; e.target.style.boxShadow = '0 0 0 3px rgba(13,43,107,0.15)'; };
  const onBlur  = (e) => { e.target.style.borderColor = e.target.value ? '#0D2B6B' : '#E0E0E0'; e.target.style.boxShadow = 'none'; };

  return (
    <Field label="Date of Birth" required={required}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            ref={monthRef} type="text" inputMode="numeric" placeholder="MM"
            value={mm} onChange={handleMonth} onFocus={onFocus} onBlur={onBlur}
            style={boxStyle}
          />
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginTop: 4 }}>Month</span>
        </div>
        <span style={{ color: '#CCC', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>/</span>
        <div style={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            ref={dayRef} type="text" inputMode="numeric" placeholder="DD"
            value={dd} onChange={handleDay} onFocus={onFocus} onBlur={onBlur}
            style={boxStyle}
          />
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginTop: 4 }}>Day</span>
        </div>
        <span style={{ color: '#CCC', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>/</span>
        <div style={{ flex: '0 0 110px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            ref={yearRef} type="text" inputMode="numeric" placeholder="YYYY"
            value={yyyy} onChange={handleYear} onFocus={onFocus} onBlur={onBlur}
            style={boxStyle}
          />
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginTop: 4 }}>Year</span>
        </div>
      </div>
    </Field>
  );
}

/* ── Section card ── */
function SectionCard({ icon, title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ width: 4, height: 24, background: '#0D2B6B', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a' }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

/* ── Main component ── */
export default function CarRentalCustomerDetails() {
  const { carId }  = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();
  const state      = location.state;
  const dlPhotoRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const LS_KEY = 'carRentalFormData';

  const [form, setForm] = useState(() => {
    const defaults = {
      customerFullName: user?.name || '',
      customerDob: '',
      customerAddress: '',
      customerPhone: '',
      customerEmail: user?.email || '',
      dlNumber: '',
      dlState: '',
      dlExpiration: '',
      insuranceCompany: '',
      insurancePolicyNumber: '',
      insurancePolicyExpiration: '',
      insuranceLiabilityLimits: '',
      insuranceCoversRental: '',
    };
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });
  const [dlPhotoFile,    setDlPhotoFile]    = useState(null);
  const [dlPhotoPreview, setDlPhotoPreview] = useState(null);
  const [error,          setError]          = useState('');
  const [dobError,       setDobError]       = useState('');
  const [carInfo,        setCarInfo]        = useState(state?.car || null);

  useEffect(() => {
    if (!carId) return;
    api.get(`/api/cars/${carId}`)
      .then(r => setCarInfo(r.data))
      .catch(() => {});
  }, [carId]);

  // Save form to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(form)); } catch {}
  }, [form]);

  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 24)).toISOString().split('T')[0];

  const handleDobChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, customerDob: val }));
    if (val) {
      const now = new Date();
      const dob = new Date(val);
      let age = now.getFullYear() - dob.getFullYear();
      const md = now.getMonth() - dob.getMonth();
      if (md < 0 || (md === 0 && now.getDate() < dob.getDate())) age--;
      setDobError(age < 24 ? 'You must be at least 24 years old to rent a car.' : '');
    } else {
      setDobError('');
    }
  };

  useEffect(() => {
    if (!state?.car) navigate('/', { replace: true });
  }, []);

  if (!state?.car) return null;

  const { car, pickupDate, pickupTime, returnDate, returnTime, totalDays, rentalCost, depositAmount, totalAmount } = state;

  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleDlPhoto = (file) => {
    if (!file) return;
    setDlPhotoFile(file);
    setDlPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (form.customerDob) {
      const dob = new Date(form.customerDob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 24) {
        setError('You are not eligible to rent a car. Minimum age is 24 years.');
        return;
      }
    }

    if (dobError) return;

    setPendingDlPhoto(dlPhotoFile || null);
    navigate(`/car-rental/book/${carId}/payment`, {
      state: { ...state, ...form },
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,60,0.70)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: '80px 20px 60px' }}>

        {/* Breadcrumb */}
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16, marginTop: 8 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>Home</Link>
          {' › '}Rent a Car
          {' › '}<span style={{ fontWeight: 600, color: 'white' }}>Your Details</span>
        </p>

        <CarStepBar currentStep={2} />
        <CarHeroCard car={carInfo} />

        {/* Booking summary card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px 22px', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🚗</span>
              <span style={{ fontWeight: 800, color: '#0D2B6B', fontSize: 15 }}>{car.year} {car.make} {car.model}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', flexWrap: 'wrap' }}>
              <span style={{ background: '#F5F5F5', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                📅 {fmtDate(pickupDate)} · {fmtTime(pickupTime)}
              </span>
              <span style={{ color: '#F57C00', fontWeight: 800 }}>→</span>
              <span style={{ background: '#F5F5F5', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                🏁 {fmtDate(returnDate)} · {fmtTime(returnTime)}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#0D2B6B', fontSize: 16 }}>${Number(totalAmount).toFixed(2)} total</div>
              <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{totalDays} day{totalDays !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2', color: '#C62828', fontSize: 14, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── Section 1: Personal Information ── */}
          <SectionCard icon="👤" title="Personal Information">
            <Input label="Full Name" value={form.customerFullName} onChange={set('customerFullName')} required placeholder="John Doe" />
            <Input label="Date of Birth" value={form.customerDob} onChange={handleDobChange} type="date" required max={maxDob} error={dobError} />
            <Input label="Phone Number" value={form.customerPhone} onChange={set('customerPhone')} required placeholder="+1 555-123-4567" />
            <Input label="Email Address" value={form.customerEmail} onChange={set('customerEmail')} type="email" required placeholder="john@example.com" />
            <Input label="Home Address" value={form.customerAddress} onChange={set('customerAddress')} required placeholder="123 Main St, City, State 12345" />
          </SectionCard>

          {/* ── Section 2: Driver's License ── */}
          <SectionCard icon="🪪" title="Driver's License">
            <Input label="License Number" value={form.dlNumber} onChange={set('dlNumber')} required placeholder="D1234567" />
            <Select label="Issuing State" value={form.dlState} onChange={set('dlState')} required>
              <option value="">— Select —</option>
              {STATES_US.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Expiration Date" value={form.dlExpiration} onChange={set('dlExpiration')} type="date" required />

            {/* DL Photo */}
            <Field label="Driver License Photo" required>
              <input
                ref={dlPhotoRef}
                type="file"
                accept="image/*"
                onChange={e => handleDlPhoto(e.target.files[0])}
                required={!dlPhotoFile}
                style={{ display: 'none' }}
              />
              {dlPhotoPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#E8F5E9', borderRadius: 12, border: '1.5px solid #A5D6A7' }}>
                  <img src={dlPhotoPreview} alt="DL" style={{ height: 64, width: 100, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#2E7D32', marginBottom: 4 }}>✓ Photo uploaded</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{dlPhotoFile?.name}</div>
                  </div>
                  <button type="button" onClick={() => dlPhotoRef.current.click()} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #2E7D32', color: '#2E7D32', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => dlPhotoRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleDlPhoto(f); }}
                  style={{
                    border: `2px dashed ${dragOver ? '#0D2B6B' : '#BBDEFB'}`,
                    borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                    background: dragOver ? '#E3F2FD' : '#FAFCFF',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                  <div style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 4 }}>Upload or drag & drop your license photo</div>
                  <div style={{ fontSize: 13, color: '#888' }}>Clear photo of the front of your driver's license</div>
                  <div style={{ marginTop: 12, display: 'inline-block', padding: '8px 22px', background: '#E3F2FD', color: '#0D2B6B', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                    Choose Photo
                  </div>
                </div>
              )}
            </Field>
          </SectionCard>

          {/* ── Section 3: Insurance Information ── */}
          <SectionCard icon="🛡️" title="Insurance Information">
            <Input label="Insurance Company" value={form.insuranceCompany} onChange={set('insuranceCompany')} required placeholder="State Farm" />
            <Input label="Policy Number" value={form.insurancePolicyNumber} onChange={set('insurancePolicyNumber')} required placeholder="POL-123456" />
            <Input label="Policy Expiration Date" value={form.insurancePolicyExpiration} onChange={set('insurancePolicyExpiration')} type="date" required />
            <Input label="Liability Limits" value={form.insuranceLiabilityLimits} onChange={set('insuranceLiabilityLimits')} required placeholder="100/300/100" />
            <Select label="Does your insurance cover rental vehicles?" value={form.insuranceCoversRental} onChange={set('insuranceCoversRental')} required>
              <option value="">— Select —</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unknown">Unknown / Not sure</option>
            </Select>
          </SectionCard>

          {/* ── Cancellation Policy ── */}
          <div style={{ background: '#FFFDE7', border: '1.5px solid #FFE082', borderLeft: '5px solid #F57C00', borderRadius: 16, padding: '20px 24px', marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div style={{ fontWeight: 800, color: '#E65100', fontSize: 16 }}>Cancellation Policy</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '✅', color: '#2E7D32', bg: '#E8F5E9', text: <span>Cancel <strong>more than 24 hours</strong> before pickup — full refund</span> },
                { icon: '❌', color: '#C62828', bg: '#FFEBEE', text: <span>Cancel <strong>less than 24 hours</strong> before pickup — no refund</span> },
                { icon: '❌', color: '#C62828', bg: '#FFEBEE', text: <span><strong>No show</strong> — no refund</span> },
                { icon: '⚠️', color: '#E65100', bg: '#FFF3E0', text: <span>Booking <strong>cannot be modified</strong> after payment</span> },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: item.bg, borderRadius: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: item.color, fontWeight: 500 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 13, color: '#8D6E63', fontStyle: 'italic' }}>
              By submitting, you agree to the cancellation policy and rental terms above.
            </p>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="submit"
              style={{
                width: '100%', padding: '16px 24px',
                background: '#F57C00',
                color: '#0D2B6B',
                border: 'none', borderRadius: 12,
                fontSize: 17, fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 6px 20px rgba(245,124,0,0.4)',
                transition: 'all 0.2s',
              }}
            >
              Continue to Payment →
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                width: '100%', padding: '14px 24px',
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.5)',
                color: 'white', borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                backdropFilter: 'blur(10px)',
              }}
            >
              ← Back
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
