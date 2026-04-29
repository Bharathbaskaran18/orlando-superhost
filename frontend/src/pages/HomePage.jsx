import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const BG_IMAGE = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=2000&q=80';

export default function HomePage() {
  const navigate = useNavigate();
  const [showSelector, setShowSelector] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const loadStates = async () => {
    setLoadingStates(true);
    try {
      const { data } = await api.get('/api/states');
      setStates(data);
    } catch {
      // no enabled states yet
    } finally {
      setLoadingStates(false);
    }
  };

  const handleStartPlanning = () => {
    setShowSelector(true);
    loadStates();
  };

  const handleStateChange = async (stateId) => {
    setSelectedState(stateId);
    setSelectedCity('');
    setCities([]);
    if (!stateId) return;
    setLoadingCities(true);
    try {
      const { data } = await api.get(`/api/states/${stateId}/cities`);
      setCities(data);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleGoToCity = () => {
    if (selectedCity) navigate(`/city/${selectedCity}`);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', position: 'relative' }}>
      {/* Hero background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        top: 60,
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1,
      }} />

      {/* Dark overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        top: 60,
        background: 'linear-gradient(to bottom, rgba(0,20,60,0.7) 0%, rgba(0,10,40,0.85) 100%)',
        zIndex: -1,
      }} />

      {/* Hero content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        {!showSelector ? (
          <>
            <div style={{
              background: 'rgba(245,166,35,0.2)',
              border: '1px solid rgba(245,166,35,0.5)',
              color: '#f5a623',
              padding: '6px 20px',
              borderRadius: 30,
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              ✈️ Your American Adventure Awaits
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.1,
              marginBottom: 20,
              maxWidth: 700,
            }}>
              Explore Every Corner<br />
              <span style={{ color: '#f5a623' }}>of the USA</span>
            </h1>

            <p style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: 40,
              maxWidth: 500,
              lineHeight: 1.7,
            }}>
              Book cars, vacation homes, and local travel agents across all 50 states.
              Your perfect trip is just a few clicks away.
            </p>

            <button
              onClick={handleStartPlanning}
              style={{
                background: 'linear-gradient(135deg, #f5a623, #e8940f)',
                color: 'white',
                border: 'none',
                padding: '18px 40px',
                borderRadius: 50,
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(245,166,35,0.5)',
                transition: 'all 0.3s',
                letterSpacing: 0.5,
              }}
              onMouseEnter={e => e.target.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
            >
              Start Planning Your Trip →
            </button>

            {/* Feature badges */}
            <div style={{
              display: 'flex',
              gap: 16,
              marginTop: 60,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {[
                { icon: '🚗', label: 'Rent Cars' },
                { icon: '🏠', label: 'Book Houses' },
                { icon: '🧭', label: 'Hire Agents' },
                { icon: '🗺️', label: 'All 50 States' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  padding: '14px 22px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 600,
                }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* State/City selector */
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: '40px',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#003580', marginBottom: 6 }}>
              Where to?
            </h2>
            <p style={{ color: '#6b6b6b', marginBottom: 28, fontSize: 14 }}>
              Select a state and city to explore
            </p>

            <div className="form-group">
              <label>Select State</label>
              <select
                value={selectedState}
                onChange={e => handleStateChange(e.target.value)}
                disabled={loadingStates}
              >
                <option value="">
                  {loadingStates ? 'Loading states...' : '— Choose a state —'}
                </option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {states.length === 0 && !loadingStates && (
                <p style={{ color: '#cc0000', fontSize: 12, marginTop: 6 }}>
                  No states available yet. Ask the admin to enable some!
                </p>
              )}
            </div>

            {selectedState && (
              <div className="form-group">
                <label>Select City</label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  disabled={loadingCities}
                >
                  <option value="">
                    {loadingCities ? 'Loading cities...' : '— Choose a city —'}
                  </option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {cities.length === 0 && !loadingCities && (
                  <p style={{ color: '#cc0000', fontSize: 12, marginTop: 6 }}>
                    No cities enabled in this state yet.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSelector(false)}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-accent btn-lg"
                onClick={handleGoToCity}
                disabled={!selectedCity}
                style={{ flex: 2 }}
              >
                Explore City →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
