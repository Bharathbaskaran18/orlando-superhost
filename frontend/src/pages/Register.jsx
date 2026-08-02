import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';

// ── Validators ───────────────────────────────────────────────────────────────

function nameErr(v) {
  if (!v?.trim()) return 'This field is required';
  if (!/^[a-zA-Z\s'\-]+$/.test(v.trim())) return 'Name can only contain letters';
  return '';
}

function dobErr(m, d, y) {
  if (!m || !d || !y) return 'Date of birth is required';
  const yr = parseInt(y, 10);
  const mo = parseInt(m, 10);
  const dy = parseInt(d, 10);
  if (!yr || yr < 1900 || yr > new Date().getFullYear()) return 'Please enter a valid year';
  if (mo < 1 || mo > 12) return 'Please enter a valid month (1–12)';
  if (dy < 1 || dy > 31) return 'Please enter a valid day (1–31)';
  const date = new Date(yr, mo - 1, dy);
  if (date.getMonth() !== mo - 1) return 'Please enter a valid date';
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  if (date > cutoff) return 'You must be at least 18 years old to create an account';
  return '';
}

function emailErr(v) {
  if (!v?.trim()) return 'Email is required';
  if (/\s/.test(v)) return 'Please enter a valid email address';
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v)) return 'Please enter a valid email address';
  return '';
}

