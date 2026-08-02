import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMsg = location.state?.successMsg || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.pendingVerification) {
        navigate(`/verify-otp?userId=${data.userId}&email=${encodeURIComponent(form.email)}`);
        return;
      }
      setError(data?.error || 'Login failed');
    } finally {
      setLoading(false);
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
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: 40,
          width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Logo scale={0.85} variant="light" />
            </div>
            <h1 className="form-title">Welcome Back</h1>
          </div>

          {successMsg && (
            <div style={{
              background: '#e8f5e9', color: '#2e7d32',
              border: '1px solid #a5d6a7',
              padding: '10px 14px', borderRadius: 8,
              fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {successMsg}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="form-footer">
            Don't have an account? <Link to="/register">Create one →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
