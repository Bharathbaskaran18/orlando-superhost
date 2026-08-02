import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

// ── Intersection Observer hook ──────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── Count-up stat card ──────────────────────────────────────────────────────

function StatCard({ end, suffix, label, isFloat }) {
  const [ref, inView] = useInView(0.2);
  const [count, setCount] = useState(isFloat ? 0.0 : 0);

  useEffect(() => {
    if (!inView) return;
    if (isFloat) {
      let v = 0;
      const steps = 50;
      const inc = end / steps;
      const id = setInterval(() => {
        v += inc;
        if (v >= end) { setCount(end); clearInterval(id); }
        else setCount(parseFloat(v.toFixed(1)));
      }, 40);
      return () => clearInterval(id);
    }
    let v = 0;
    const step = end / (2000 / 16);
    const id = setInterval(() => {
      v += step;
      if (v >= end) { setCount(end); clearInterval(id); }
      else setCount(Math.floor(v));
    }, 16);
    return () => clearInterval(id);
  }, [inView, end, isFloat]);

  return (
    <div ref={ref} style={{ textAlign: 'center', minWidth: 150 }}>
      <div style={{ fontSize: 'clamp(38px, 5.5vw, 54px)', fontWeight: 800, color: '#FFB74D', lineHeight: 1 }}>
        {isFloat ? count.toFixed(1) : count}{suffix}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, marginTop: 8 }}>{label}</div>
    </div>
  );
}

// ── Service section (alternating layout) ────────────────────────────────────

