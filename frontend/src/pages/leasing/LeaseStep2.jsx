import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function LeaseStep2() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [incomeProof, setIncomeProof] = useState(null);
  const [rentalHistory, setRentalHistory] = useState(null);
  const [form, setForm] = useState({
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/api/leasing/my-applications/${id}`)
      .then(r => {
        if (r.data.status !== 'step1_approved') {
          navigate(`/leasing/application/${id}`);
          return;
        }
        setApplication(r.data);
      })
      .catch(() => navigate('/leasing/my-applications'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (idPhoto) fd.append('idPhoto', idPhoto);
      if (incomeProof) fd.append('incomeProof', incomeProof);
      if (rentalHistory) fd.append('rentalHistory', rentalHistory);
      await api.post(`/api/leasing/applications/${id}/step2`, fd);
      navigate(`/leasing/application/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!application) return null;

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
    <div className="container" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/leasing/my-applications">My Applications</Link> ›{' '}
          <Link to={`/leasing/application/${id}`}>Application #{id}</Link> › Step 2
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B' }}>Step 2: Full Application</h1>
        <p style={{ color: '#6b6b6b' }}>Your screening was approved. Please complete the full application.</p>
      </div>

      {/* Property summary */}
      <div style={{
        background: '#e6f4ea', borderRadius: 12, padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, color: '#1e7e34', fontSize: 14 }}>Screening Approved</div>
          <div style={{ fontSize: 13, color: '#1a1a1a' }}>{application.property_title} · {application.city_name}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>

          {/* Document uploads */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D2B6B', marginBottom: 16 }}>Document Uploads</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div className="form-group">
              <label>ID Photo * <span style={{ fontSize: 11, color: '#6b6b6b', fontWeight: 400 }}>(driver's license, passport, etc.)</span></label>
              <input
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={e => setIdPhoto(e.target.files[0])}
              />
              {idPhoto && <span style={{ fontSize: 11, color: '#1e7e34' }}>✓ {idPhoto.name}</span>}
            </div>
            <div className="form-group">
              <label>Income Proof * <span style={{ fontSize: 11, color: '#6b6b6b', fontWeight: 400 }}>(pay stub, bank statement)</span></label>
              <input
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={e => setIncomeProof(e.target.files[0])}
              />
              {incomeProof && <span style={{ fontSize: 11, color: '#1e7e34' }}>✓ {incomeProof.name}</span>}
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Rental History <span style={{ fontSize: 11, color: '#6b6b6b', fontWeight: 400 }}>(optional — previous landlord reference)</span></label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setRentalHistory(e.target.files[0])}
              />
              {rentalHistory && <span style={{ fontSize: 11, color: '#1e7e34' }}>✓ {rentalHistory.name}</span>}
            </div>
          </div>

          {/* Emergency contact */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D2B6B', marginBottom: 16 }}>Emergency Contact</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Contact Name *</label>
              <input value={form.emergencyContactName} onChange={set('emergencyContactName')} placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label>Contact Phone *</label>
              <input value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="(555) 987-6543" required />
            </div>
            <div className="form-group">
              <label>Relationship *</label>
              <input value={form.emergencyContactRelation} onChange={set('emergencyContactRelation')} placeholder="Parent, Sibling, Spouse..." required />
            </div>
          </div>

          <div style={{ marginTop: 8, padding: '12px 14px', background: '#f8faff', borderRadius: 8, fontSize: 13, color: '#6b6b6b' }}>
            After submitting, the admin will review your full application. If approved, you can book a property visit.
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/leasing/application/${id}`)}>Cancel</button>
            <button
              type="submit"
              className="btn"
              style={{ background: '#1a237e', color: 'white' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Full Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
      </div>
    </div>
  );
}
