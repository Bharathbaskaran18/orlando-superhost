import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../utils/api';
import { formatPrice, fmtNum } from '../../utils/formatPrice';

const HERO_CSS = `
  @keyframes heroPulse    { 0%{transform:scale(0.85);opacity:0.9} 70%{transform:scale(1.5);opacity:0} 100%{transform:scale(1.5);opacity:0} }
  @keyframes heroSlideDown{ from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lbOpen       { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  .car-pulse-ring { animation: heroPulse 1.8s ease-out infinite; }
  .lb-open        { animation: lbOpen 0.22s ease; }
`;

// ── helpers ──────────────────────────────────────────────────────────────────

function parsePhotos(car) {
  const cats = car?.photos_categorized;
  if (Array.isArray(cats) && cats.length > 0) return cats;
  const legacy = car?.photos || car?.car_photos;
  if (Array.isArray(legacy) && legacy.length > 0)
    return legacy.map(u => ({ url: u, category: 'exterior' }));
  return [];
}

function photoUrl(p) {
  if (!p) return null;
  const u = typeof p === 'string' ? p : p.url;
  return u ? (u.startsWith('http') ? u : `${API_URL}/uploads/${u}`) : null;
}

const CAT_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'exterior',   label: 'Exterior' },
  { key: 'interior',   label: 'Interior' },
  { key: 'additional', label: 'More' },
];

// ── Step bar ─────────────────────────────────────────────────────────────────

