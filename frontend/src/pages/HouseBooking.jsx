import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SLIDE_CSS = `
  @keyframes slideshow-fadein { from{opacity:0} to{opacity:1} }
  .hs-arrow { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.45); border:none; color:white; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; transition:background 0.2s; z-index:2; }
  .hs-arrow:hover { background:rgba(0,0,0,0.68) !important; }
  .hs-dot { width:6px; height:6px; border-radius:50%; cursor:pointer; transition:all 0.2s; flex-shrink:0; }
`;

function HouseSlideshow({ photos, name }) {
  const [idx, setIdx]     = useState(0);
  const timerRef          = useRef(null);
  const hasMany           = photos.length > 1;

  const resetTimer = () => {
    clearInterval(timerRef.current);
    if (hasMany) timerRef.current = setInterval(() => setIdx(i => (i + 1) % photos.length), 3000);
  };

  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current); }, [photos.length]);

  const go = (e, newIdx) => { e.stopPropagation(); setIdx(newIdx); resetTimer(); };

  if (photos.length === 0) {
    return <div className="card-img-placeholder">🏠</div>;
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        key={idx}
        src={`${API_URL}/uploads/${photos[idx]}`}
        alt={name}
        className="card-img"
        style={{ animation: 'slideshow-fadein 0.4s ease', display: 'block' }}
      />
      {hasMany && (
        <>
          <button className="hs-arrow" onClick={e => go(e, (idx - 1 + photos.length) % photos.length)} style={{ left: 8 }}>‹</button>
          <button className="hs-arrow" onClick={e => go(e, (idx + 1) % photos.length)} style={{ right: 8 }}>›</button>
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 2 }}>
            {photos.map((_, i) => (
              <div
                key={i}
                className="hs-dot"
                onClick={e => go(e, i)}
                style={{ background: i === idx ? 'white' : 'rgba(255,255,255,0.45)', transform: i === idx ? 'scale(1.35)' : 'scale(1)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function HouseBooking() {
  const { cityId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [houses, setHouses]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity]       = useState(null);

  useEffect(() => {
    api.get(`/api/cities/${cityId}`).then(r => setCity(r.data)).catch(() => {});
    api.get(`/api/house-booking/houses/${cityId}`)
      .then(r => setHouses(r.data))
      .finally(() => setLoading(false));
  }, [cityId]);

  const handleBook = (houseId) => {
    if (!user) { navigate('/login'); return; }
    navigate(`/house/book/${houseId}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')",
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative',
    }}>
      <style>{SLIDE_CSS}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              <Link to="/" style={{ color: 'rgba(255,255,255,0.85)' }}>Home</Link> ›{' '}
              {city && <Link to={`/city/${cityId}`} style={{ color: 'rgba(255,255,255,0.85)' }}>{city.name}</Link>} › Houses
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 4 }}>🏠 Houses in {city?.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {loading ? 'Loading...' : `${houses.length} propert${houses.length !== 1 ? 'ies' : 'y'} available`}
            </p>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : houses.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
              <h3>No houses available</h3>
              <p>No properties are available in this city right now.</p>
            </div>
          ) : (
            <div className="grid">
              {houses.map(house => <HouseCard key={house.id} house={house} onBook={handleBook} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HouseCard({ house, onBook }) {
  const [hovered, setHovered] = useState(false);
  const photos = house.photos || [];

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transform: hovered ? 'translateY(-4px)' : 'none', transition: 'transform 0.22s, box-shadow 0.22s', boxShadow: hovered ? '0 12px 40px rgba(21,101,192,0.2)' : '0 2px 12px rgba(21,101,192,0.08)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <HouseSlideshow photos={photos} name={house.name} />

      <div className="card-body">
        <h3 className="card-title">{house.name}</h3>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>{house.address}</div>

        <div className="card-tags">
          <span className="tag">🛏 {house.bedrooms || house.rooms || 1} bed</span>
          <span className="tag">🚿 {house.bathrooms} bath</span>
          <span className="tag">📅 {house.min_rental_months}–{house.max_rental_months} mo</span>
        </div>

        <div className="card-price">
          ${Number(house.price_per_month || 0).toFixed(2)}
          <span> / month</span>
        </div>

        <button
          className="btn btn-full btn-lg"
          style={{ background: '#F57C00', color: '#1565C0', fontWeight: 800, fontSize: 15 }}
          onClick={() => onBook(house.id)}
        >
          Book Now →
        </button>
      </div>
    </div>
  );
}
