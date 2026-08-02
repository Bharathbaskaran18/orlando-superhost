import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { HouseStepBar } from './HouseHeroCard';

const CSS = `
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .hd-day { cursor:pointer; user-select:none; }
  .hd-day:hover .hd-num { background:#E3F2FD !important; }
  .hd-sel:hover .hd-num { background:#1565C0 !important; }
  .hd-disabled { cursor:default !important; }
  .hd-disabled .hd-num { color:#D0D5DD !important; }
  .hd-disabled:hover .hd-num { background:transparent !important; }
  .hd-booked .hd-num { background:#FFEBEE !important; color:#C62828 !important; text-decoration:line-through; }
  .hd-booked:hover .hd-num { background:#FFCDD2 !important; }
  .hd-partial .hd-num { background:#FFF3E0 !important; color:#E65100 !important; }
  .hd-partial:hover .hd-num { background:#FFE0B2 !important; }
  .hd-nav:hover { background:rgba(255,255,255,0.15) !important; }
  .gal-arrow { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.45); border:none; color:white; width:38px; height:38px; border-radius:50%; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
  .gal-arrow:hover { background:rgba(0,0,0,0.65) !important; }
  .gal-dot { width:7px; height:7px; border-radius:50%; cursor:pointer; transition:all 0.2s; flex-shrink:0; }
`;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ap}`;
};

function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function dateStr(d) {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseLocal(s) {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d, 12, 0, 0);
}
function fmtShort(s) {
  if (!s) return '';
  const d = parseLocal(s);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function buildBlockedSets(ranges) {
  const fullyBlocked = new Set();
  const partial      = new Map(); // dateStr → partial_checkout_available time
  ranges.forEach(r => {
    const start = parseLocal(String(r.checkin_date).slice(0,10));
    const end   = parseLocal(String(r.checkout_date).slice(0,10));
    let cur = new Date(start);
    while (cur < end) {                      // days up to but NOT including checkout
      fullyBlocked.add(dateStr(cur));
      cur = addDays(cur, 1);
    }
    const co = dateStr(end);                 // checkout date itself
    if (r.partial_checkout_available) {
      partial.set(co, r.partial_checkout_available);
    } else {
      fullyBlocked.add(co);
    }
  });
  return { fullyBlocked, partial };
}

function MonthGrid({ year, month, checkin, checkout, hoverDate, fullyBlocked, partial, minDate, onDateClick, onDateHover }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const first = new Date(year, month, 1).getDay();
  const dim   = new Date(year, month+1, 0).getDate();
  const cells = Array.from({ length: first + dim }, (_, i) => i < first ? null : i - first + 1);

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'#888', padding:'4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = dateStr(new Date(year, month, day));
          const date = parseLocal(ds);
          const isFullBlock = fullyBlocked.has(ds);
          const isPartial   = !isFullBlock && partial.has(ds);
          const isPast      = date < minDate;
          const isDisabled  = isFullBlock || isPast;
          const isCheckin   = ds === checkin;
          const isCheckout  = ds === checkout;
          const inRange     = checkin && !checkout && hoverDate && ds > checkin && ds <= hoverDate && !isFullBlock && !isPartial;
          const inSelected  = checkin && checkout && ds >= checkin && ds <= checkout && !isFullBlock;
          const isEndpoint  = isCheckin || isCheckout;

          let bg = 'transparent', color = '#1a1a1a';
          if (isPast && !isFullBlock) { color = '#D0D5DD'; }
          if (isEndpoint) { bg = '#1565C0'; color = 'white'; }
          else if (inRange || inSelected) { bg = '#E3F2FD'; color = '#1565C0'; }

          return (
            <div
              key={ds}
              className={[
                'hd-day',
                isEndpoint   ? 'hd-sel'      : '',
                isDisabled   ? 'hd-disabled'  : '',
                isFullBlock  ? 'hd-booked'    : '',
                isPartial && !isEndpoint ? 'hd-partial' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !isDisabled && onDateClick(ds)}
              onMouseEnter={() => !isDisabled && onDateHover(ds)}
            >
              <div className="hd-num" style={{ textAlign:'center', borderRadius:8, padding:'6px 4px', fontSize:13, fontWeight: isEndpoint ? 800 : 500, background: bg, color }}>
                {day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoGallery({ house }) {
  const photos   = house?.photos || [];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    if (photos.length > 1) {
      timerRef.current = setInterval(() => setIdx(i => (i + 1) % photos.length), 4000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [photos.length]);

  const go = (newIdx) => { setIdx(newIdx); resetTimer(); };

  if (!house) return null;
  const photo = photos[idx];

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
      {/* Main photo */}
      <div style={{ position: 'relative', height: 280 }}>
        {photo ? (
          <img
            key={idx}
            src={`${API_URL}/uploads/${photo}`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'fadeIn 0.4s ease' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1565C0, #42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🏠</div>
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent)', pointerEvents: 'none' }} />

        {/* House info */}
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 100 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 3, lineHeight: 1.2 }}>{house.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{house.address}</div>
        </div>

        {/* Price badge */}
        <div style={{ position: 'absolute', top: 16, right: 16, background: '#F57C00', color: '#1565C0', borderRadius: 10, padding: '7px 14px', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          ${Number(house.price_per_night).toFixed(2)}<span style={{ fontSize: 11, fontWeight: 600 }}>/night</span>
        </div>

        {/* Arrows */}
        {photos.length > 1 && (
          <>
            <button className="gal-arrow" onClick={() => go((idx - 1 + photos.length) % photos.length)} style={{ left: 12 }}>‹</button>
            <button className="gal-arrow" onClick={() => go((idx + 1) % photos.length)} style={{ right: 12 }}>›</button>
          </>
        )}

        {/* Dots */}
        {photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, right: 16, display: 'flex', gap: 5 }}>
            {photos.map((_, i) => (
              <div key={i} className="gal-dot" onClick={() => go(i)} style={{ background: i === idx ? 'white' : 'rgba(255,255,255,0.45)', transform: i === idx ? 'scale(1.3)' : 'scale(1)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: 'rgba(255,255,255,0.95)', overflowX: 'auto' }}>
          {photos.map((p, i) => (
            <img
              key={i}
              src={`${API_URL}/uploads/${p}`}
              alt=""
              onClick={() => go(i)}
              style={{ width: 68, height: 50, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: `2.5px solid ${i === idx ? '#1565C0' : 'transparent'}`, opacity: i === idx ? 1 : 0.65, transition: 'all 0.2s', flexShrink: 0 }}
            />
          ))}
        </div>
      )}

      {/* Property badges */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(255,255,255,0.97)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: '#E3F2FD', color: '#1565C0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>🛏 {house.bedrooms || house.rooms || 1} bed</span>
        <span style={{ background: '#E3F2FD', color: '#1565C0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>🚿 {house.bathrooms} bath</span>
        <span style={{ background: '#E3F2FD', color: '#1565C0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>👥 Up to {house.max_guests || 4} guests</span>
        {house.pets_allowed
          ? <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>🐾 Pets Welcome</span>
          : <span style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>🚫 No Pets</span>
        }
        {house.checkin_time && (
          <span style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>✅ Check-in: {fmtTime(house.checkin_time)}</span>
        )}
        {house.checkout_time && (
          <span style={{ background: '#FFF8E1', color: '#F57C00', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>🚪 Check-out: {fmtTime(house.checkout_time)}</span>
        )}
      </div>
    </div>
  );
}

export default function HouseDatePicker() {
  const { houseId } = useParams();
  const navigate    = useNavigate();
  const [house, setHouse]           = useState(null);
  const [blockedSets, setBlockedSets] = useState({ fullyBlocked: new Set(), partial: new Map() });
  const [loading, setLoading]       = useState(true);
  const [rulesOpen, setRulesOpen]   = useState(false);
  const [partialCheckinNote, setPartialCheckinNote] = useState(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [checkin, setCheckin]     = useState(null);
  const [checkout, setCheckout]   = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [numGuests, setNumGuests] = useState(1);
  const [pets, setPets]           = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/house-booking/house/${houseId}`),
      api.get(`/api/house-booking/booked-dates/${houseId}`),
    ]).then(([hRes, bRes]) => {
      setHouse(hRes.data);
      setBlockedSets(buildBlockedSets(bRes.data));
    }).finally(() => setLoading(false));
  }, [houseId]);

  const handleDateClick = (ds) => {
    const setCheckinDs = (d) => {
      setCheckin(d);
      setCheckout(null);
      setHoverDate(null);
      const note = blockedSets.partial.get(d);
      setPartialCheckinNote(note || null);
    };

    if (!checkin || (checkin && checkout)) {
      setCheckinDs(ds);
    } else {
      if (ds <= checkin) { setCheckinDs(ds); return; }
      // Partial date cannot be used as checkout (it's another booking's checkout day)
      if (blockedSets.partial.has(ds)) { setCheckinDs(ds); return; }
      const st = parseLocal(checkin), en = parseLocal(ds);
      let cur = addDays(st, 1);
      while (cur < en) {
        const cs = dateStr(cur);
        if (blockedSets.fullyBlocked.has(cs) || blockedSets.partial.has(cs)) {
          setCheckinDs(ds); return;
        }
        cur = addDays(cur, 1);
      }
      setCheckout(ds);
      setPartialCheckinNote(null);
    }
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
  const totalNights = checkin && checkout ? Math.ceil((parseLocal(checkout) - parseLocal(checkin)) / 86400000) : 0;
  const maxGuests   = house?.max_guests || 4;
  const extraGuestFeePerNight = rp(house?.extra_guest_fee || 0);
  const extraGuests = Math.max(0, numGuests - maxGuests);
  const extraFeeTotal = rp(extraGuests * extraGuestFeePerNight * totalNights);
  const pricePerNight = rp(house?.price_per_night || 0);
  const rentalCost    = rp(pricePerNight * totalNights);
  const deposit       = rp(house?.deposit_amount || 0);
  const total         = rp(rentalCost + extraFeeTotal + deposit);

  const canContinue = checkin && checkout && totalNights > 0;

  const handleContinue = () => {
    navigate(`/house/book/${houseId}/details`, {
      state: { checkin, checkout, numGuests, pets, totalNights, pricePerNight, rentalCost, extraFeeTotal, deposit, total },
    });
  };

  const CARD = {
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    marginBottom: 16,
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!house)  return <div className="container"><p>House not found.</p></div>;

  const checkinFmt  = fmtShort(checkin);
  const checkoutFmt = fmtShort(checkout);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')",
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 780 }}>
        <div style={{ marginBottom: 8 }}>
          <Link to={`/city/${house.city_id}/houses`} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← Back to houses</Link>
        </div>

        <HouseStepBar currentStep={1} />
        <PhotoGallery house={house} />

        {/* Calendar */}
        <div style={CARD}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Select Check-In & Check-Out Dates</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button className="hd-nav" onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 16, color: '#1565C0' }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button className="hd-nav" onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 16, color: '#1565C0' }}>›</button>
          </div>

          <MonthGrid
            year={viewYear} month={viewMonth}
            checkin={checkin} checkout={checkout} hoverDate={hoverDate}
            fullyBlocked={blockedSets.fullyBlocked} partial={blockedSets.partial}
            minDate={today}
            onDateClick={handleDateClick}
            onDateHover={setHoverDate}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1, background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', border: `2px solid ${checkin ? '#1565C0' : '#E0E0E0'}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>CHECK-IN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: checkin ? '#1565C0' : '#bbb' }}>{checkinFmt || 'Select date'}</div>
            </div>
            <div style={{ flex: 1, background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', border: `2px solid ${checkout ? '#1565C0' : '#E0E0E0'}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>CHECK-OUT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: checkout ? '#1565C0' : '#bbb' }}>{checkoutFmt || 'Select date'}</div>
            </div>
          </div>

          {partialCheckinNote && (
            <div style={{ marginTop: 10, background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E65100', fontWeight: 500 }}>
              ⏰ Limited availability — check-in available from <strong>{fmtTime(partialCheckinNote)}</strong> due to a 3-hour cleaning gap.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 3 }} />
              Unavailable
            </div>
            {blockedSets.partial.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: 3 }} />
                Limited hours
              </div>
            )}
          </div>
        </div>

        {/* Guests & Pets */}
        <div style={CARD}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Guests & Pets</h3>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Number of Guests</label>
            <select
              value={numGuests}
              onChange={e => setNumGuests(parseInt(e.target.value))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            >
              {Array.from({ length: maxGuests + 5 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} guest{n !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Max guests info badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E3F2FD', color: '#1565C0', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            👥 Maximum guests allowed: {maxGuests}
            {extraGuestFeePerNight > 0 && <span style={{ color: '#555', fontWeight: 500 }}>· ${extraGuestFeePerNight.toFixed(2)}/person/night over limit</span>}
          </div>

          {extraGuests > 0 && (
            <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#E65100', lineHeight: 1.6 }}>
              ⚠️ This property allows up to {maxGuests} guests. {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} will be charged ${extraGuestFeePerNight.toFixed(2)}/person/night.
              {totalNights > 0 && ` (${extraGuests} × $${extraGuestFeePerNight.toFixed(2)} × ${totalNights} nights = $${extraFeeTotal.toFixed(2)})`}
            </div>
          )}

          {house.pets_allowed && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#333', fontWeight: 500 }}>
              <input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              🐾 Bringing pets?
            </label>
          )}
        </div>

        {/* House Rules (collapsible) */}
        {house.house_rules && (
          <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => setRulesOpen(o => !o)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1565C0' }}>📋 House Rules</span>
              <span style={{ color: '#1565C0', fontSize: 22, fontWeight: 700, lineHeight: 1, transition: 'transform 0.3s', display: 'inline-block', transform: rulesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
            </button>
            <div style={{ maxHeight: rulesOpen ? '800px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
              <div style={{ padding: '0 24px 20px' }}>
                <div style={{ background: '#F0F7FF', borderLeft: '4px solid #1565C0', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.8, marginBottom: 14 }}>
                  {house.house_rules}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {house.pets_allowed
                    ? <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>🐾 Pets Welcome</span>
                    : <span style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>🚫 No Pets Allowed</span>
                  }
                  {house.checkin_time && (
                    <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>✅ Check-in from {fmtTime(house.checkin_time)}</span>
                  )}
                  {house.checkout_time && (
                    <span style={{ background: '#FFF8E1', color: '#F57C00', border: '1px solid #FFE082', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>🚪 Check-out by {fmtTime(house.checkout_time)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        {checkin && checkout && totalNights > 0 && (
          <div style={CARD}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Price Breakdown</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
              <span style={{ color: '#555' }}>{totalNights} night{totalNights !== 1 ? 's' : ''} × ${pricePerNight.toFixed(2)}/night</span>
              <span style={{ fontWeight: 600 }}>${rentalCost.toFixed(2)}</span>
            </div>
            {extraFeeTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                <span style={{ color: '#E65100' }}>⚠️ Extra guest fee ({extraGuests} × ${extraGuestFeePerNight.toFixed(2)} × {totalNights} nights)</span>
                <span style={{ fontWeight: 600, color: '#E65100' }}>${extraFeeTotal.toFixed(2)}</span>
              </div>
            )}
            {deposit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                <span style={{ color: '#555' }}>Deposit (refundable)</span>
                <span style={{ fontWeight: 600 }}>${deposit.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 18, fontWeight: 800, color: '#1565C0' }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed',
            background: canContinue ? '#F57C00' : 'rgba(255,255,255,0.3)',
            color: canContinue ? '#1565C0' : 'rgba(255,255,255,0.5)',
            fontWeight: 800, fontSize: 17, fontFamily: 'inherit', transition: 'all 0.2s',
            boxShadow: canContinue ? '0 4px 20px rgba(245,124,0,0.4)' : 'none',
          }}
        >
          {canContinue ? `Continue — ${totalNights} night${totalNights !== 1 ? 's' : ''} →` : 'Select check-in and check-out dates'}
        </button>
      </div>
    </div>
  );
}
