import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { HouseStepBar } from './HouseHeroCard';
import { parseLocal, fmtLong, ordinal, addMonthsClamped, buildDisplaySchedule } from './houseLeaseUtils';

const CSS = `
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .gal-arrow { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.45); border:none; color:white; width:38px; height:38px; border-radius:50%; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
  .gal-arrow:hover { background:rgba(0,0,0,0.65) !important; }
  .gal-dot { width:7px; height:7px; border-radius:50%; cursor:pointer; transition:all 0.2s; flex-shrink:0; }
`;

function dateStr(d) {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 100 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 3, lineHeight: 1.2 }}>{house.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{house.address}</div>
        </div>

        <div style={{ position: 'absolute', top: 16, right: 16, background: '#F57C00', color: '#1565C0', borderRadius: 10, padding: '7px 14px', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          ${Number(house.price_per_month || 0).toFixed(2)}<span style={{ fontSize: 11, fontWeight: 600 }}>/month</span>
        </div>

        {photos.length > 1 && (
          <>
            <button className="gal-arrow" onClick={() => go((idx - 1 + photos.length) % photos.length)} style={{ left: 12 }}>‹</button>
            <button className="gal-arrow" onClick={() => go((idx + 1) % photos.length)} style={{ right: 12 }}>›</button>
          </>
        )}

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
        <span style={{ background: '#FFF8E1', color: '#F57C00', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>📅 {house.min_rental_months}–{house.max_rental_months} month lease</span>
      </div>
    </div>
  );
}

export default function HouseDatePicker() {
  const { houseId } = useParams();
  const navigate    = useNavigate();
  const [house, setHouse]     = useState(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  const today = new Date(); today.setHours(0,0,0,0);
  const minMoveIn = dateStr(today);

  const [moveInDate, setMoveInDate] = useState(minMoveIn);
  const [numMonths, setNumMonths]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/house-booking/house/${houseId}`),
      api.get(`/api/house-booking/availability/${houseId}`),
    ]).then(([hRes, aRes]) => {
      setHouse(hRes.data);
      setAvailable(aRes.data.available);
      setNumMonths(hRes.data.min_rental_months || 1);
    }).finally(() => setLoading(false));
  }, [houseId]);

  const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
  const monthlyRent = rp(house?.price_per_month || 0);
  const deposit      = rp(house?.deposit_amount || 0);
  const totalDueToday = rp(monthlyRent + deposit);
  const moveOutDate   = moveInDate && numMonths ? addMonthsClamped(moveInDate, numMonths) : null;

  const canContinue = available && moveInDate && numMonths > 0 && parseLocal(moveInDate) >= today;
  const schedule = buildDisplaySchedule(moveInDate, numMonths, monthlyRent);
  const gracePeriodDays = house?.grace_period_days ?? 5;
  const latePaymentFee  = rp(house?.late_payment_fee || 0);
  const rentDueDay = moveInDate ? ordinal(parseLocal(moveInDate).getDate()) : null;

  const handleContinue = () => {
    navigate(`/house/book/${houseId}/details`, {
      state: { moveInDate, numMonths, moveOutDate, monthlyRent, deposit, totalDueToday },
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

  const monthOptions = [];
  if (house.min_rental_months && house.max_rental_months) {
    for (let n = house.min_rental_months; n <= house.max_rental_months; n++) monthOptions.push(n);
  }

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

        {!available ? (
          <div style={CARD}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚫</div>
              <h3 style={{ color: '#C62828', marginBottom: 8 }}>This property is not currently available</h3>
              <p style={{ color: '#666' }}>It's leased through the end of the current tenant's rental period. Check back later or browse other properties.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Move-in details */}
            <div style={CARD}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Select Move-In Date & Duration</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 4 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Move-In Date</label>
                  <input
                    type="date"
                    value={moveInDate}
                    min={minMoveIn}
                    onChange={e => setMoveInDate(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Number of Months</label>
                  <select
                    value={numMonths || ''}
                    onChange={e => setNumMonths(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {monthOptions.map(n => <option key={n} value={n}>{n} month{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>

              {moveOutDate && (
                <div style={{ marginTop: 14, background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#1565C0', fontWeight: 600 }}>
                  📅 Move-out date: <strong>{fmtLong(moveOutDate)}</strong>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            {moveInDate && numMonths > 0 && (
              <div style={CARD}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Price Breakdown</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>First month rent</span>
                  <span style={{ fontWeight: 600 }}>${monthlyRent.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>Security deposit (refundable)</span>
                  <span style={{ fontWeight: 600 }}>${deposit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 800, color: '#1565C0', borderBottom: '2px solid #E3F2FD' }}>
                  <span>Total due today</span>
                  <span>${totalDueToday.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>Monthly payment after</span>
                  <span style={{ fontWeight: 600 }}>${monthlyRent.toFixed(2)}/month</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>Total rental period</span>
                  <span style={{ fontWeight: 600 }}>{numMonths} month{numMonths !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>Move-out date</span>
                  <span style={{ fontWeight: 600 }}>{fmtLong(moveOutDate)}</span>
                </div>
              </div>
            )}

            {/* Monthly Payment Schedule */}
            {schedule.length > 0 && (
              <div style={CARD}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Monthly Payment Schedule</h3>
                {schedule.map(m => (
                  <div key={m.monthNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                    <span style={{ color: '#555' }}>Month {m.monthNumber}</span>
                    <span style={{ fontWeight: 600, color: m.paid ? '#2E7D32' : '#1a1a1a' }}>
                      {m.paid ? `Already paid (${fmtLong(m.dueDate)})` : `Due ${fmtLong(m.dueDate)} — $${Number(m.amount).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Policy */}
            {moveInDate && numMonths > 0 && (
              <div style={CARD}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 16 }}>Payment Policy</h3>
                <div style={{ background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#333', lineHeight: 1.9 }}>
                  📅 Monthly rent due on the <strong>{rentDueDay}</strong> of each month<br />
                  ⏳ Grace period: <strong>{gracePeriodDays} day{gracePeriodDays !== 1 ? 's' : ''}</strong><br />
                  ⚠️ Late payment fee: <strong>${latePaymentFee.toFixed(2)} per day</strong> after grace period
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
              {canContinue ? `Continue — ${numMonths} month${numMonths !== 1 ? 's' : ''} →` : 'Select a move-in date'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
