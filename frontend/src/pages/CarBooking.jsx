import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../utils/api';
import { formatPrice, fmtNum } from '../utils/formatPrice';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';

const HERO_IMGS = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1800&q=80',
];

const SORT_OPTIONS = [
  { value: 'default',   label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc','label': 'Price: High to Low' },
  { value: 'seats_asc', label: 'Seats: Fewest First' },
  { value: 'seats_desc','label': 'Seats: Most First' },
];

function sortCars(cars, sort) {
  const arr = [...cars];
  if (sort === 'price_asc')  return arr.sort((a, b) => a.price_per_day - b.price_per_day);
  if (sort === 'price_desc') return arr.sort((a, b) => b.price_per_day - a.price_per_day);
  if (sort === 'seats_asc')  return arr.sort((a, b) => a.seats - b.seats);
  if (sort === 'seats_desc') return arr.sort((a, b) => b.seats - a.seats);
  return arr;
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(21,101,192,0.07)', boxShadow: '0 4px 20px rgba(21,101,192,0.06)' }}>
      <div style={{ height: 200, background: 'linear-gradient(90deg, #f0f4ff 25%, #e3ecff 50%, #f0f4ff 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      <div style={{ padding: '20px 22px' }}>
        {[80, 55, 65].map((w, i) => (
          <div key={i} style={{ height: 14, borderRadius: 8, background: 'linear-gradient(90deg, #f0f4ff 25%, #e3ecff 50%, #f0f4ff 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', marginBottom: 12, width: `${w}%` }} />
        ))}
        <div style={{ height: 44, borderRadius: 12, background: 'linear-gradient(90deg, #f0f4ff 25%, #e3ecff 50%, #f0f4ff 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', marginTop: 8 }} />
      </div>
    </div>
  );
}

// Parse photos_categorized or fall back to legacy photos[]
function parseCategorized(car) {
  const cats = car.photos_categorized;
  if (Array.isArray(cats) && cats.length > 0) return cats;
  if (Array.isArray(car.photos) && car.photos.length > 0)
    return car.photos.map(u => ({ url: u, category: 'exterior' }));
  return [];
}

const CAT_LABELS = { exterior: 'Exterior', interior: 'Interior', additional: 'More' };

/* ── Car card ── */
function CarCard({ car, index, onBook }) {
  const [hovered, setHovered]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const [activeTab, setActiveTab] = useState('exterior');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [fading, setFading]     = useState(false);
  const autoRef = useRef(null);

  const allPhotos  = parseCategorized(car);
  const tabsAvail  = ['exterior','interior','additional'].filter(c => allPhotos.some(p => p.category === c));
  const tabPhotos  = allPhotos.filter(p => p.category === activeTab);
  const total      = tabPhotos.length;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    setPhotoIdx(0);
  }, [activeTab]);

  useEffect(() => {
    if (total <= 1) return;
    autoRef.current = setInterval(() => slide(1), 4000);
    return () => clearInterval(autoRef.current);
  }, [total, photoIdx, activeTab]);

  const slide = (dir) => {
    clearInterval(autoRef.current);
    setFading(true);
    setTimeout(() => { setPhotoIdx(i => (i + dir + total) % total); setFading(false); }, 170);
    autoRef.current = setInterval(() => slide(1), 4000);
  };

  const fuelIcon = car.fuel_type === 'Electric' ? '⚡' : car.fuel_type === 'Diesel' ? '🛢️' : car.fuel_type?.includes('Hybrid') ? '🔋' : '⛽';
  const currentPhoto = tabPhotos[photoIdx];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        border: hovered ? '1.5px solid rgba(21,101,192,0.35)' : '1.5px solid rgba(21,101,192,0.08)',
        boxShadow: hovered
          ? '0 20px 56px rgba(21,101,192,0.16), 0 0 0 3px rgba(21,101,192,0.06)'
          : '0 4px 20px rgba(21,101,192,0.07)',
        transform: hovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        opacity: visible ? 1 : 0,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
      }}
    >
      {/* Image / slideshow area */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
        {currentPhoto ? (
          <img
            key={`${activeTab}-${photoIdx}`}
            src={`${API_URL}/uploads/${currentPhoto.url}`}
            alt={`${car.make} ${car.model}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: fading ? 0 : 1, transition: 'opacity 0.17s ease' }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1565C0,#42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🚗</div>
        )}

        {/* Photo count */}
        {total > 1 && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.52)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, zIndex: 3, backdropFilter: 'blur(4px)' }}>
            {photoIdx + 1}/{total}
          </div>
        )}

        {/* Arrows — shown on hover when >1 photo */}
        {total > 1 && hovered && (
          <>
            <button onClick={e => { e.stopPropagation(); slide(-1); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.78)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#1a1a1a', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 3, backdropFilter: 'blur(4px)' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); slide(1); }}  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.78)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#1a1a1a', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 3, backdropFilter: 'blur(4px)' }}>›</button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div style={{ position: 'absolute', bottom: 38, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 3 }}>
            {tabPhotos.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); if (i !== photoIdx) { setFading(true); setTimeout(() => { setPhotoIdx(i); setFading(false); }, 170); } }} style={{ width: i === photoIdx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', background: i === photoIdx ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
            ))}
          </div>
        )}

        {/* Category tabs — shown on hover when multiple categories */}
        {tabsAvail.length > 1 && hovered && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 4 }}>
            {tabsAvail.map(cat => (
              <button
                key={cat}
                onClick={e => { e.stopPropagation(); setActiveTab(cat); }}
                style={{ flex: 1, padding: '6px 4px', border: 'none', background: 'transparent', color: cat === activeTab ? '#F57C00' : 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: cat === activeTab ? 800 : 500, cursor: 'pointer', borderBottom: cat === activeTab ? '2px solid #F57C00' : '2px solid transparent', transition: 'all 0.15s', fontFamily: 'inherit' }}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {/* Fuel badge */}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderRadius: 30, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#1565C0', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.12)', zIndex: 2 }}>
          <span>{fuelIcon}</span><span>{car.fuel_type}</span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Car name */}
        <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a1a', marginBottom: 12, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {car.year} {car.make} {car.model}
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ background: '#E3F2FD', color: '#1565C0', padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>👥</span> {car.seats} seats
          </span>
          {car.mileage_cap_per_day && (
            <span style={{ background: '#FFF3E0', color: '#E65100', padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📍</span> {car.mileage_cap_per_day} mi/day
            </span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Price */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#0D2B6B', lineHeight: 1 }}>
              {formatPrice(car.price_per_day)}
            </span>
            <span style={{ fontSize: 14, color: '#6b6b6b', fontWeight: 500 }}>/day</span>
          </div>
          {Number(car.deposit_amount) > 0 && (
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>🔐</span>
              <span>{formatPrice(car.deposit_amount)} refundable deposit</span>
            </div>
          )}
        </div>

        {/* Book Now button */}
        <button
          onClick={() => onBook(car)}
          style={{
            width: '100%',
            padding: '13px 20px',
            background: hovered ? 'linear-gradient(135deg, #F57C00, #E65100)' : '#F57C00',
            color: '#1565C0',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: 0.3,
            boxShadow: hovered ? '0 8px 24px rgba(245,124,0,0.4)' : '0 4px 14px rgba(245,124,0,0.25)',
            transform: hovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          Book Now →
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function CarBooking() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [city, setCity] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('default');
  const [heroImg] = useState(HERO_IMGS[Math.floor(Math.random() * HERO_IMGS.length)]);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [loginPromptPath, setLoginPromptPath] = useState(null);

  useEffect(() => {
    api.get(`/api/cities/${cityId}`).then(r => setCity(r.data)).catch(() => navigate('/'));
    api.get(`/api/cars?cityId=${cityId}`)
      .then(r => setCars(r.data))
      .catch(() => setCars([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  const handleBook = (car) => {
    if (!user) { setLoginPromptPath(`/car-rental/book/${car.id}`); return; }
    navigate(`/car-rental/book/${car.id}`, { state: { car } });
  };

  const sorted = sortCars(cars, sort);

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh' }}>

      {/* ── Hero banner ── */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        <img
          src={heroImg}
          alt="cars"
          onLoad={() => setHeroLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: heroLoaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(21,101,192,0.88) 0%, rgba(0,0,0,0.55) 100%)' }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 30, padding: '5px 16px', marginBottom: 16, width: 'fit-content' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>Home</Link>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
            {city && <Link to={`/city/${cityId}`} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{city.name}</Link>}
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>Rent a Car</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'white', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.3)', marginBottom: 6 }}>
                🚗 Rent a Car{city ? ` in ${city.name}` : ''}
              </h1>
              {city && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                  {city.state_name} · Select a car to start your rental
                </p>
              )}
            </div>

            {/* Car count badge */}
            {!loading && (
              <div style={{
                background: '#F57C00',
                color: 'white',
                fontWeight: 800,
                fontSize: 14,
                padding: '8px 20px',
                borderRadius: 30,
                boxShadow: '0 4px 16px rgba(245,124,0,0.4)',
                whiteSpace: 'nowrap',
                animation: 'fadeIn 0.5s ease 0.3s both',
              }}>
                {cars.length} car{cars.length !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter / sort bar ── */}
      <div style={{ background: 'white', borderBottom: '1px solid rgba(21,101,192,0.08)', padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b', whiteSpace: 'nowrap' }}>Sort by:</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              style={{
                padding: '7px 16px',
                borderRadius: 30,
                border: sort === o.value ? '2px solid #1565C0' : '2px solid #E8ECF0',
                background: sort === o.value ? '#1565C0' : 'white',
                color: sort === o.value ? 'white' : '#555',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container" style={{ paddingTop: 28 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚗</div>
            <h3>No cars available</h3>
            <p>There are no cars available in {city?.name} right now. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 24 }}>
            {sorted.map((car, i) => (
              <CarCard
                key={car.id}
                car={car}
                index={i}
                onBook={handleBook}
              />
            ))}
          </div>
        )}
      </div>

      {/* shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <LoginPromptModal
        open={!!loginPromptPath}
        onClose={() => setLoginPromptPath(null)}
        redirectTo={loginPromptPath}
      />
    </div>
  );
}
