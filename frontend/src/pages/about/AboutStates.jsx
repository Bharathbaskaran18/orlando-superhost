import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HERO_IMG = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=2000&q=80';

const US_STATES = [
  { name: 'Alabama',        abbr: 'AL', emoji: '⛳' },
  { name: 'Alaska',         abbr: 'AK', emoji: '🏔️' },
  { name: 'Arizona',        abbr: 'AZ', emoji: '🌵' },
  { name: 'Arkansas',       abbr: 'AR', emoji: '🌾' },
  { name: 'California',     abbr: 'CA', emoji: '🌊' },
  { name: 'Colorado',       abbr: 'CO', emoji: '⛷️' },
  { name: 'Connecticut',    abbr: 'CT', emoji: '🍂' },
  { name: 'Delaware',       abbr: 'DE', emoji: '🦅' },
  { name: 'Florida',        abbr: 'FL', emoji: '🌴' },
  { name: 'Georgia',        abbr: 'GA', emoji: '🍑' },
  { name: 'Hawaii',         abbr: 'HI', emoji: '🌺' },
  { name: 'Idaho',          abbr: 'ID', emoji: '🏔️' },
  { name: 'Illinois',       abbr: 'IL', emoji: '🌆' },
  { name: 'Indiana',        abbr: 'IN', emoji: '🏎️' },
  { name: 'Iowa',           abbr: 'IA', emoji: '🌽' },
  { name: 'Kansas',         abbr: 'KS', emoji: '🌻' },
  { name: 'Kentucky',       abbr: 'KY', emoji: '🐎' },
  { name: 'Louisiana',      abbr: 'LA', emoji: '🎷' },
  { name: 'Maine',          abbr: 'ME', emoji: '🦞' },
  { name: 'Maryland',       abbr: 'MD', emoji: '🦀' },
  { name: 'Massachusetts',  abbr: 'MA', emoji: '🎓' },
  { name: 'Michigan',       abbr: 'MI', emoji: '🚗' },
  { name: 'Minnesota',      abbr: 'MN', emoji: '❄️' },
  { name: 'Mississippi',    abbr: 'MS', emoji: '🎶' },
  { name: 'Missouri',       abbr: 'MO', emoji: '🌉' },
  { name: 'Montana',        abbr: 'MT', emoji: '🦌' },
  { name: 'Nebraska',       abbr: 'NE', emoji: '🌾' },
  { name: 'Nevada',         abbr: 'NV', emoji: '🎰' },
  { name: 'New Hampshire',  abbr: 'NH', emoji: '🍁' },
  { name: 'New Jersey',     abbr: 'NJ', emoji: '🏖️' },
  { name: 'New Mexico',     abbr: 'NM', emoji: '🌵' },
  { name: 'New York',       abbr: 'NY', emoji: '🗽' },
  { name: 'North Carolina', abbr: 'NC', emoji: '🏔️' },
  { name: 'North Dakota',   abbr: 'ND', emoji: '🌾' },
  { name: 'Ohio',           abbr: 'OH', emoji: '✈️' },
  { name: 'Oklahoma',       abbr: 'OK', emoji: '🌪️' },
  { name: 'Oregon',         abbr: 'OR', emoji: '🌲' },
  { name: 'Pennsylvania',   abbr: 'PA', emoji: '🔔' },
  { name: 'Rhode Island',   abbr: 'RI', emoji: '⚓' },
  { name: 'South Carolina', abbr: 'SC', emoji: '🌊' },
  { name: 'South Dakota',   abbr: 'SD', emoji: '🗿' },
  { name: 'Tennessee',      abbr: 'TN', emoji: '🎸' },
  { name: 'Texas',          abbr: 'TX', emoji: '🤠' },
  { name: 'Utah',           abbr: 'UT', emoji: '🏜️' },
  { name: 'Vermont',        abbr: 'VT', emoji: '🍁' },
  { name: 'Virginia',       abbr: 'VA', emoji: '🏛️' },
  { name: 'Washington',     abbr: 'WA', emoji: '☕' },
  { name: 'West Virginia',  abbr: 'WV', emoji: '⛰️' },
  { name: 'Wisconsin',      abbr: 'WI', emoji: '🧀' },
  { name: 'Wyoming',        abbr: 'WY', emoji: '🐻' },
];

