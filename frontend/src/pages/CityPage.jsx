import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=85',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=85',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=85',
  'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1600&q=85',
];

const BOOKING_OPTIONS = [
  {
    key: 'cars',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    title: 'Rent a Car',
    desc: 'Choose from a wide selection of cars. Pick your dates and find the perfect vehicle for your trip.',
    tags: ['Premium Fleet', 'Instant booking', 'Flexible dates'],
    btnLabel: 'Browse Cars',
    path: (id) => `/city/${id}/cars`,
  },
  {
    key: 'houses',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
    title: 'Book a House',
    desc: 'Find cozy homes and vacation rentals. Stay like a local with all the comforts of home.',
    tags: ['Top Rated Stays', 'Verified homes', 'Best price'],
    btnLabel: 'Browse Houses',
    path: (id) => `/city/${id}/houses`,
  },
  {
    key: 'agents',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80',
    title: 'Book an Agent',
    desc: 'Hire a local travel expert. They know every hidden gem in the city and will plan your perfect day.',
    tags: ['Local expert', 'Personalized tour', 'Hourly rate'],
    btnLabel: 'Browse Agents',
    path: (id) => `/city/${id}/agents`,
  },
  {
    key: 'leasing',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
    title: 'Lease a Home',
    desc: 'Find your next long-term home. Browse available properties and start your rental application today.',
    tags: ['Long-term rental', 'Easy application', 'Monthly pricing'],
    btnLabel: 'Browse Lease Properties',
    path: (id) => `/city/${id}/leasing`,
  },
];

