import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const HERO_IMG = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2000&q=80';
const SECTION_BG = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=2000&q=60';

const FEATURES = [
  { icon: '🏠', title: 'Verified Properties', desc: 'Every home on our platform is reviewed and verified by our team for quality.' },
  { icon: '📅', title: 'Flexible Lease Terms', desc: 'Choose a move-in date and rental duration that fits your needs, from a few months to a year or more.' },
  { icon: '🛏️', title: 'Multiple Room Types', desc: 'Studio apartments, family homes, beach cottages — find exactly what you need.' },
  { icon: '🔒', title: 'Secure Booking', desc: 'Your reservation is protected and confirmed with secure payment processing.' },
  { icon: '💰', title: 'Best Price Guarantee', desc: 'Transparent pricing with no surprise fees. The price you see is what you pay.' },
  { icon: '✅', title: 'Instant Confirmation', desc: 'Receive immediate booking confirmation with all stay details via email.' },
];

const STEPS = [
  { num: '1', title: 'Browse Houses', desc: 'Explore verified rental homes and properties in your destination city.' },
  { num: '2', title: 'Pick Your Move-In Date', desc: 'Choose your move-in date and rental duration — we calculate your move-out date automatically.' },
  { num: '3', title: 'Fill Your Details', desc: 'Provide your information and any special requirements for your lease.' },
  { num: '4', title: 'Pay Securely', desc: 'Pay your first month\'s rent plus security deposit with secure, encrypted payment.' },
  { num: '5', title: 'Move In', desc: 'Receive your lease confirmation and move-in details, then pay monthly rent going forward.' },
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
      { threshold: 0.12 }
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

export default function AboutHouses() {
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,77,64,0.88) 0%, rgba(13,43,107,0.75) 100%)' }} />

        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center', padding: '50px 60px', maxWidth: 680,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          transform: `translate(${mouse.x * -10}px, ${mouse.y * -7}px)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ background: 'rgba(245,124,0,0.25)', border: '1px solid rgba(245,124,0,0.5)', color: '#FFB74D', padding: '6px 20px', borderRadius: 30, fontSize: 12, fontWeight: 700, marginBottom: 22, display: 'inline-block', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            🏠 Vacation Homes
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            Find Your Home<br /><span style={{ color: '#F57C00' }}>Away From Home</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: 36 }}>
            From cozy studios to spacious family homes — discover the perfect place to stay in cities across America.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'linear-gradient(135deg, #F57C00, #E65100)', color: 'white', border: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245,124,0,0.45)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.45)'; }}
          >
            Find a Home →
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', animation: 'bounce 2s ease-in-out infinite' }}>
          ↓ Scroll to explore
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: 'linear-gradient(180deg, #006064 0%, #0D2B6B 100%)', padding: '100px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 44, fontWeight: 800, color: 'white', marginBottom: 12 }}>Why Book With Us</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>Everything you need for the perfect home away from home</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div
                  style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 22, padding: 36, height: '100%', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: 44, marginBottom: 18 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ position: 'relative', padding: '100px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SECTION_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06 }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 44, fontWeight: 800, color: '#0D2B6B', marginBottom: 12 }}>How It Works</h2>
              <p style={{ color: '#6b6b6b', fontSize: 18 }}>Book your home away from home in 5 easy steps</p>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.num} delay={i * 100}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '26px 32px', background: 'white', borderRadius: 18, border: '1px solid #E0F2F1', boxShadow: '0 2px 16px rgba(0,77,64,0.07)' }}>
                  <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #006064, #0D2B6B)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{s.num}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#006064', marginBottom: 4 }}>{s.title}</div>
                    <div style={{ color: '#6b6b6b', fontSize: 15 }}>{s.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #006064 0%, #0D2B6B 100%)', padding: '100px 20px', textAlign: 'center' }}>
        <FadeIn>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: 'white', marginBottom: 16 }}>Find Your Perfect Stay</h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
            Sign in and browse hundreds of vacation homes across the USA.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'white', color: '#006064', border: 'none', padding: '18px 52px', borderRadius: 50, fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}
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