// 10 curated beautiful landscape images cycling through the grid
const IMG_POOL = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1527489377706-5bf97e608852?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&h=320&q=70',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&h=320&q=70',
];

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: 0, transform: 'translateY(40px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

export default function AboutStates() {
  const navigate = useNavigate();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  const onMouseMove = (e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left - rect.width / 2) / rect.width,
      y: (e.clientY - rect.top - rect.height / 2) / rect.height,
    });
  };

  return (
    <div style={{ background: '#F8F9FA', overflowX: 'hidden' }}>

      {/* ── Hero ── */}
      <div ref={heroRef} onMouseMove={onMouseMove} style={{ height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: -30,
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: `translate(${mouse.x * 18}px, ${mouse.y * 12}px)`,
          transition: 'transform 0.4s ease',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(183,28,28,0.82) 0%, rgba(13,43,107,0.85) 100%)' }} />

        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center', padding: '50px 60px', maxWidth: 700,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          transform: `translate(${mouse.x * -10}px, ${mouse.y * -7}px)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ background: 'rgba(245,124,0,0.25)', border: '1px solid rgba(245,124,0,0.5)', color: '#FFB74D', padding: '6px 20px', borderRadius: 30, fontSize: 12, fontWeight: 700, marginBottom: 22, display: 'inline-block', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            🗺️ All 50 States
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            Explore<br /><span style={{ color: '#F57C00' }}>All 50 States</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: 36 }}>
            From the peaks of Alaska to the beaches of Florida — every state has something extraordinary waiting for you.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            {[
              { icon: '🚗', label: 'Rent Cars' },
              { icon: '🏠', label: 'Book Houses' },
              { icon: '🧭', label: 'Hire Agents' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 18px', color: 'white', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{s.icon}</span>{s.label}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'linear-gradient(135deg, #F57C00, #E65100)', color: 'white', border: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245,124,0,0.45)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.45)'; }}
          >
            Start Exploring →
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', animation: 'bounce 2s ease-in-out infinite' }}>
          ↓ Browse all 50 states
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ background: 'linear-gradient(135deg, #0D2B6B, #0D47A1)', padding: '40px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap' }}>
          {[
            { num: '50', label: 'States' },
            { num: '300+', label: 'Cities' },
            { num: '3', label: 'Services' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#F57C00', lineHeight: 1 }}>{s.num}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 6, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── States grid ── */}
      <div style={{ padding: '80px 20px', maxWidth: 1400, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#0D2B6B', marginBottom: 12 }}>All 50 States</h2>
            <p style={{ color: '#6b6b6b', fontSize: 18 }}>Click any state to start exploring — sign in to book cars, houses, and agents</p>
          </div>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {US_STATES.map((state, i) => (
            <FadeIn key={state.abbr} delay={Math.min(i * 30, 600)}>
              <div
                onClick={() => navigate('/login')}
                style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,43,107,0.1)', transition: 'transform 0.25s, box-shadow 0.25s', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(13,43,107,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(13,43,107,0.1)'; }}
              >
                {/* Background image */}
                <div style={{ height: 130, position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={IMG_POOL[i % IMG_POOL.length]}
                    alt={state.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,43,107,0.7) 0%, rgba(0,0,0,0.1) 100%)' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', color: '#0D2B6B', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>
                    {state.abbr}
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: 28 }}>{state.emoji}</div>
                </div>

                {/* Card body */}
                <div style={{ background: 'white', padding: '14px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 10 }}>{state.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['🚗 Cars', '🏠 Houses', '🧭 Agents'].map(svc => (
                      <span key={svc} style={{ background: '#E3F2FD', color: '#0D2B6B', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>{svc}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #0D2B6B 100%)', padding: '100px 20px', textAlign: 'center' }}>
        <FadeIn>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: 'white', marginBottom: 16 }}>Your Next Adventure Awaits</h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
            Sign in to start booking cars, homes, and agents in any of our 50 states.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'white', color: '#0D2B6B', border: 'none', padding: '18px 52px', borderRadius: 50, fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
          >
            Get Started — Login to Book
          </button>
        </FadeIn>
      </div>
    </div>
  );
}
