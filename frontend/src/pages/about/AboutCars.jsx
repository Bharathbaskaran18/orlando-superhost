import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const HERO_IMG = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=2000&q=80';
const SECTION_BG = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=2000&q=60';

const FEATURES = [
  { icon: '🚗', title: 'Wide Vehicle Selection', desc: 'From compact city cars to spacious SUVs — find the perfect vehicle for any journey.' },
  { icon: '⏰', title: 'Flexible Pickup Times', desc: 'Choose convenient pickup and return times from 6 AM to 10 PM in 30-minute slots.' },
  { icon: '💰', title: 'Transparent Pricing', desc: 'No hidden fees. See the full cost including security deposit before you confirm.' },
  { icon: '📄', title: 'Digital Rental Agreement', desc: 'Sign your rental agreement digitally — no paperwork, no waiting at the counter.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Your payment is protected with industry-standard encryption and secure processing.' },
  { icon: '✅', title: 'Instant Confirmation', desc: 'Get immediate booking confirmation with all your rental details sent right away.' },
];

const STEPS = [
  { num: '1', title: 'Browse Cars', desc: 'Explore available vehicles in your city with photos, specs, and pricing.' },
  { num: '2', title: 'Pick Your Dates', desc: 'Select pickup and return dates & times (minimum 48 hours in advance).' },
  { num: '3', title: 'Fill Your Details', desc: "Provide your driver's license, insurance info, and personal details." },
  { num: '4', title: 'Pay Securely', desc: 'Complete your booking with a secure payment including the refundable deposit.' },
  { num: '5', title: 'Get Your Car', desc: 'Receive your digital rental agreement, sign it, and pick up your keys!' },
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

export default function AboutCars() {
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,43,107,0.88) 0%, rgba(0,0,0,0.65) 100%)' }} />

        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center', padding: '50px 60px', maxWidth: 680,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          transform: `translate(${mouse.x * -10}px, ${mouse.y * -7}px)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ background: 'rgba(245,124,0,0.25)', border: '1px solid rgba(245,124,0,0.5)', color: '#FFB74D', padding: '6px 20px', borderRadius: 30, fontSize: 12, fontWeight: 700, marginBottom: 22, display: 'inline-block', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            🚗 Car Rentals
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            Rent Your<br /><span style={{ color: '#F57C00' }}>Perfect Car</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: 36 }}>
            From compact city cars to spacious SUVs — book instantly, drive confidently, and explore every road.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'linear-gradient(135deg, #F57C00, #E65100)', color: 'white', border: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245,124,0,0.45)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,124,0,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,124,0,0.45)'; }}
          >
            Get Started →
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', animation: 'bounce 2s ease-in-out infinite' }}>
          ↓ Scroll to explore
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: 'linear-gradient(180deg, #0D2B6B 0%, #0D47A1 100%)', padding: '100px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 44, fontWeight: 800, color: 'white', marginBottom: 12 }}>Everything You Need</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>Premium rental features for a seamless experience</p>
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
              <p style={{ color: '#6b6b6b', fontSize: 18 }}>Book your perfect car in 5 simple steps</p>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.num} delay={i * 100}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '26px 32px', background: 'white', borderRadius: 18, border: '1px solid #E3F2FD', boxShadow: '0 2px 16px rgba(13,43,107,0.07)' }}>
                  <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0D2B6B, #1E88E5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{s.num}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#0D2B6B', marginBottom: 4 }}>{s.title}</div>
                    <div style={{ color: '#6b6b6b', fontSize: 15 }}>{s.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #0D2B6B 0%, #F57C00 100%)', padding: '100px 20px', textAlign: 'center' }}>
        <FadeIn>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: 'white', marginBottom: 16 }}>Ready to Hit the Road?</h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
            Create your account and book your perfect car today.
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
