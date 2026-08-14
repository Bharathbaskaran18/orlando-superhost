import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import LoginPromptModal from '../../components/LoginPromptModal';

export default function LeaseProperties() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [city, setCity] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginPromptPath, setLoginPromptPath] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cityRes, propsRes] = await Promise.all([
          api.get(`/api/cities/${cityId}`),
          api.get(`/api/leasing/properties?cityId=${cityId}`),
        ]);
        setCity(cityRes.data);
        setProperties(propsRes.data);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cityId]);

  const handleApply = (propertyId) => {
    if (!user) { setLoginPromptPath(`/leasing/apply/${propertyId}`); return; }
    navigate(`/leasing/apply/${propertyId}`);
  };

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading properties...</span></div>;
  if (!city) return null;

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
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.85)' }}>Home</Link>
          {' › '}<Link to={`/city/${cityId}`} style={{ color: 'rgba(255,255,255,0.85)' }}>{city.name}</Link>
          {' › '}Lease a Home
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          🏡 Lease a Home in {city.name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{city.state_name} · {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} available</p>
      </div>

      {properties.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏡</div>
          <h3>No lease properties available</h3>
          <p>Check back soon — the admin is adding properties to this city.</p>
        </div>
      ) : (
        <div className="grid">
          {properties.map(p => (
            <div key={p.id} className="card">
              {p.photos?.[0] ? (
                <img
                  src={`${API_URL}/uploads/${p.photos[0]}`}
                  alt={p.title}
                  className="card-img"
                  onError={e => e.target.style.display = 'none'}
                />
              ) : (
                <div className="card-img-placeholder" style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>🏡</div>
              )}
              <div className="card-body">
                <div className="card-title">{p.title}</div>
                <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 10 }}>
                  📍 {p.address}
                </div>
                <div className="card-tags">
                  <span className="tag">🛏 {p.num_bedrooms} bed{p.num_bedrooms !== 1 ? 's' : ''}</span>
                  <span className="tag">🚿 {p.num_bathrooms} bath{p.num_bathrooms !== 1 ? 's' : ''}</span>
                  <span className="tag">🏠 {p.num_rooms} rooms</span>
                </div>
                <div className="card-price">
                  ${Number(p.price_per_month).toLocaleString()} <span>/ month</span>
                </div>
                {p.lease_agreement_pdf && (
                  <div style={{ marginBottom: 12 }}>
                    <a
                      href={`${API_URL}/uploads/${p.lease_agreement_pdf}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: '#1E88E5', fontWeight: 600 }}
                    >
                      📄 View Lease Agreement
                    </a>
                  </div>
                )}
                <button
                  className="btn btn-full"
                  style={{ background: '#1a237e', color: 'white' }}
                  onClick={() => handleApply(p.id)}
                >
                  Request to Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link
            to="/leasing/my-applications"
            style={{ color: '#F57C00', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            View My Lease Applications →
          </Link>
        </div>
      )}
    </div>
      </div>
      <LoginPromptModal
        open={!!loginPromptPath}
        onClose={() => setLoginPromptPath(null)}
        redirectTo={loginPromptPath}
      />
    </div>
  );
}
