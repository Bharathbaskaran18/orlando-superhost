import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!userId) navigate('/register');
    else inputRefs.current[0]?.focus();
  }, [userId, navigate]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError('');
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, idx) => { next[idx] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/verify-otp', { userId, otp });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/api/auth/resend-otp', { userId });
      setSuccess('A new code has been sent to your email.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100vh',
      overflow: 'hidden',
      backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: '48px 40px',
          width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📧</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B', margin: '0 0 8px' }}>Verify Your Email</h1>
            <p style={{ color: '#6b6b6b', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              We sent a 6-digit code to<br />
              <strong style={{ color: '#1a1a1a' }}>{email || 'your email'}</strong>
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fce8e6', color: '#cc0000', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#e8f5e9', color: '#2e7d32', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  style={{
                    width: 52, height: 60,
                    textAlign: 'center',
                    fontSize: 28, fontWeight: 800,
                    border: `2px solid ${d ? '#0D2B6B' : '#d0d0d0'}`,
                    borderRadius: 10,
                    outline: 'none',
                    color: '#0D2B6B',
                    background: d ? '#F0F7FF' : '#fafafa',
                    transition: 'border-color 0.15s, background 0.15s',
                    fontFamily: 'monospace',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0D2B6B'; e.target.style.boxShadow = '0 0 0 3px rgba(13,43,107,0.12)'; }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !!success}
              style={{ marginBottom: 16 }}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#6b6b6b', fontSize: 13, marginBottom: 8 }}>Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resending || !!success}
              style={{
                background: 'none', border: 'none',
                color: '#0D2B6B', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', textDecoration: 'underline',
                opacity: resending || success ? 0.5 : 1,
              }}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#aaa' }}>
            Code expires in 10 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
