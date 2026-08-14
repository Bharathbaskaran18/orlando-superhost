import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../utils/api';
import { CarStepBar, CarHeroCard } from './CarHeroCard';
import { useAuth } from '../../context/AuthContext';
import LoginPromptModal from '../../components/LoginPromptModal';

// ── operational hours: 8:00 AM – 6:00 PM, 30-min intervals ──────────────────
const TIMES = Array.from({ length: 21 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30;
  const h  = Math.floor(totalMin / 60);
  const m  = totalMin % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return {
    value: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
    label: `${dh}:${String(m).padStart(2,'0')} ${ap}`,
  };
});

function is48HoursAhead(date, timeStr) {
  if (!date) return false;
  const d = new Date(date);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return (d - new Date()) >= 48 * 60 * 60 * 1000;
}

// ── constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── styles ────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeIn  { from{opacity:0}                       to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

  .dp-day { cursor:pointer; user-select:none; }
  .dp-day:hover .dp-num { background:#F0F4F8 !important; }
  .dp-sel:hover  .dp-num { background:#1565C0 !important; }
  .dp-disabled   { cursor:default !important; }
  .dp-disabled .dp-num { color:#D0D5DD !important; }
  .dp-disabled:hover .dp-num { background:transparent !important; }

  .dp-booked   { cursor:not-allowed !important; }
  .dp-booked .dp-num { background:#FFEBEE !important; color:#E53935 !important; }
  .dp-booked:hover .dp-num { background:#FFCDD2 !important; }

  .dp-partial .dp-num { background:#FFF3E0 !important; color:#E65100 !important; }
  .dp-partial:hover .dp-num { background:#FFE0B2 !important; }

  .dp-nav-btn:hover { background:#F0F4F8 !important; }

  .dp-select:focus { border-color:#1565C0 !important; outline:none; }

  @media(max-width:640px) {
    .dp-cal-row { flex-direction:column !important; }
    .dp-cal-sep { display:none !important; }
    .dp-time-row { flex-direction:column !important; gap:12px !important; }
  }
`;

// ── booked-date helpers ───────────────────────────────────────────────────────

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const toDateStr = d =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Returns 'full' | 'partial' | null
function getDateStatus(date, bookedRanges) {
  if (!bookedRanges || !bookedRanges.length) return null;
  const dStr = toDateStr(date);
  for (const r of bookedRanges) {
    if (dStr >= r.pickup_date && dStr < r.return_date) return 'full';
    if (dStr === r.return_date)
      return r.partial_available_time ? 'partial' : 'full';
  }
  return null;
}

function fmtMinTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function rangeContainsBooked(start, end, bookedRanges) {
  if (!bookedRanges || !bookedRanges.length) return false;
  for (const r of bookedRanges) {
    const pickup = parseLocalDate(r.pickup_date);
    const ret    = parseLocalDate(r.return_date);
    if (pickup < end && ret > start) return true;
  }
  return false;
}

function firstBookedAfter(fromDate, bookedRanges) {
  if (!bookedRanges || !bookedRanges.length || !fromDate) return null;
  let earliest = null;
  for (const r of bookedRanges) {
    const pickup = parseLocalDate(r.pickup_date);
    if (pickup > fromDate && (!earliest || pickup < earliest)) earliest = pickup;
  }
  return earliest;
}

function getPartialTime(date, bookedRanges) {
  if (!bookedRanges) return null;
  const dStr = toDateStr(date);
  for (const r of bookedRanges) {
    if (dStr === r.return_date && r.partial_available_time) return r.partial_available_time;
  }
  return null;
}

// ── MonthGrid ─────────────────────────────────────────────────────────────────
function MonthGrid({ year, month, pickupDate, returnDate, hoverDate, minDate, bookedRanges, onDateClick, onDateHover }) {
  const today = new Date(); today.setHours(0,0,0,0);

  const firstDOW   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [...Array(firstDOW).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // Cap hover preview at the day before the first booked date after pickup
  let cappedHover = hoverDate;
  if (pickupDate && hoverDate && bookedRanges && bookedRanges.length) {
    const nextBooked = firstBookedAfter(pickupDate, bookedRanges);
    if (nextBooked && hoverDate >= nextBooked) {
      const dayBefore = new Date(nextBooked.getTime() - 86400000);
      cappedHover = dayBefore > pickupDate ? dayBefore : null;
    }
  }

  const effectiveReturn = returnDate || (pickupDate && cappedHover && cappedHover > pickupDate ? cappedHover : null);

  return (
    <div style={{ flex:1, minWidth:0 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
        <thead>
          <tr>
            {DAYS.map(d => (
              <th key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'#9AA5B8', paddingBottom:10, letterSpacing:.3 }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, wi) => (
            <tr key={wi}>
              {cells.slice(wi * 7, wi * 7 + 7).map((date, di) => {
                if (!date) return <td key={di} />;

                const disabled    = date < minDate;
                const dateStatus  = !disabled ? getDateStatus(date, bookedRanges) : null;
                const isFullBlock = dateStatus === 'full';
                const isPartial   = dateStatus === 'partial';
                const isToday     = date.toDateString() === today.toDateString();
                const isPickup    = pickupDate && date.toDateString() === pickupDate.toDateString();
                const isReturn    = returnDate && date.toDateString() === returnDate.toDateString();
                const isHoverEnd  = !returnDate && cappedHover && pickupDate && date.toDateString() === cappedHover.toDateString() && cappedHover > pickupDate;
                const isSelected  = isPickup || isReturn;
                const inRange     = !isFullBlock && !isPartial && pickupDate && effectiveReturn && date > pickupDate && date < effectiveReturn;

                const isRangeStart = isPickup && effectiveReturn && !isReturn;
                const isRangeEnd   = (isReturn || isHoverEnd) && pickupDate && !isPickup;

                let cellBg = 'transparent';
                if (inRange)       cellBg = '#E3F2FD';
                if (isRangeStart)  cellBg = 'linear-gradient(to right, transparent 50%, #E3F2FD 50%)';
                if (isRangeEnd)    cellBg = 'linear-gradient(to left,  transparent 50%, #E3F2FD 50%)';

                const showNavy     = isSelected || (isHoverEnd && !returnDate);
                const notClickable = disabled || isFullBlock;

                return (
                  <td
                    key={di}
                    className={[
                      'dp-day',
                      disabled   ? 'dp-disabled' : '',
                      isFullBlock && !disabled ? 'dp-booked' : '',
                      isPartial && !isSelected  ? 'dp-partial' : '',
                      isSelected ? 'dp-sel' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ padding:'2px 0', background: (isFullBlock || isPartial) ? 'transparent' : cellBg }}
                    onClick={notClickable ? undefined : () => onDateClick(date)}
                    onMouseEnter={notClickable ? undefined : () => onDateHover(date)}
                    onMouseLeave={() => onDateHover(null)}
                  >
                    <div
                      className="dp-num"
                      style={{
                        width:36, height:36, margin:'0 auto',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        borderRadius:'50%',
                        background: showNavy ? '#1565C0' : 'transparent',
                        color: showNavy ? 'white' : disabled ? '#D0D5DD' : '#1a1a1a',
                        fontWeight: showNavy ? 700 : 400,
                        fontSize:13, position:'relative',
                        transition:'background .12s ease',
                      }}
                    >
                      {date.getDate()}
                      {isToday && !isSelected && !isFullBlock && !isPartial && (
                        <span style={{ position:'absolute', bottom:4, left:'50%', transform:'translateX(-50%)', width:3, height:3, background:'#F57C00', borderRadius:'50%', display:'block' }} />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function CarRentalDatePicker() {
  const { carId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const minPickup = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 48);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const [pickupDate,   setPickupDate]   = useState(null);
  const [pickupTime,   setPickupTime]   = useState('09:00');
  const [returnDate,   setReturnDate]   = useState(null);
  const [returnTime,   setReturnTime]   = useState('17:00');
  const [hoverDate,    setHoverDate]    = useState(null);
  const [error,        setError]        = useState('');
  const [viewYear,     setViewYear]     = useState(minPickup.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(minPickup.getMonth());
  const [car,          setCar]          = useState(location.state?.car || null);
  const [loading,      setLoading]      = useState(!location.state?.car);
  const [bookedRanges,        setBookedRanges]        = useState([]);
  const [partialPickupMinTime, setPartialPickupMinTime] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (!carId) return;
    api.get(`/api/cars/${carId}`)
      .then(r => setCar(r.data))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false));
  }, [carId]);

  useEffect(() => {
    if (!carId) return;
    api.get(`/api/car-rental/cars/${carId}/booked-dates`)
      .then(r => setBookedRanges(r.data))
      .catch(() => {});
  }, [carId]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!car) return null;

  // ── filtered pickup times when partial date selected ──
  const availablePickupTimes = partialPickupMinTime
    ? TIMES.filter(t => t.value >= partialPickupMinTime)
    : TIMES;

  // ── derived values (unchanged) ──
  const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
  const totalDays     = pickupDate && returnDate ? Math.max(1, Math.round((returnDate - pickupDate) / (1000 * 60 * 60 * 24))) : 0;
  const dailyRate     = rp(car.price_per_day);
  const rentalCost    = rp(dailyRate * totalDays);
  const depositAmount = rp(car.deposit_amount || 0);
  const totalAmount   = rp(rentalCost + depositAmount);
  const hasSelection  = !!(pickupDate && returnDate);

  // ── handleContinue (unchanged validation) ──
  const handleContinue = () => {
    setError('');
    if (!pickupDate) return setError('Please select a pickup date.');
    if (!returnDate) return setError('Please select a return date.');
    if (returnDate < pickupDate) return setError('Return date must be on or after the pickup date.');
    if (!is48HoursAhead(pickupDate, pickupTime)) return setError('Booking must be made at least 48 hours before pickup time.');
    if (!user) { setShowLoginPrompt(true); return; }
    navigate(`/car-rental/book/${carId}/details`, {
      state: {
        car,
        pickupDate:  pickupDate.toISOString().split('T')[0],
        pickupTime,
        returnDate:  returnDate.toISOString().split('T')[0],
        returnTime,
        totalDays,
        rentalCost,
        depositAmount,
        totalAmount,
      },
    });
  };

  // ── Airbnb-style click logic ──
  const handleDateClick = (date) => {
    if (!pickupDate || returnDate || date <= pickupDate) {
      const minTime = getPartialTime(date, bookedRanges);
      setPickupDate(date);
      setReturnDate(null);
      setPartialPickupMinTime(minTime);
      if (minTime && pickupTime < minTime) setPickupTime(minTime);
      setError('');
    } else {
      if (rangeContainsBooked(pickupDate, date, bookedRanges)) {
        setError('Your selected date range includes dates that are already booked. Please select dates that do not overlap with the highlighted red dates.');
        return;
      }
      setReturnDate(date);
      setError('');
    }
  };

  // ── month navigation ──
  const canPrev = new Date(viewYear, viewMonth, 1) > new Date(minPickup.getFullYear(), minPickup.getMonth(), 1);

  const goPrev = () => {
    if (!canPrev) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── helpers ──
  const fmtDate = (d) => d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null;
  const pickupLabel = TIMES.find(t => t.value === pickupTime)?.label;
  const returnLabel = TIMES.find(t => t.value === returnTime)?.label;

  const navBtn = (onClick, disabled, char) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="dp-nav-btn"
      style={{
        width:36, height:36, borderRadius:'50%',
        border:'1.5px solid #E0E7F0',
        background: disabled ? '#FAFAFA' : 'white',
        color: disabled ? '#D0D5DD' : '#1565C0',
        fontSize:18, cursor: disabled ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'inherit', transition:'background .15s', lineHeight:1,
      }}
    >
      {char}
    </button>
  );

  return (
    <div style={{
      minHeight:'100vh',
      backgroundImage:"url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80')",
      backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed',
      position:'relative',
    }}>
      <style>{CSS}</style>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,20,0.65)', zIndex:0, pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        <div className="container" style={{ maxWidth:860, animation:'fadeIn .35s ease' }}>

          {/* breadcrumb */}
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginBottom:16 }}>
            <Link to="/" style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>Home</Link>
            {' › '}Rent a Car{' › '}
            <span style={{ color:'white', fontWeight:600 }}>Select Dates</span>
          </p>

          <CarStepBar currentStep={1} />
          <CarHeroCard car={car} />

          {/* ── single white card ── */}
          <div style={{ background:'white', borderRadius:24, padding:'32px 36px 28px', boxShadow:'0 4px 40px rgba(0,0,20,0.2)', animation:'slideUp .4s ease' }}>

            {/* header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:2.5, color:'#F57C00', textTransform:'uppercase', marginBottom:4 }}>Renting</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#1565C0', letterSpacing:-0.3 }}>{car.year} {car.make} {car.model}</div>
                <div style={{ fontSize:13, color:'#9AA5B8', marginTop:2 }}>{car.fuel_type} · {car.seats} seats</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#0D2B6B', marginTop:4 }}>${Number(car.price_per_day).toFixed(2)}<span style={{ fontSize:12, fontWeight:600, color:'#9AA5B8' }}>/day</span></div>
              </div>
              <div style={{ background:'#F0F7FF', borderRadius:10, padding:'9px 14px', fontSize:12, color:'#1565C0', fontWeight:500, lineHeight:1.4 }}>
                ⏰ Pickup must be at least<br /><strong>48 hours from now</strong>
              </div>
            </div>

            {/* ── calendar nav ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              {navBtn(goPrev, !canPrev, '‹')}
              <span style={{ fontSize:15, fontWeight:700, color:'#1565C0' }}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              {navBtn(goNext, false, '›')}
            </div>

            {/* ── single month ── */}
            <MonthGrid
              year={viewYear} month={viewMonth}
              pickupDate={pickupDate} returnDate={returnDate} hoverDate={hoverDate}
              minDate={minPickup} bookedRanges={bookedRanges}
              onDateClick={handleDateClick} onDateHover={setHoverDate}
            />

            {/* calendar legend */}
            {bookedRanges.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#666' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:'#FFEBEE', border:'1px solid #FFCDD2' }} />
                  Unavailable
                </div>
                {bookedRanges.some(r => r.partial_available_time) && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#666' }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', background:'#FFF3E0', border:'1px solid #FFE0B2' }} />
                    Limited hours
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#666' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:'#1565C0' }} />
                  Selected
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#666' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:'#E3F2FD', border:'1px solid #BBDEFB' }} />
                  In range
                </div>
              </div>
            )}

            {/* selected dates pill row */}
            {(pickupDate || returnDate) && (
              <div style={{ display:'flex', gap:12, marginTop:20, padding:'14px 18px', background:'#F8FAFF', borderRadius:12, border:'1px solid #E8ECF0', animation:'fadeIn .2s ease' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#9AA5B8', textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>Pickup</div>
                  <div style={{ fontSize:14, fontWeight:700, color: pickupDate ? '#1565C0' : '#C0C8D8' }}>{pickupDate ? fmtDate(pickupDate) : 'Select date'}</div>
                  {pickupDate && <div style={{ fontSize:12, color:'#9AA5B8', marginTop:1 }}>{pickupLabel}</div>}
                </div>
                <div style={{ color:'#F57C00', fontWeight:800, fontSize:18, display:'flex', alignItems:'center' }}>→</div>
                <div style={{ flex:1, textAlign:'right' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#9AA5B8', textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>Return</div>
                  <div style={{ fontSize:14, fontWeight:700, color: returnDate ? '#1565C0' : '#C0C8D8' }}>{returnDate ? fmtDate(returnDate) : 'Select date'}</div>
                  {returnDate && <div style={{ fontSize:12, color:'#9AA5B8', marginTop:1 }}>{returnLabel}</div>}
                </div>
              </div>
            )}

            {/* partial pickup note */}
            {partialPickupMinTime && (
              <div style={{ marginTop:12, background:'#FFF3E0', border:'1px solid #FFE0B2', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#E65100', fontWeight:500, animation:'fadeIn .2s ease' }}>
                ⏰ Limited availability — pickup must be at or after <strong>{fmtMinTime(partialPickupMinTime)}</strong> due to a 3-hour gap requirement.
              </div>
            )}

            {/* ── divider ── */}
            <div style={{ height:1, background:'#F0F4F8', margin:'24px 0' }} />

            {/* ── time dropdowns ── */}
            <div className="dp-time-row" style={{ display:'flex', gap:20 }}>
              {[
                { label:'Pickup Time', value:pickupTime, set:setPickupTime, options: availablePickupTimes },
                { label:'Return Time', value:returnTime, set:setReturnTime, options: TIMES },
              ].map(({ label, value, set, options }) => (
                <div key={label} style={{ flex:1 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#9AA5B8', textTransform:'uppercase', letterSpacing:1.5, display:'block', marginBottom:8 }}>
                    {label}
                  </label>
                  <select
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="dp-select"
                    style={{
                      width:'100%', padding:'11px 14px', borderRadius:10,
                      border:'1.5px solid #E0E7F0', fontSize:14, fontWeight:500,
                      color:'#1a1a1a', background:'white', cursor:'pointer',
                      fontFamily:'inherit', transition:'border-color .15s',
                    }}
                  >
                    {options.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* ── price summary ── */}
            {hasSelection && (
              <div style={{ marginTop:20, background:'#F8FAFF', borderRadius:14, padding:'18px 20px', border:'1px solid #E3F2FD', animation:'fadeIn .3s ease' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'#555', marginBottom:8 }}>
                  <span>{totalDays} day{totalDays !== 1 ? 's' : ''} × ${dailyRate.toFixed(2)}/day</span>
                  <span style={{ fontWeight:600, color:'#1a1a1a' }}>${rentalCost.toFixed(2)}</span>
                </div>
                {depositAmount > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'#555', marginBottom:8 }}>
                    <span>🔐 Refundable deposit</span>
                    <span style={{ fontWeight:600, color:'#1a1a1a' }}>${depositAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ height:1, background:'#E3F2FD', margin:'12px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:19, fontWeight:800, color:'#1565C0' }}>
                  <span>Total Due Today</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                {depositAmount > 0 && (
                  <div style={{ fontSize:11, color:'#9AA5B8', marginTop:6, textAlign:'right' }}>
                    Deposit refunded within 48 hrs of return with no damage.
                  </div>
                )}
              </div>
            )}

            {/* ── error ── */}
            {error && (
              <div style={{ marginTop:16, background:'#FFEBEE', border:'1px solid #FFCDD2', color:'#C62828', fontSize:13, borderRadius:10, padding:'10px 14px', fontWeight:500, animation:'fadeIn .2s ease' }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── continue ── */}
            <button
              onClick={handleContinue}
              style={{
                width:'100%', marginTop:20, padding:'16px 24px',
                background: hasSelection ? '#F57C00' : '#EBEBEB',
                color: hasSelection ? 'white' : '#ABABAB',
                border:'none', borderRadius:14,
                fontSize:16, fontWeight:800,
                cursor: hasSelection ? 'pointer' : 'not-allowed',
                fontFamily:'inherit', letterSpacing:.3,
                boxShadow: hasSelection ? '0 4px 18px rgba(245,124,0,0.35)' : 'none',
                transition:'all .2s ease',
              }}
              onMouseEnter={e => {
                if (!hasSelection) return;
                e.currentTarget.style.background = '#E65100';
                e.currentTarget.style.transform  = 'translateY(-1px)';
                e.currentTarget.style.boxShadow  = '0 8px 28px rgba(245,124,0,0.45)';
              }}
              onMouseLeave={e => {
                if (!hasSelection) return;
                e.currentTarget.style.background = '#F57C00';
                e.currentTarget.style.transform  = 'translateY(0)';
                e.currentTarget.style.boxShadow  = '0 4px 18px rgba(245,124,0,0.35)';
              }}
            >
              {hasSelection ? 'Continue to Your Details →' : 'Select Dates to Continue'}
            </button>

          </div>{/* end card */}
        </div>
      </div>

      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectTo={`/car-rental/book/${carId}`}
      />
    </div>
  );
}