function BookingCard({ option, cityId, navigate, index }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      ref={ref}
      onClick={() => navigate(option.path(cityId))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(21,101,192,0.08)',
        boxShadow: hovered
          ? '0 20px 60px rgba(21,101,192,0.18)'
          : '0 4px 20px rgba(21,101,192,0.08)',
        transform: hovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)',
        opacity: visible ? 1 : 0,
        transitionProperty: 'transform, box-shadow, opacity',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image header */}
      <div style={{ height: 200, overflow: 'hidden', borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
        <img
          src={option.image}
          alt={option.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.5s ease',
          }}
        />
      </div>

      {/* Card body */}
      <div style={{ padding: '22px 24px 26px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#1565C0',
          marginBottom: 8,
          letterSpacing: '-0.3px',
        }}>
          {option.title}
        </h3>
        <p style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>
          {option.desc}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, marginTop: 'auto' }}>
          {option.tags.map(t => (
            <span
              key={t}
              style={{
                background: '#E3F2FD',
                color: '#1565C0',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Button */}
        <button
          style={{
            width: '100%',
            padding: '12px 20px',
            background: hovered ? '#E65100' : '#F57C00',
            color: '#1565C0',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            letterSpacing: 0.2,
          }}
        >
          {option.btnLabel}
          <span style={{
            display: 'inline-block',
            transform: hovered ? 'translateX(4px)' : 'translateX(0)',
            transition: 'transform 0.25s ease',
          }}>→</span>
        </button>
      </div>
    </div>
  );
}

export default function CityPage() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [city, setCity] = useState(null);
  const [attractions, setAttractions] = useState([]);
  const [images, setImages] = useState(FALLBACK_IMAGES);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroLoaded, setHeroLoaded] = useState(false);

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
    const timer = setInterval(() => setActiveImg(i => (i + 1) % images.length), 5000);
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
    <div style={{ background: '#F8F9FA', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
        <img
          src={images[activeImg]}
          alt={city.name}
          onLoad={() => setHeroLoaded(true)}
          onError={e => { e.target.src = FALLBACK_IMAGES[0]; }}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'opacity 0.6s ease',
            opacity: heroLoaded ? 1 : 0,
          }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05) 100%)',
        }} />

        {/* Breadcrumb + city name */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 36px' }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 30,
            padding: '5px 16px',
            marginBottom: 14,
          }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>Home</Link>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{city.state_name}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>›</span>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{city.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ color: 'white', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, textShadow: '0 2px 16px rgba(0,0,0,0.5)', marginBottom: 6 }}>
                {city.name}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 500 }}>
                📍 {city.state_name}
              </p>
            </div>

            {/* Dot indicators */}
            <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: i === activeImg ? 28 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === activeImg ? '#F57C00' : 'rgba(255,255,255,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Thumbnail strip ── */}
      {images.length > 1 && (
        <div style={{
          background: 'white',
          borderBottom: '1px solid rgba(21,101,192,0.08)',
          padding: '12px 40px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
        }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              onClick={() => setActiveImg(i)}
              loading="lazy"
              style={{
                width: 90, height: 62, objectFit: 'cover', borderRadius: 8,
                cursor: 'pointer', flexShrink: 0,
                border: i === activeImg ? '3px solid #F57C00' : '3px solid transparent',
                opacity: i === activeImg ? 1 : 0.65,
                transition: 'all 0.2s',
              }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      <div className="container" style={{ paddingTop: 28 }}>

        {/* ── Attractions ── */}
        {attractions.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>
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
                  borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 2px 12px rgba(21,101,192,0.08)',
                  borderLeft: '4px solid #F57C00',
                  border: '1px solid rgba(21,101,192,0.08)',
                  borderLeftColor: '#F57C00',
                  borderLeftWidth: 4,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1565C0', marginBottom: 4 }}>
                    {a.name}
                  </div>
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.55 }}>
                      {a.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Animated blob background ── */}
        <div style={{ position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: -60, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {/* Blob 1 — light blue, top-left */}
            <div style={{
              position: 'absolute', top: '5%', left: '-5%',
              width: 420, height: 420,
              background: 'radial-gradient(circle, rgba(21,101,192,0.10) 0%, rgba(21,101,192,0) 70%)',
              animation: 'blobOne 18s ease-in-out infinite',
            }} />
            {/* Blob 2 — amber, top-right */}
            <div style={{
              position: 'absolute', top: '0%', right: '-5%',
              width: 360, height: 360,
              background: 'radial-gradient(circle, rgba(245,124,0,0.09) 0%, rgba(245,124,0,0) 70%)',
              animation: 'blobTwo 22s ease-in-out infinite',
              animationDelay: '-7s',
            }} />
            {/* Blob 3 — light blue, bottom-center */}
            <div style={{
              position: 'absolute', bottom: '5%', left: '30%',
              width: 480, height: 480,
              background: 'radial-gradient(circle, rgba(21,101,192,0.07) 0%, rgba(21,101,192,0) 70%)',
              animation: 'blobThree 26s ease-in-out infinite',
              animationDelay: '-13s',
            }} />
            {/* Blob 4 — amber, bottom-left */}
            <div style={{
              position: 'absolute', bottom: '0%', left: '-3%',
              width: 320, height: 320,
              background: 'radial-gradient(circle, rgba(245,124,0,0.07) 0%, rgba(245,124,0,0) 70%)',
              animation: 'blobOne 20s ease-in-out infinite',
              animationDelay: '-4s',
            }} />
          </div>

        {/* ── Booking options header ── */}
        <div style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#1a1a1a',
            marginBottom: 6,
            letterSpacing: '-0.4px',
          }}>
            What would you like to book?
          </h2>
          <p style={{ color: '#6b6b6b', fontSize: 15 }}>
            Explore everything {city.name} has to offer — cars, stays, guides, and homes.
          </p>
        </div>

        {/* ── Booking cards grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 60,
          position: 'relative',
          zIndex: 1,
        }}>
          {BOOKING_OPTIONS.map((option, i) => (
            <BookingCard
              key={option.key}
              option={option}
              cityId={cityId}
              navigate={navigate}
              index={i}
            />
          ))}
        </div>
        </div>{/* end blob wrapper */}
      </div>
    </div>
  );
}
