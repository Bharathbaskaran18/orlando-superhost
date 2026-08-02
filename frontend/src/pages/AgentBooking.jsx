import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../utils/api';
import PhotoLightbox from '../components/PhotoLightbox';

const PILL_COLORS = [
  { bg: '#E3F2FD', text: '#1565C0' },
  { bg: '#E3F2FD', text: '#0D2B6B' },
  { bg: '#E8F5E9', text: '#2E7D32' },
  { bg: '#FFF3E0', text: '#E65100' },
  { bg: '#FCE4EC', text: '#880E4F' },
  { bg: '#E0F7FA', text: '#00695C' },
];

function LangBadge({ lang, index }) {
  const c = PILL_COLORS[index % PILL_COLORS.length];
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 20, padding: '2px 8px',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{lang}</span>
  );
}

export default function AgentBooking() {
  const { cityId } = useParams();
  const navigate = useNavigate();

  const [city, setCity]           = useState(null);
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterLanguage, setFilterLanguage] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    api.get(`/api/cities/${cityId}`)
      .then(r => setCity(r.data))
      .catch(() => navigate('/'));
  }, [cityId]);

  useEffect(() => {
    api.get(`/api/agents?cityId=${cityId}`)
      .then(r => setAgents(r.data))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  const allLanguages = [...new Set(agents.flatMap(a => Array.isArray(a.languages) ? a.languages : []))].sort();
  const filteredAgents = filterLanguage
    ? agents.filter(a => Array.isArray(a.languages) && a.languages.includes(filterLanguage))
    : agents;

  if (!city) return <div className="loading"><div className="spinner" /></div>;

  const photoUrl = (photo) => `${API_URL}/uploads/${photo}`;

  return (
    <>
    {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')",
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="container" style={{ paddingTop: 88, paddingBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 4 }}>
              <Link to="/" style={{ color: 'rgba(255,255,255,0.75)' }}>Home</Link> ›{' '}
              <Link to={`/city/${cityId}`} style={{ color: 'rgba(255,255,255,0.75)' }}>{city.name}</Link> › Local Agents
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 6 }}>
              🧭 Local Travel Agents in {city.name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
              Expert local guides for your perfect trip
            </p>
          </div>

          {/* Language Filter */}
          {allLanguages.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>🌐 Filter by language:</span>
              <select
                value={filterLanguage}
                onChange={e => setFilterLanguage(e.target.value)}
                style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', fontFamily: 'inherit', cursor: 'pointer', background: filterLanguage ? '#E3F2FD' : 'rgba(255,255,255,0.15)', color: filterLanguage ? '#4527A0' : 'white', fontWeight: filterLanguage ? 700 : 400 }}
              >
                <option value="">All Languages</option>
                {allLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {filterLanguage && (
                <button onClick={() => setFilterLanguage('')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', borderRadius: 6, padding: '4px 10px' }}>✕ Clear</button>
              )}
            </div>
          )}

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filteredAgents.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🧭</div>
              <h3 style={{ color: '#0D2B6B', marginBottom: 8 }}>
                {filterLanguage ? `No agents speak ${filterLanguage}` : 'No agents available'}
              </h3>
              <p style={{ color: '#666', marginBottom: 16 }}>
                {filterLanguage ? 'Try a different language filter.' : `We don't have agents in ${city.name} yet.`}
              </p>
              {filterLanguage && (
                <button onClick={() => setFilterLanguage('')} style={{ background: '#0D2B6B', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Show All Agents</button>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
                {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} available{filterLanguage ? ` speaking ${filterLanguage}` : ''}
              </div>
              <div className="grid">
                {filteredAgents.map(agent => (
                  <div key={agent.id} className="card">
                    {agent.photo ? (
                      <img
                        src={photoUrl(agent.photo)}
                        alt={agent.name}
                        className="card-img"
                        style={{ objectPosition: 'top', cursor: 'zoom-in' }}
                        onClick={() => setLightboxSrc(photoUrl(agent.photo))}
                        onError={e => e.target.style.display='none'}
                      />
                    ) : (
                      <div className="card-img-placeholder" style={{ background: 'linear-gradient(135deg, #0D2B6B, #1565C0)' }}>🧭</div>
                    )}
                    <div className="card-body">
                      <div className="card-title">{agent.name}</div>
                      <div style={{ fontSize: 13, color: '#0D2B6B', fontWeight: 600, marginBottom: 6 }}>
                        {agent.specialty}
                      </div>
                      {agent.meeting_location && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>📍 {agent.meeting_location}</div>
                      )}
                      {Array.isArray(agent.languages) && agent.languages.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                          {agent.languages.map((lang, i) => <LangBadge key={lang} lang={lang} index={i} />)}
                        </div>
                      )}
                      {agent.bio && (
                        <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {agent.bio}
                        </p>
                      )}
                      <div className="card-price" style={{ color: '#0D2B6B' }}>
                        ${Number(agent.hourly_rate).toFixed(2)} <span>/ hour</span>
                      </div>
                      {agent.min_hours && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                          {agent.min_hours}–{agent.max_hours}h sessions
                        </div>
                      )}
                      <button
                        className="btn btn-full"
                        style={{ background: '#0D2B6B', color: 'white' }}
                        onClick={() => navigate(`/agent/book/${agent.id}`)}
                      >
                        Book Agent →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
