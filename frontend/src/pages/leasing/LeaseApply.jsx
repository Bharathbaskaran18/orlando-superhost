import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function LeaseApply() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    currentAddress: '',
    reasonForMoving: '',
    monthlyIncome: '',
    numOccupants: '',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/api/leasing/properties/${propertyId}`)
      .then(r => setProperty(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/leasing/applications', { ...form, propertyId });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!property) return null;

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'relative',
      }}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 40,
          textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0D2B6B', marginBottom: 12 }}>
            Application Submitted!
          </h2>
          <p style={{ color: '#6b6b6b', marginBottom: 8 }}>
            Your screening application for <strong>{property.title}</strong> has been submitted.
          </p>
          <p style={{ color: '#6b6b6b', marginBottom: 28 }}>
            The admin will review it and you'll be notified of the outcome.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/leasing/my-applications')}
            >
              View My Applications
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Go Home
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/">Home</Link> › <Link to={`/city/${property.city_id}/leasing`}>Lease Properties</Link> › Apply
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B' }}>Step 1: Quick Screening</h1>
        <p style={{ color: '#6b6b6b' }}>Tell us a bit about yourself so we can review your application.</p>
      </div>

      {/* Property summary */}
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 16, marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', gap: 16, alignItems: 'center',
      }}>
        {property.photos?.[0] ? (
          <img
            src={`${API_URL}/uploads/${property.photos[0]}`}
            alt={property.title}
            style={{ width: 100, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{
            width: 100, height: 72, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1a237e, #3949ab)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>🏡</div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0D2B6B' }}>{property.title}</div>
          <div style={{ fontSize: 13, color: '#6b6b6b' }}>📍 {property.address}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D2B6B', marginTop: 4 }}>
            ${Number(property.price_per_month).toLocaleString()}/month · {property.num_bedrooms} bed · {property.num_bathrooms} bath
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.fullName} onChange={set('fullName')} placeholder="John Smith" required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" required />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" required />
            </div>
            <div className="form-group">
              <label>Monthly Income ($) *</label>
              <input type="number" min="0" step="100" value={form.monthlyIncome} onChange={set('monthlyIncome')} placeholder="5000" required />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Current Address *</label>
              <input value={form.currentAddress} onChange={set('currentAddress')} placeholder="123 Main St, City, State ZIP" required />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Reason for Moving *</label>
              <textarea
                value={form.reasonForMoving}
                onChange={set('reasonForMoving')}
                placeholder="Please describe why you're looking to move..."
                rows={3}
                required
              />
            </div>
            <div className="form-group">
              <label>Number of Occupants *</label>
              <input type="number" min="1" max="20" value={form.numOccupants} onChange={set('numOccupants')} placeholder="2" required />
            </div>
          </div>

          <div style={{ marginTop: 8, padding: '12px 14px', background: '#f8faff', borderRadius: 8, fontSize: 13, color: '#6b6b6b' }}>
            After submitting, the admin will review your screening application. If approved, you'll be asked to complete a full application.
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button
              type="submit"
              className="btn"
              style={{ background: '#1a237e', color: 'white' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Screening Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
      </div>
    </div>
  );
}