function ServiceSection({ bg, imgSrc, imgRight, tag, title, subtitle, bullets, btnText, service, onServiceClick }) {
  const [ref, inView] = useInView(0.12);

  const slide = (dir, delay = 0) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? 'translate(0,0)'
      : dir === 'left' ? 'translate(-56px,0)'
      : 'translate(56px,0)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <section ref={ref} style={{ background: bg, padding: '88px 24px' }}>
      <div style={{
        maxWidth: 1080,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        flexWrap: 'wrap',
      }}>
        {!imgRight && (
          <div style={{ flex: '1 1 400px', minWidth: 260, ...slide('left') }}>
            <img
              src={imgSrc}
              alt=""
              style={{ width: '100%', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.16)', display: 'block' }}
            />
          </div>
        )}

        <div style={{ flex: '1 1 360px', minWidth: 260, ...slide(imgRight ? 'left' : 'right', 0.15) }}>
          <div style={{
            display: 'inline-block',
            background: '#E3F2FD', color: '#0D2B6B',
            padding: '5px 16px', borderRadius: 30,
            fontSize: 13, fontWeight: 700, marginBottom: 18,
          }}>
            {tag}
          </div>
          <h2 style={{
            fontSize: 'clamp(24px, 3.2vw, 36px)',
            fontWeight: 800, color: '#1a1a1a',
            marginBottom: 14, lineHeight: 1.2,
          }}>
            {title}
          </h2>
          <p style={{ color: '#666', fontSize: 16, marginBottom: 26, lineHeight: 1.8 }}>
            {subtitle}
          </p>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <span style={{ color: '#22c55e', fontSize: 17, marginTop: 3, flexShrink: 0 }}>✓</span>
              <span style={{ color: '#555', lineHeight: 1.65, fontSize: 15 }}>{b}</span>
            </div>
          ))}
          <button
            onClick={() => onServiceClick(service)}
            style={{
              marginTop: 18,
              background: '#F57C00', color: 'white', border: 'none',
              padding: '14px 32px', borderRadius: 10,
              fontWeight: 800, fontSize: 16, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#E65100';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(245,124,0,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F57C00';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {btnText}
          </button>
        </div>

        {imgRight && (
          <div style={{ flex: '1 1 400px', minWidth: 260, ...slide('right', 0.05) }}>
            <img
              src={imgSrc}
              alt=""
              style={{ width: '100%', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.16)', display: 'block' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Hero animation
  const [heroLoaded, setHeroLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Scroll anchor for "Learn More"
  const statsRef = useRef(null);

  // City selector state
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [targetService, setTargetService] = useState('');
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const loadStates = async () => {
    if (states.length > 0) return;
    setLoadingStates(true);
    try { const { data } = await api.get('/api/states'); setStates(data); }
    catch {} finally { setLoadingStates(false); }
  };

  const handleServiceClick = (service) => {
    if (!user) { navigate('/login'); return; }
    setTargetService(service);
    setSelectorOpen(true);
    loadStates();
  };

  const handleStateChange = async (stateId) => {
    setSelectedState(stateId);
    setSelectedCity('');
    setCities([]);
    if (!stateId) return;
    setLoadingCities(true);
    try { const { data } = await api.get(`/api/states/${stateId}/cities`); setCities(data); }
    catch { setCities([]); } finally { setLoadingCities(false); }
  };

  const handleGoToCity = () => {
    if (!selectedCity) return;
    const path = targetService ? `/city/${selectedCity}/${targetService}` : `/city/${selectedCity}`;
    navigate(path);
    setSelectorOpen(false);
    setSelectedState('');
    setSelectedCity('');
    setCities([]);
  };

  // Why section
  const [whyRef, whyInView] = useInView(0.1);
  const [ctaRef, ctaInView] = useInView(0.2);

  const WHY = [
    { icon: '💰', title: 'Best Prices Guaranteed', desc: 'Lowest rates in the market, always' },
    { icon: '⚡', title: 'Instant Confirmation', desc: 'Book in minutes, not hours' },
    { icon: '🔒', title: '100% Secure Payments', desc: 'Your money is always safe with us' },
    { icon: '📱', title: 'Easy to Use', desc: 'Book from any device, anywhere, anytime' },
    { icon: '🌟', title: 'Verified Listings', desc: 'Every car, home and agent is verified' },
    { icon: '🎯', title: 'No Hidden Fees', desc: 'What you see is what you pay' },
  ];

  const heroAnim = (delay) => ({
    opacity: heroLoaded ? 1 : 0,
    transform: heroLoaded ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
  });

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          zIndex: 0,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '130px 24px 110px', maxWidth: 820, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-block',
            background: 'rgba(245,124,0,0.18)', border: '1px solid rgba(245,124,0,0.55)',
            color: '#FFB74D', padding: '7px 22px', borderRadius: 30,
            fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
            marginBottom: 30, ...heroAnim(0.1),
          }}>
            ✈️ Your #1 Travel & Rental Platform
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(38px, 6.5vw, 76px)',
            fontWeight: 800, color: 'white', lineHeight: 1.08,
            marginBottom: 24, letterSpacing: '-1.5px',
            ...heroAnim(0.25),
          }}>
            Experience Travel<br />
            <span style={{ color: '#FFB74D' }}>Like Never Before</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 19px)',
            color: 'rgba(255,255,255,0.82)', lineHeight: 1.8,
            marginBottom: 44, maxWidth: 560, margin: '0 auto 44px',
            ...heroAnim(0.4),
          }}>
            Book cars, vacation homes, and local experts — all in one place across all 50 states.
            Best prices guaranteed.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', ...heroAnim(0.55) }}>
            <button
              onClick={() => handleServiceClick('')}
              style={{
                background: '#F57C00', color: 'white', border: 'none',
                padding: '16px 38px', borderRadius: 10,
                fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 30px rgba(245,124,0,0.5)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = '#E65100'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = '#F57C00'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.5)'; }}
            >
              Start Booking Now
            </button>
            <button
              onClick={() => statsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'transparent', color: 'white',
                border: '2px solid rgba(255,255,255,0.6)',
                padding: '16px 38px', borderRadius: 10,
                fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; }}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll arrow */}
        <div
          onClick={() => statsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2, cursor: 'pointer',
            opacity: heroLoaded ? 1 : 0,
            transition: 'opacity 0.6s ease 1s',
          }}
        >
          <div style={{
            width: 40, height: 40,
            border: '2px solid rgba(255,255,255,0.55)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'hpBounce 2s ease-in-out infinite',
          }}>
            <span style={{ color: 'white', fontSize: 18, lineHeight: 1 }}>↓</span>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background: '#0D2B6B', padding: '64px 24px' }}>
        <div style={{
          maxWidth: 920, margin: '0 auto',
          display: 'flex', justifyContent: 'space-around',
          flexWrap: 'wrap', gap: 36,
        }}>
          <StatCard end={500} suffix="+" label="Happy Travelers" />
          <StatCard end={50}  suffix="+" label="Premium Cars" />
          <StatCard end={30}  suffix="+" label="Vacation Homes" />
          <StatCard end={4.9} suffix="★" label="Average Rating" isFloat />
        </div>
      </section>

      {/* ─── CAR RENTAL ───────────────────────────────────────────────────── */}
      <ServiceSection
        bg="white"
        imgSrc="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80"
        imgRight={false}
        tag="🚗 Car Rental"
        title="Drive More, Spend Less"
        subtitle="Premium cars at prices you won't find anywhere else"
        bullets={[
          'Instant booking, flexible pickup times, no hidden fees',
          'From economy to luxury — perfect car for every budget',
          'Digital rental agreement, fully secure payments',
        ]}
        btnText="Browse Cars →"
        service="cars"
        onServiceClick={handleServiceClick}
      />

      {/* ─── HOUSE BOOKING ────────────────────────────────────────────────── */}
      <ServiceSection
        bg="#F8F9FA"
        imgSrc="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"
        imgRight={true}
        tag="🏠 Vacation Homes"
        title="Stay Like You Live There"
        subtitle="Hand-picked vacation homes across all 50 states"
        bullets={[
          'More space, more comfort, more value than any hotel',
          'Perfect for families, couples, and solo travelers',
          'Verified properties with instant confirmation',
        ]}
        btnText="Browse Houses →"
        service="houses"
        onServiceClick={handleServiceClick}
      />

      {/* ─── LEASING ──────────────────────────────────────────────────────── */}
      <ServiceSection
        bg="white"
        imgSrc="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"
        imgRight={false}
        tag="🏡 Long-Term Leasing"
        title="Find Your Next Home Anywhere You Travel"
        subtitle="Browse verified long-term rental properties across all 50 states"
        bullets={[
          'Simple online application, no paperwork hassle',
          'Affordable monthly rates, transparent lease agreements',
          'Step by step approval process, fully online',
        ]}
        btnText="Browse Lease Properties →"
        service="leasing"
        onServiceClick={handleServiceClick}
      />

      {/* ─── AGENT BOOKING ────────────────────────────────────────────────── */}
      <ServiceSection
        bg="#F8F9FA"
        imgSrc="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"
        imgRight={true}
        tag="🧭 Local Experts"
        title="Your Personal Travel Expert"
        subtitle="Local guides who know every hidden gem in the city"
        bullets={[
          'Skip the tourist traps, discover hidden local gems',
          'Personalized tours tailored just for you by the hour',
          'Book instantly, pay securely online',
        ]}
        btnText="Book an Agent →"
        service="agents"
        onServiceClick={handleServiceClick}
      />

      {/* ─── WHY CHOOSE US ────────────────────────────────────────────────── */}
      <section ref={whyRef} style={{ background: '#0D2B6B', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: 64,
            opacity: whyInView ? 1 : 0,
            transform: whyInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: 'white', margin: 0 }}>
              Why Thousands Choose Orlando Superhost
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {WHY.map((f, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 16, padding: '30px 26px',
                  opacity: whyInView ? 1 : 0,
                  transform: whyInView ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.55s ease ${i * 0.08}s, transform 0.55s ease ${i * 0.08}s`,
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION ───────────────────────────────────────────────── */}
      <section ref={ctaRef} style={{
        background: 'linear-gradient(135deg, #0D2B6B 0%, #0D47A1 100%)',
        padding: '104px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, color: 'white',
            marginBottom: 18,
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}>
            Ready to Start Your Journey?
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.78)', fontSize: 18, marginBottom: 40,
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
          }}>
            Join hundreds of happy travelers who trust Orlando Superhost
          </p>
          <div style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
          }}>
            <Link
              to="/register"
              style={{
                display: 'inline-block',
                background: '#F57C00', color: 'white',
                padding: '18px 48px', borderRadius: 12,
                fontWeight: 800, fontSize: 18, textDecoration: 'none',
                boxShadow: '0 8px 30px rgba(245,124,0,0.5)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = '#E65100'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = '#F57C00'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.5)'; }}
            >
              Sign Up Now — It's Free
            </Link>
            <p style={{ marginTop: 22, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#FFB74D', textDecoration: 'underline' }}>Login here</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0D47A1', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 48, marginBottom: 52,
          }}>
            {/* Brand */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <Logo scale={0.75} variant="dark" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 1.75, margin: 0 }}>
                Your #1 Travel & Rental Platform
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Quick Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Home', to: '/' },
                  { label: 'Cars', to: '/about/cars' },
                  { label: 'Houses', to: '/about/houses' },
                  { label: 'Agents', to: '/about/agents' },
                  { label: 'Leasing', to: '/about/states' },
                ].map(link => (
                  <Link
                    key={link.label}
                    to={link.to}
                    style={{ color: 'rgba(255,255,255,0.68)', textDecoration: 'none', fontSize: 14, transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FFB74D'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>📧</span> orlandosuperhost@gmail.com
                </div>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>📍</span> Orlando, Florida, USA
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 28, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
              © 2026 Orlando Superhost. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ─── CITY SELECTOR MODAL ──────────────────────────────────────────── */}
      {/* ─── DESTINATION SELECTOR MODAL ──────────────────────────────────── */}
      {selectorOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10, 20, 50, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'overlayIn 0.2s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) setSelectorOpen(false); }}
        >
          <div style={{
            background: 'white',
            borderRadius: 24,
            width: '100%', maxWidth: 600,
            boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>

            {/* Gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #0D2B6B 0%, #0D47A1 100%)',
              padding: '32px 32px 28px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 60, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

              {/* Close button */}
              <button
                onClick={() => setSelectorOpen(false)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '50%',
                  width: 36, height: 36,
                  cursor: 'pointer', color: 'white',
                  fontSize: 20, fontWeight: 300,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                ×
              </button>

              <div style={{ position: 'relative', zIndex: 1, marginTop: 12 }}>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: 26, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Where do you want to go?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  Choose your destination to explore available services
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '28px 32px 32px' }}>

              {/* ── STATE SELECTION ── */}
              <div style={{ marginBottom: 8 }}>
                <p style={{
                  fontWeight: 700, color: '#374151', fontSize: 12,
                  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#0D2B6B' }}>01</span>
                  <span style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                  Select State
                  <span style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                </p>

                {loadingStates ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6b6b6b', fontSize: 14 }}>
                    <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                    <div>Loading states...</div>
                  </div>
                ) : states.length === 0 ? (
                  <div style={{ color: '#dc2626', fontSize: 13, padding: '14px 16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                    No states available yet. Check back soon!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                    {states.map((s, i) => {
                      const isSel = selectedState === String(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleStateChange(String(s.id))}
                          style={{
                            background: isSel ? '#0D2B6B' : '#F0F7FF',
                            border: `2px solid ${isSel ? '#0D2B6B' : '#BBDEFB'}`,
                            borderRadius: 14,
                            padding: '16px 18px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            animation: `cardFadeIn 0.35s ease ${i * 0.06}s both`,
                            boxShadow: isSel ? '0 4px 16px rgba(13,43,107,0.3)' : 'none',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)';
                            e.currentTarget.style.boxShadow = isSel
                              ? '0 8px 24px rgba(13,43,107,0.4)'
                              : '0 4px 16px rgba(13,43,107,0.15)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                            e.currentTarget.style.boxShadow = isSel ? '0 4px 16px rgba(13,43,107,0.3)' : 'none';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ fontSize: 18 }}>📍</span>
                            {isSel && (
                              <span style={{
                                background: 'rgba(255,255,255,0.25)', borderRadius: '50%',
                                width: 22, height: 22, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 13, color: 'white',
                                animation: 'checkBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}>✓</span>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: isSel ? 'white' : '#0D2B6B', lineHeight: 1.3 }}>
                            {s.name}
                          </div>
                          {s.code && (
                            <div style={{ fontSize: 11, color: isSel ? 'rgba(255,255,255,0.7)' : '#6b7280', marginTop: 2 }}>
                              {s.code}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── CITY SELECTION ── */}
              {selectedState && (
                <div style={{ marginTop: 24, animation: 'citySlideIn 0.3s ease' }}>
                  <p style={{
                    fontWeight: 700, color: '#374151', fontSize: 12,
                    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ color: '#0D2B6B' }}>02</span>
                    <span style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                    Select City
                    <span style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                  </p>

                  {loadingCities ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#6b6b6b', fontSize: 14 }}>
                      <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                      <div>Loading cities...</div>
                    </div>
                  ) : cities.length === 0 ? (
                    <div style={{ color: '#dc2626', fontSize: 13, padding: '14px 16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                      No cities enabled in this state yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {cities.map((c, i) => {
                        const isSel = selectedCity === String(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCity(String(c.id))}
                            style={{
                              background: isSel ? '#0D2B6B' : '#F0F7FF',
                              border: `2px solid ${isSel ? '#0D2B6B' : '#BBDEFB'}`,
                              borderRadius: 50,
                              padding: '10px 22px',
                              cursor: 'pointer',
                              fontWeight: 600, fontSize: 14,
                              color: isSel ? 'white' : '#0D2B6B',
                              transition: 'all 0.2s ease',
                              animation: `cardFadeIn 0.3s ease ${i * 0.07}s both`,
                              boxShadow: isSel ? '0 4px 14px rgba(13,43,107,0.3)' : 'none',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.06) translateY(-1px)';
                              e.currentTarget.style.boxShadow = isSel
                                ? '0 6px 20px rgba(13,43,107,0.4)'
                                : '0 4px 14px rgba(13,43,107,0.15)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1) translateY(0)';
                              e.currentTarget.style.boxShadow = isSel ? '0 4px 14px rgba(13,43,107,0.3)' : 'none';
                            }}
                          >
                            {isSel && (
                              <span style={{ fontSize: 13, animation: 'checkBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>✓</span>
                            )}
                            {c.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── LET'S GO BUTTON ── */}
              <div style={{ marginTop: 28 }}>
                <button
                  onClick={handleGoToCity}
                  disabled={!selectedCity}
                  style={{
                    width: '100%',
                    background: selectedCity ? '#F57C00' : '#f3f4f6',
                    color: selectedCity ? 'white' : '#9ca3af',
                    border: 'none',
                    padding: '17px',
                    borderRadius: 14,
                    fontWeight: 800,
                    fontSize: 17,
                    cursor: selectedCity ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'all 0.25s ease',
                    boxShadow: selectedCity ? '0 6px 22px rgba(245,124,0,0.38)' : 'none',
                    animation: selectedCity ? 'btnPulse 2.5s ease-in-out infinite' : 'none',
                    letterSpacing: 0.3,
                  }}
                  onMouseEnter={e => {
                    if (selectedCity) {
                      e.currentTarget.style.background = '#E65100';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(245,124,0,0.5)';
                      e.currentTarget.style.animation = 'none';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCity) {
                      e.currentTarget.style.background = '#F57C00';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 6px 22px rgba(245,124,0,0.38)';
                      e.currentTarget.style.animation = 'btnPulse 2.5s ease-in-out infinite';
                    }
                  }}
                >
                  {selectedCity ? "Let's Go! →" : "Select a destination above to continue"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hpBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-10px); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.90) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes citySlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkBounce {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 6px 22px rgba(245,124,0,0.38); }
          50%       { box-shadow: 0 6px 30px rgba(245,124,0,0.60); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