function pwdErr(v) {
  if (!v) return 'Password is required';
  if (
    v.length < 8 ||
    !/[A-Z]/.test(v) ||
    !/[a-z]/.test(v) ||
    !/[0-9]/.test(v) ||
    !/[!@#$%^&*]/.test(v)
  ) return 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
  return '';
}

function confirmErr(v, pwd) {
  if (!v) return 'Please confirm your password';
  if (v !== pwd) return 'Passwords do not match';
  return '';
}

function pwdStrength(v) {
  if (!v) return { label: '', color: '#e0e0e0', pct: 0 };
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[a-z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[!@#$%^&*]/.test(v)) s++;
  if (s <= 2) return { label: 'Weak',   color: '#ef4444', pct: (s / 5) * 100 };
  if (s <= 4) return { label: 'Medium', color: '#F57C00', pct: (s / 5) * 100 };
  return             { label: 'Strong', color: '#22c55e', pct: 100 };
}

// ── Field wrapper helpers ────────────────────────────────────────────────────

function borderColor(focused, touched, error, hasValue) {
  if (focused) return '#0D2B6B';
  if (!touched) return '#d0d0d0';
  if (error) return '#ef4444';
  if (hasValue) return '#22c55e';
  return '#d0d0d0';
}

function boxShadow(focused) {
  return focused ? '0 0 0 3px rgba(13,43,107,0.12)' : 'none';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    dobM: '', dobD: '', dobY: '',
    email: '', pwd: '', confirm: '',
  });
  const [touched, setTouched]   = useState({});
  const [focused, setFocused]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [loading, setLoading]   = useState(false);

  // Computed errors (only exposed after touch)
  const errs = {
    firstName: touched.firstName ? nameErr(form.firstName)                         : '',
    lastName:  touched.lastName  ? nameErr(form.lastName)                          : '',
    dob:       (touched.dobM || touched.dobD || touched.dobY)
                 ? dobErr(form.dobM, form.dobD, form.dobY)                         : '',
    email:     touched.email    ? emailErr(form.email)                             : '',
    pwd:       touched.pwd      ? pwdErr(form.pwd)                                 : '',
    confirm:   touched.confirm  ? confirmErr(form.confirm, form.pwd)               : '',
  };

  const strength = pwdStrength(form.pwd);

  const touch = (...fields) =>
    setTouched(p => { const n = { ...p }; fields.forEach(f => { n[f] = true; }); return n; });

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    touch(field);
  };

  // DOB all-share the same error/valid state
  const dobTouched = touched.dobM || touched.dobD || touched.dobY;
  const dobComplete = form.dobM && form.dobD && form.dobY.length === 4;
  const dobBorder = (sub) => {
    if (focused === sub) return '#0D2B6B';
    if (!dobTouched) return '#d0d0d0';
    if (errs.dob) return '#ef4444';
    if (dobComplete) return '#22c55e';
    return '#d0d0d0';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr('');
    touch('firstName', 'lastName', 'dobM', 'dobD', 'dobY', 'email', 'pwd', 'confirm');

    const allErr = {
      firstName: nameErr(form.firstName),
      lastName:  nameErr(form.lastName),
      dob:       dobErr(form.dobM, form.dobD, form.dobY),
      email:     emailErr(form.email),
      pwd:       pwdErr(form.pwd),
      confirm:   confirmErr(form.confirm, form.pwd),
    };
    if (Object.values(allErr).some(Boolean)) return;

    setLoading(true);
    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
      await api.post('/api/auth/register', { name, email: form.email, password: form.pwd });
      navigate('/login', { state: { successMsg: 'Account created successfully! Please login.' } });
    } catch (err) {
      setSubmitErr(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Shared input style builder
  const inp = (field, hasVal, extra = {}) => ({
    width: '100%',
    padding: '11px 14px',
    border: `1.5px solid ${borderColor(focused === field, touched[field], errs[field], hasVal)}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: boxShadow(focused === field),
    transition: 'border-color 0.15s, box-shadow 0.15s',
    background: 'white',
    ...extra,
  });

  // Label style
  const lbl = { display: 'block', fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 6 };

  // Error message
  const ErrMsg = ({ field }) =>
    errs[field] ? <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errs[field]}</p> : null;

  // Checkmark overlay (for non-password fields)
  const Check = ({ field, hasVal }) =>
    touched[field] && !errs[field] && hasVal
      ? <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: 17, lineHeight: 1, pointerEvents: 'none' }}>✓</span>
      : null;

  const maxYear = new Date().getFullYear() - 18;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '80px 20px 48px',
      position: 'relative',
    }}>
      {/* Fixed background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        zIndex: -2,
      }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: -1 }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 20,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
        animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo scale={0.85} variant="light" />
          </div>
          <h1 className="form-title">Create Account</h1>
          <p style={{ color: '#6b6b6b', fontSize: 14 }}>Start planning your next adventure</p>
        </div>

        {submitErr && <div className="form-error">{submitErr}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── First + Last Name (side by side) ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>First Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="John"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  onFocus={() => setFocused('firstName')}
                  onBlur={() => { setFocused(''); touch('firstName'); }}
                  style={inp('firstName', !!form.firstName, { paddingRight: 34 })}
                />
                <Check field="firstName" hasVal={!!form.firstName} />
              </div>
              <ErrMsg field="firstName" />
            </div>

            <div style={{ flex: 1 }}>
              <label style={lbl}>Last Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  onFocus={() => setFocused('lastName')}
                  onBlur={() => { setFocused(''); touch('lastName'); }}
                  style={inp('lastName', !!form.lastName, { paddingRight: 34 })}
                />
                <Check field="lastName" hasVal={!!form.lastName} />
              </div>
              <ErrMsg field="lastName" />
            </div>
          </div>

          {/* ── Date of Birth ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Date of Birth</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  placeholder="MM"
                  min="1" max="12"
                  value={form.dobM}
                  onChange={e => set('dobM', e.target.value)}
                  onFocus={() => setFocused('dobM')}
                  onBlur={() => { setFocused(''); touch('dobM'); }}
                  style={{
                    ...inp('dobM', false),
                    border: `1.5px solid ${dobBorder('dobM')}`,
                    boxShadow: boxShadow(focused === 'dobM'),
                    textAlign: 'center',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  placeholder="DD"
                  min="1" max="31"
                  value={form.dobD}
                  onChange={e => set('dobD', e.target.value)}
                  onFocus={() => setFocused('dobD')}
                  onBlur={() => { setFocused(''); touch('dobD'); }}
                  style={{
                    ...inp('dobD', false),
                    border: `1.5px solid ${dobBorder('dobD')}`,
                    boxShadow: boxShadow(focused === 'dobD'),
                    textAlign: 'center',
                  }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <input
                  type="number"
                  placeholder="YYYY"
                  min="1900" max={maxYear}
                  value={form.dobY}
                  onChange={e => set('dobY', e.target.value)}
                  onFocus={() => setFocused('dobY')}
                  onBlur={() => { setFocused(''); touch('dobY'); }}
                  style={{
                    ...inp('dobY', false),
                    border: `1.5px solid ${dobBorder('dobY')}`,
                    boxShadow: boxShadow(focused === 'dobY'),
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
            {dobTouched && errs.dob && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errs.dob}</p>
            )}
            {dobTouched && !errs.dob && dobComplete && (
              <p style={{ color: '#22c55e', fontSize: 12, margin: '4px 0 0' }}>✓ Age verified</p>
            )}
          </div>

          {/* ── Email ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => { setFocused(''); touch('email'); }}
                style={inp('email', !!form.email, { paddingRight: 34 })}
              />
              <Check field="email" hasVal={!!form.email} />
            </div>
            <ErrMsg field="email" />
          </div>

          {/* ── Password ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={form.pwd}
                onChange={e => {
                  set('pwd', e.target.value);
                  if (touched.confirm) touch('confirm');
                }}
                onFocus={() => setFocused('pwd')}
                onBlur={() => { setFocused(''); touch('pwd'); }}
                style={inp('pwd', !!form.pwd, { paddingRight: 58 })}
              />
              {/* Checkmark to left of toggle */}
              {touched.pwd && !errs.pwd && form.pwd && (
                <span style={{ position: 'absolute', right: 46, top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: 17, lineHeight: 1, pointerEvents: 'none' }}>✓</span>
              )}
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, padding: 2, color: '#6b6b6b',
                }}
                title={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Strength bar */}
            {form.pwd && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${strength.pct}%`,
                    background: strength.color,
                    borderRadius: 2,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }} />
                </div>
                {strength.label && (
                  <p style={{ color: strength.color, fontSize: 11, fontWeight: 700, margin: '3px 0 0' }}>
                    {strength.label}
                  </p>
                )}
              </div>
            )}
            <ErrMsg field="pwd" />
          </div>

          {/* ── Confirm Password ── */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConf ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                onFocus={() => setFocused('confirm')}
                onBlur={() => { setFocused(''); touch('confirm'); }}
                style={inp('confirm', !!form.confirm, { paddingRight: 58 })}
              />
              {touched.confirm && !errs.confirm && form.confirm && (
                <span style={{ position: 'absolute', right: 46, top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: 17, lineHeight: 1, pointerEvents: 'none' }}>✓</span>
              )}
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, padding: 2, color: '#6b6b6b',
                }}
                title={showConf ? 'Hide password' : 'Show password'}
              >
                {showConf ? '🙈' : '👁️'}
              </button>
            </div>
            <ErrMsg field="confirm" />
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-full btn-lg"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <div className="form-footer">
          Already have an account? <Link to="/login">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
