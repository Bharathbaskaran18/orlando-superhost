import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
];

export default function CityPage() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [city, setCity] = useState(null);
  const [attractions, setAttractions] = useState([]);
  const [images, setImages] = useState(FALLBACK_IMAGES);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cityRes, attRes] = await Promise.all([
          api.get(`/api/cities/${cityId}`),
          api.get(`/api/cities/${cityId}/attractions`),
        ]);
        setCity(cityRes.data);
        setAttractions(attRes.data);

        if (UNSPLASH_KEY) {
          try {
            const query = encodeURIComponent(`${cityRes.data.name} ${cityRes.data.state_name} travel tourism`);
            const res = await fetch(
              `https://api.unsplash.com/search/photos?query=${query}&per_page=6&client_id=${UNSPLASH_KEY}`
            );
            const data = await res.json();
            if (data.results?.length > 0) {
              setImages(data.results.map(r => r.urls.regular));
            }
          } catch { /* use fallback */ }
        }
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cityId]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setActiveImg(i => (i + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images]);

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Loading destination...</span>
    </div>
  );

  if (!city) return null;

  return (
    <div>
      {/* Hero image carousel */}
      <div style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
        <img
          src={images[activeImg]}
          alt={city.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.5s' }}
          onError={e => { e.target.src = FALLBACK_IMAGES[0]; }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)',
        }} />

        {/* City name overlay */}
        <div style={{ position: 'absolute', bottom: 32, left: 32 }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)' }}>Home</Link>
            {' › '} {city.state_name} {' › '} {city.name}
          </p>
          <h1 style={{ color: 'white', fontSize: 48, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {city.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
            {city.state_name}
          </p>
        </div>

        {/* Thumbnail dots */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 6 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              style={{
                width: i === activeImg ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === activeImg ? 'white' : 'rgba(255,255,255,0.5)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container">
        {/* Image strip */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={() => setActiveImg(i)}
                style={{
                  width: 100, height: 70, objectFit: 'cover', borderRadius: 8,
                  cursor: 'pointer', flexShrink: 0,
                  border: i === activeImg ? '3px solid #0071c2' : '3px solid transparent',
                  opacity: i === activeImg ? 1 : 0.7,
                  transition: 'all 0.2s',
                }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ))}
          </div>
        )}

        {/* Attractions */}
        {attractions.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#003580', marginBottom: 16 }}>
              🏛️ Famous Attractions
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14,
            }}>
              {attractions.map(a => (
                <div key={a.id} style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderLeft: '4px solid #0071c2',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#003580', marginBottom: 4 }}>
                    {a.name}
                  </div>
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.5 }}>
                      {a.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking options */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#003580', marginBottom: 20 }}>
          What would you like to book?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
          marginBottom: 40,
        }}>
          {/* Car */}
          <div style={{
            background: 'white', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer',
          }}
            onClick={() => navigate(`/city/${cityId}/cars`)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              height: 140,
              background: 'linear-gradient(135deg, #003580, #0071c2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 70,
            }}>
              🚗
            </div>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#003580', marginBottom: 8 }}>
                Rent a Car
              </h3>
              <p style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Choose from a wide selection of cars. Pick your dates and find the perfect vehicle for your trip.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Enterprise-style', 'Instant booking', 'Flexible dates'].map(t => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
              <button className="btn btn-primary btn-full">Browse Cars →</button>
            </div>
          </div>

          {/* House */}
          <div style={{
            background: 'white', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer',
          }}
            onClick={() => navigate(`/city/${cityId}/houses`)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              height: 140,
              background: 'linear-gradient(135deg, #00695c, #26a69a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 70,
            }}>
              🏠
            </div>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#00695c', marginBottom: 8 }}>
                Book a House
              </h3>
              <p style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Find cozy homes and vacation rentals. Stay like a local with all the comforts of home.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Booking.com style', 'Verified homes', 'Best price'].map(t => (
                  <span key={t} className="tag tag-green">{t}</span>
                ))}
              </div>
              <button className="btn btn-success btn-full">Browse Houses →</button>
            </div>
          </div>

          {/* Agent */}
          <div style={{
            background: 'white', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer',
          }}
            onClick={() => navigate(`/city/${cityId}/agents`)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              height: 140,
              background: 'linear-gradient(135deg, #7b1fa2, #ab47bc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 70,
            }}>
              🧭
            </div>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#7b1fa2', marginBottom: 8 }}>
                Book an Agent
              </h3>
              <p style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Hire a local travel expert. They know every hidden gem in the city and will plan your perfect day.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Local expert', 'Personalized tour', 'Hourly rate'].map(t => (
                  <span key={t} style={{ background: '#f3e5f5', color: '#7b1fa2' }} className="tag">{t}</span>
                ))}
              </div>
              <button className="btn btn-full" style={{ background: '#7b1fa2', color: 'white' }}>
                Browse Agents →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
