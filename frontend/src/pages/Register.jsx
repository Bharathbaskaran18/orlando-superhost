import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', {
        name: form.name, email: form.email, password: form.password,
      });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-wrap">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🗺️</div>
        <h1 className="form-title">Create Account</h1>
        <p style={{ color: '#6b6b6b', fontSize: 14 }}>Start planning your American adventure</p>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="John Smith" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="At least 6 characters" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" placeholder="Repeat your password" value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Creating account...' : 'Create Account →'}
        </button>
      </form>

      <div className="form-footer">
        Already have an account? <Link to="/login">Sign in →</Link>
      </div>
    </div>
  );
}
