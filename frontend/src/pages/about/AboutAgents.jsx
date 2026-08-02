import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const HERO_IMG = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=80';
const SECTION_BG = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=60';

const FEATURES = [
  { icon: '🧭', title: 'Verified Local Agents', desc: 'Every agent is vetted and verified — real experts who know their city inside and out.' },
  { icon: '🕐', title: 'Book by the Hour', desc: 'Need a guide for two hours or a full day? Flexible hourly booking to fit your plans.' },
  { icon: '🗺️', title: 'Expert Local Knowledge', desc: "Get insider tips, hidden gems, and local recommendations you won't find in any guide." },
  { icon: '📆', title: 'Flexible Scheduling', desc: 'Choose any time that works for you — mornings, evenings, weekends, no problem.' },
  { icon: '🔒', title: 'Secure Payment', desc: 'Pay safely through our platform. No cash needed, no awkward haggling.' },
  { icon: '⭐', title: 'Personalized Tours', desc: "Tell your agent what you love — culture, food, adventure — and they'll tailor the experience." },
];

const STEPS = [
  { num: '1', title: 'Browse Agents', desc: 'Discover local travel experts available in your destination city.' },
  { num: '2', title: 'Pick a Time', desc: 'Choose your preferred date, start time, and number of hours.' },
  { num: '3', title: 'Fill Your Details', desc: 'Share your interests and what kind of experience you\'re looking for.' },
  { num: '4', title: 'Pay Securely', desc: 'Confirm your booking with a secure, encrypted payment.' },
  { num: '5', title: 'Meet Your Agent', desc: 'Your guide will meet you at the agreed spot and the adventure begins!' },
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

export default function AboutAgents() {
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(74,20,140,0.88) 0%, rgba(13,43,107,0.78) 100%)' }} />

        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center', padding: '50px 60px', maxWidth: 680,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          transform: `translate(${mouse.x * -10}px, ${mouse.y * -7}px)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ background: 'rgba(245,124,0,0.25)', border: '1px solid rgba(245,124,0,0.5)', color: '#FFB74D', padding: '6px 20px', borderRadius: 30, fontSize: 12, fontWeight: 700, marginBottom: 22, display: 'inline-block', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            🧭 Travel Agents
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            Connect With<br /><span style={{ color: '#F57C00' }}>Local Travel Experts</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: 36 }}>
            Go beyond tourist traps. Our verified local agents show you the real city — the food, culture, and hidden gems only locals know.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'linear-gradient(135deg, #F57C00, #E65100)', color: 'white', border: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245,124,0,0.45)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.45)'; }}
          >
            Find an Agent →
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', animation: 'bounce 2s ease-in-out infinite' }}>
          ↓ Scroll to explore
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: 'linear-gradient(180deg, #4A148C 0%, #0D2B6B 100%)', padding: '100px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 44, fontWeight: 800, color: 'white', marginBottom: 12 }}>What Makes Us Different</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>Real local expertise, not packaged tours</p>
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
              <p style={{ color: '#6b6b6b', fontSize: 18 }}>Meet your local expert in 5 simple steps</p>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.num} delay={i * 100}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '26px 32px', background: 'white', borderRadius: 18, border: '1px solid #E3F2FD', boxShadow: '0 2px 16px rgba(21,101,192,0.07)' }}>
                  <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #4A148C, #0D2B6B)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{s.num}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#4A148C', marginBottom: 4 }}>{s.title}</div>
                    <div style={{ color: '#6b6b6b', fontSize: 15 }}>{s.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #4A148C 0%, #0D2B6B 100%)', padding: '100px 20px', textAlign: 'center' }}>
        <FadeIn>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: 'white', marginBottom: 16 }}>Your Local Guide Awaits</h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
            Sign in and connect with a verified local travel expert today.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'white', color: '#4A148C', border: 'none', padding: '18px 52px', borderRadius: 50, fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}
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
