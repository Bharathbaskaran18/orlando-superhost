import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Logo from '../../components/Logo';

export default function AdminLogin() {
const navigate = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect AFTER render, not during — calling navigate() during render
  // causes a double-render loop in React 18 StrictMode
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      if (data.user.role !== 'admin') {
        setError('This account does not have admin access');
        setLoading(false);
        return;
      }
      login(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100vh',
      backgroundColor: '#1a2a4a',
      backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 1, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420 }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: '48px 40px',
          width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Logo scale={0.85} variant="light" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B' }}>Admin Portal</h1>
            <p style={{ color: '#6b6b6b', fontSize: 14 }}>Authorized Personnel Only</p>
          </div>

          {error && (
            <div style={{
              background: '#fce8e6', color: '#cc0000', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                placeholder="admin@orlandosuperhost.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Admin password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Signing in...' : 'Sign In to Admin'}
            </button>
          </form>

          <div style={{ marginTop: 20, fontSize: 12, color: '#6b6b6b', textAlign: 'center' }}>
            admin@orlandosuperhost.com / Admin@123
          </div>
        </div>
      </div>
    </div>
  );
}