export function CarStepBar({ currentStep = 1 }) {
  const steps = ['Select Dates', 'Your Details', 'Payment'];
  return (
    <>
      <style>{HERO_CSS}</style>
      <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
        {steps.map((label, i) => {
          const stepNum  = i + 1;
          const isActive = stepNum === currentStep;
          const isDone   = stepNum < currentStep;
          return (
            <div key={label} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 1 : 'none' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:72 }}>
                <div style={{ position:'relative', width:46, height:46, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {isActive && <div className="car-pulse-ring" style={{ position:'absolute', inset:-6, borderRadius:'50%', border:'2.5px solid #F57C00', pointerEvents:'none' }} />}
                  <div style={{ width:38, height:38, borderRadius:'50%', zIndex:1, background: isActive ? '#1565C0' : isDone ? '#16A34A' : 'rgba(255,255,255,0.15)', border: (isActive || isDone) ? 'none' : '2px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color: (isActive || isDone) ? 'white' : 'rgba(255,255,255,0.4)', boxShadow: isActive ? '0 4px 18px rgba(21,101,192,0.45)' : 'none', transition:'background .2s' }}>
                    {isDone ? '✓' : stepNum}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight: isActive ? 700 : 500, whiteSpace:'nowrap', color: isActive ? 'white' : 'rgba(255,255,255,0.38)', textShadow:'0 1px 4px rgba(0,0,0,0.35)' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex:1, height:2, borderRadius:2, margin:'0 6px', marginBottom:22, background: isDone ? '#16A34A' : 'rgba(255,255,255,0.18)' }} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const touchStart    = useRef(null);

  const go = useCallback((dir) => setIdx(i => (i + dir + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  go(1);
      if (e.key === 'ArrowLeft')   go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStart.current = null;
  };

  return (
    <div
      className="lb-open"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.93)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
    >
      {/* Close button — prominent white circle top-right */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ position:'fixed', top:16, right:16, width:44, height:44, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.5)', background:'rgba(30,30,30,0.85)', color:'white', fontSize:22, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10001, boxShadow:'0 2px 12px rgba(0,0,0,0.6)', backdropFilter:'blur(6px)' }}
        title="Close (Esc)"
      >✕</button>

      {/* Counter */}
      <div style={{ position:'absolute', top:22, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.75)', fontSize:13, fontWeight:600, userSelect:'none' }}>{idx + 1} of {photos.length}</div>

      {/* Main image — stop propagation so clicking photo doesn't close */}
      <img
        key={idx}
        src={photoUrl(photos[idx])}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', borderRadius:10, userSelect:'none' }}
      />

      {/* Arrows */}
      {photos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); go(-1); }} style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', width:44, height:44, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.18)', color:'white', fontSize:22, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>‹</button>
          <button onClick={e => { e.stopPropagation(); go(1); }}  style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', width:44, height:44, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.18)', color:'white', fontSize:22, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>›</button>
        </>
      )}

      {/* Thumbnail strip */}
      <div onClick={e => e.stopPropagation()} style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, overflowX:'auto', maxWidth:'90vw', padding:'4px 0' }}>
        {photos.map((p, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{ width:52, height:36, borderRadius:6, overflow:'hidden', padding:0, border:'none', outline: i === idx ? '2.5px solid #F57C00' : '2px solid transparent', cursor:'pointer', flexShrink:0, opacity: i === idx ? 1 : 0.5, transition:'all 0.15s' }}>
            <img src={photoUrl(p)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── CarHeroCard ───────────────────────────────────────────────────────────────

export function CarHeroCard({ car }) {
  const allPhotos    = parsePhotos(car);
  const pricePerDay  = car?.price_per_day ?? car?.daily_rate ?? 0;
  const deposit      = car?.deposit_amount ?? 0;

  // available tab keys (only show tabs that have photos)
  const availCats = ['exterior','interior','additional'].filter(c => allPhotos.some(p => p.category === c));
  const hasCats   = availCats.length > 1;

  const [activeTab, setActiveTab] = useState('all');
  const [idx, setIdx]             = useState(0);
  const [sliding, setSliding]     = useState(null); // 'left' | 'right' | null
  const [lbIdx, setLbIdx]         = useState(null); // null = closed
  const thumbsRef = useRef(null);

  const filtered = activeTab === 'all' ? allPhotos : allPhotos.filter(p => p.category === activeTab);
  const total    = filtered.length;

  useEffect(() => { setIdx(0); }, [activeTab]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const el = thumbsRef.current.children[idx];
    el?.scrollIntoView({ inline:'nearest', behavior:'smooth', block:'nearest' });
  }, [idx]);

  const go = (dir) => {
    setSliding(dir > 0 ? 'left' : 'right');
    setTimeout(() => { setIdx(i => (i + dir + total) % total); setSliding(null); }, 180);
  };

  if (!car) return null;

  const current = filtered[idx];

  return (
    <>
      <style>{HERO_CSS}</style>
      {lbIdx !== null && (
        <Lightbox photos={filtered.length ? filtered : allPhotos} startIdx={lbIdx} onClose={() => setLbIdx(null)} />
      )}

      <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,20,0.2)', borderLeft:'5px solid #1565C0', marginBottom:24, animation:'heroSlideDown .4s ease', overflow:'hidden' }}>

        {/* ── Category tabs ── */}
        {(hasCats || total > 0) && (
          <div style={{ display:'flex', borderBottom:'1px solid #EEF2F7', background:'#F8FBFF' }}>
            {CAT_TABS.filter(t => t.key === 'all' || availCats.includes(t.key)).map(t => {
              const count = t.key === 'all' ? allPhotos.length : allPhotos.filter(p => p.category === t.key).length;
              if (count === 0) return null;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{ flex:1, padding:'10px 4px', border:'none', background:'transparent', color: active ? '#1565C0' : '#888', fontWeight: active ? 800 : 500, fontSize:12, cursor:'pointer', borderBottom: active ? '2.5px solid #1565C0' : '2.5px solid transparent', transition:'all 0.15s', fontFamily:'inherit' }}
                >
                  {t.label} <span style={{ fontSize:10, opacity:0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main photo ── */}
        <div style={{ position:'relative', height:230, background:'linear-gradient(135deg,#1565C0,#42A5F5)', overflow:'hidden', cursor: total > 0 ? 'zoom-in' : 'default' }} onClick={() => { if (total > 0) setLbIdx(idx); }}>
          {current ? (
            <img
              key={`${activeTab}-${idx}`}
              src={photoUrl(current)}
              alt={`${car?.year} ${car?.make} ${car?.model}`}
              style={{ width:'100%', height:'100%', objectFit:'cover', opacity: sliding ? 0 : 1, transition:'opacity 0.18s ease', transform: sliding === 'left' ? 'translateX(-8px)' : sliding === 'right' ? 'translateX(8px)' : 'none' }}
            />
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>🚗</div>
          )}

          {/* Counter */}
          {total > 1 && (
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.55)', color:'white', fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20, backdropFilter:'blur(4px)', zIndex:2, userSelect:'none' }}>
              {idx + 1} of {total}
            </div>
          )}

          {/* Expand hint */}
          {total > 0 && (
            <div style={{ position:'absolute', bottom:10, right:10, background:'rgba(0,0,0,0.45)', color:'white', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:8, backdropFilter:'blur(4px)', zIndex:2, userSelect:'none' }}>⛶ View full</div>
          )}

          {/* Arrows */}
          {total > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); go(-1); }} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.78)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#1a1a1a', boxShadow:'0 2px 8px rgba(0,0,0,0.25)', backdropFilter:'blur(4px)', zIndex:3 }}>‹</button>
              <button onClick={e => { e.stopPropagation(); go(1); }}  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.78)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#1a1a1a', boxShadow:'0 2px 8px rgba(0,0,0,0.25)', backdropFilter:'blur(4px)', zIndex:3 }}>›</button>
            </>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {total > 1 && (
          <div ref={thumbsRef} style={{ display:'flex', gap:6, padding:'10px 14px', overflowX:'auto', background:'rgba(0,0,0,0.025)', scrollbarWidth:'thin' }}>
            {filtered.map((p, i) => (
              <button
                key={i}
                onClick={() => { if (i !== idx) { setSliding(i > idx ? 'left' : 'right'); setTimeout(() => { setIdx(i); setSliding(null); }, 180); } }}
                style={{ width:62, height:44, borderRadius:8, overflow:'hidden', padding:0, border:'none', outline: i === idx ? '2.5px solid #1565C0' : '2px solid transparent', cursor:'pointer', flexShrink:0, opacity: i === idx ? 1 : 0.55, transition:'all 0.18s ease' }}
              >
                <img src={photoUrl(p)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </button>
            ))}
          </div>
        )}

        {/* ── Car details ── */}
        <div style={{ padding:'16px 24px 20px' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#1565C0', letterSpacing:-0.4, marginBottom:8 }}>
            {car?.year} {car?.make} {car?.model}
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:10 }}>
            {car?.fuel_type && <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#555', fontWeight:500 }}><span>⛽</span> {car.fuel_type}</div>}
            {car?.seats     && <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#555', fontWeight:500 }}><span>👤</span> {car.seats} seats</div>}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:26, fontWeight:800, color:'#0D2B6B', letterSpacing:-0.5, lineHeight:1 }}>
              {formatPrice(pricePerDay)}
              <span style={{ fontSize:13, fontWeight:600, color:'#9AA5B8' }}>/day</span>
            </span>
            {Number(deposit) > 0 && (
              <span style={{ fontSize:12, color:'#9AA5B8', fontWeight:500 }}>+ {formatPrice(deposit)} deposit</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
