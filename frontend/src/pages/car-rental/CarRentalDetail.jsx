import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api, { API_URL } from '../../utils/api';
import { CarStepBar, CarHeroCard } from './CarHeroCard';
import { formatDate, formatTime } from '../../utils/dateHelper';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const STRIPE_EL_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      color: '#1a1a1a',
      '::placeholder': { color: '#9AA5B8' },
    },
    invalid: { color: '#E53935' },
  },
};

const STATUS = {
  payment_pending:          { label: 'Payment Pending',                        color: '#F57F17', bg: '#FFF9C4' },
  confirmed:                { label: 'Confirmed',                              color: '#1e7e34', bg: '#e6f4ea' },
  agreement_sent:           { label: 'Agreement Sent — Awaiting Your Signature', color: '#e65100', bg: '#fff3e0' },
  awaiting_admin_signature: { label: 'Awaiting Rep Signature',                  color: '#0277bd', bg: '#e1f5fe' },
  agreement_complete:       { label: 'Agreement Complete',                      color: '#0D2B6B', bg: '#e3f2fd' },
  active_car_out:           { label: '🚗 Active — Car Out',                    color: '#E65100', bg: '#FFF3E0' },
  returned:                 { label: 'Returned',                               color: '#2e7d32', bg: '#e8f5e9' },
  completed:                { label: 'Completed',                              color: '#0D2B6B', bg: '#e3f2fd' },
  completed_with_charges:   { label: 'Completed — Extra Charged',              color: '#E65100', bg: '#FFF3E0' },
  cancelled:                { label: 'Cancelled',                              color: '#c62828', bg: '#fce8e6' },
  auto_cancelled:           { label: 'Cancelled — Agreement Not Signed',       color: '#c62828', bg: '#fce8e6' },
};

const fmtDate = formatDate;
const fmtTime = formatTime;

const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';
const opt = (v) => v != null && v !== '' ? String(v) : '—';


// ── Stripe Payment Form ───────────────────────────────────────────────────────

function StripeCardInner({ booking, clientSecret, onSuccess }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const navigate   = useNavigate();
  const [paying,   setPaying]   = useState(false);
  const [payError, setPayError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [focused,  setFocused]  = useState('');
  const timerRef = useRef(null);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError('');
    try {
      const cardEl = elements.getElement(CardNumberElement);
      const { paymentIntent, error: stripeErr } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: { name: booking.customer_full_name },
        },
      });
      if (stripeErr) {
        setPayError(stripeErr.message || 'Payment failed. Please check your card details.');
        return;
      }
      if (!['requires_capture', 'succeeded'].includes(paymentIntent?.status)) {
        setPayError('Payment was not completed. Please try again.');
        return;
      }
      await api.post(`/api/car-rental/bookings/${booking.id}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      });
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        setPayError('Sorry! This car was just booked by someone else. Please select different dates or choose another car.');
        setCountdown(3);
        let secs = 3;
        timerRef.current = setInterval(() => {
          secs -= 1;
          setCountdown(secs);
          if (secs <= 0) { clearInterval(timerRef.current); navigate('/'); }
        }, 1000);
      } else {
        setPayError(err.response?.data?.error || 'Payment confirmation failed. Please contact support.');
      }
    } finally {
      setPaying(false);
    }
  };

  const elBox = (focused === 'num' || focused === 'exp' || focused === 'cvc')
    ? (f) => ({
        border: `1.5px solid ${focused === f ? '#1565C0' : '#E0E7F0'}`,
        borderRadius: 10, padding: '13px 14px', background: 'white',
        boxShadow: focused === f ? '0 0 0 3px rgba(21,101,192,0.10)' : 'none',
        transition: 'all .15s',
      })
    : () => ({ border: '1.5px solid #E0E7F0', borderRadius: 10, padding: '13px 14px', background: 'white' });

  return (
    <form onSubmit={handlePay}>
      {/* Price breakdown */}
      <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '16px 18px', marginBottom: 20, border: '1px solid #E3F2FD' }}>
        <div style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 10, fontSize: 14 }}>Payment Breakdown</div>
        <div className="summary-box">
          <div className="summary-row">
            <span>Rental ({booking.total_days} day{booking.total_days !== 1 ? 's' : ''} × {money(booking.daily_rate)})</span>
            <span>{money(booking.rental_cost)}</span>
          </div>
          {Number(booking.deposit_amount) > 0 && (
            <div className="summary-row">
              <span>Security Deposit (refundable)</span>
              <span>{money(booking.deposit_amount)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Total to Authorize Now</span>
            <span>{money(booking.total_amount)}</span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#6b6b6b', marginTop: 8, marginBottom: 0 }}>
          Security deposit will be refunded within 48 hours after vehicle return with no damage.
          Payment is authorized (held) now — not charged until car is returned.
        </p>
      </div>

      {/* Cancellation policy */}
      <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
        <strong style={{ color: '#e65100' }}>Cancellation Policy</strong>
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 18px', lineHeight: 1.9, color: '#5d4037' }}>
          <li>Cancel more than 24 hours before pickup — full refund</li>
          <li>Cancel less than 24 hours before pickup — no refund</li>
          <li>No show — no refund</li>
        </ul>
      </div>

      {/* Card brand icons + credit card note */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1565C0' }}>Card Details</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#888', marginRight: 4 }}>Credit card only</span>
          {['VISA','MC','AMEX'].map(b => (
            <span key={b} style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, border: '1px solid #E0E7F0', color: '#555', background: '#FAFAFA', letterSpacing: .3 }}>{b}</span>
          ))}
        </div>
      </div>

      {/* Card number */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#9AA5B8', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 6 }}>Card Number</label>
        <div style={elBox('num')}>
          <CardNumberElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('num')} onBlur={() => setFocused('')} />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9AA5B8', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 6 }}>Expiry Date</label>
          <div style={elBox('exp')}>
            <CardExpiryElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('exp')} onBlur={() => setFocused('')} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9AA5B8', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 6 }}>CVV</label>
          <div style={elBox('cvc')}>
            <CardCvcElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('cvc')} onBlur={() => setFocused('')} />
          </div>
        </div>
      </div>

      {payError && (
        <div style={{ marginBottom: 14, background: '#FFEBEE', border: '1.5px solid #FFCDD2', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ color: '#b71c1c', fontWeight: 700, fontSize: 14 }}>⚠️ {payError}</div>
          {countdown !== null && (
            <div style={{ color: '#c62828', fontSize: 13, marginTop: 4 }}>
              Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || paying || countdown !== null}
        style={{
          width: '100%', padding: '16px 24px', border: 'none', borderRadius: 12,
          background: paying ? '#BDBDBD' : '#1565C0',
          color: 'white', fontSize: 16, fontWeight: 800,
          cursor: paying ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', letterSpacing: .3,
          boxShadow: paying ? 'none' : '0 4px 18px rgba(21,101,192,0.35)',
          transition: 'all .2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {paying ? (
          <>
            <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Authorizing…
          </>
        ) : `Authorize ${money(booking.total_amount)}`}
      </button>

      {/* Stripe badge */}
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#9AA5B8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="2" stroke="#9AA5B8" strokeWidth="1.3"/><path d="M5 4V3a2 2 0 0 1 4 0v1" stroke="#9AA5B8" strokeWidth="1.3" strokeLinecap="round"/></svg>
        Secured by <strong style={{ color: '#6772E5' }}>Stripe</strong>
      </div>
    </form>
  );
}

function StripePaymentForm({ booking, onSuccess }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loadingPI,    setLoadingPI]    = useState(true);
  const [piError,      setPiError]      = useState('');

  useEffect(() => {
    if (!stripePromise) { setPiError('Payment processing is not configured.'); setLoadingPI(false); return; }
    api.post(`/api/car-rental/bookings/${booking.id}/payment-intent`)
      .then(r => setClientSecret(r.data.clientSecret))
      .catch(err => setPiError(err.response?.data?.error || 'Failed to initialize payment. Please refresh and try again.'))
      .finally(() => setLoadingPI(false));
  }, [booking.id]);

  if (loadingPI) return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E3F2FD', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
      <div style={{ fontSize: 13, color: '#888' }}>Initializing payment…</div>
    </div>
  );
  if (piError) return <div style={{ background: '#FFEBEE', borderRadius: 10, padding: '14px 18px', color: '#C62828', fontWeight: 600, fontSize: 14 }}>⚠️ {piError}</div>;
  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise}>
      <StripeCardInner booking={booking} clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}

// ── Agreement Signing Form ────────────────────────────────────────────────────

function AgreementSignForm({ booking, onSigned }) {
  const [signatureName, setSignatureName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signatureName.trim()) { setSignError('Please enter your full name.'); return; }
    setSigning(true);
    setSignError('');
    try {
      await api.post(`/api/car-rental/bookings/${booking.id}/sign`, { signatureName: signatureName.trim() });
      onSigned();
    } catch (err) {
      setSignError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div>
      {booking.rental_agreement_pdf && (
        <div style={{ background: '#E3F2FD', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0D2B6B' }}>Orlando Travels Inc. — Vehicle Rental Agreement</div>
            <div style={{ fontSize: 13, color: '#555' }}>Please read all 13 pages before signing</div>
          </div>
          <a href={`${API_URL}/uploads/${booking.rental_agreement_pdf}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            Read Agreement
          </a>
        </div>
      )}

      <form onSubmit={handleSign}>
        <div style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 4, marginTop: 0 }}>Digital Signature</h4>
          <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 14 }}>
            Type your full legal name. This acts as your digital signature and will be added to page 13 of the rental agreement.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Full Legal Name *</label>
            <input
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="Type your full name exactly as on your ID"
              required
              style={{ fontSize: 16, fontStyle: 'italic' }}
            />
          </div>
        </div>

        <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#5d4037' }}>
          By clicking "Sign Agreement", you confirm that you have read all 13 pages of the rental agreement and agree to all terms and conditions set out by Orlando Travels Inc.
        </div>

        {signError && <div className="form-error" style={{ marginBottom: 12 }}>{signError}</div>}

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={signing || !signatureName.trim()}>
          {signing ? 'Signing...' : 'Sign Agreement'}
        </button>
      </form>
    </div>
  );
}

// ── Celebration animation ─────────────────────────────────────────────────────

const CELEB_CSS = `
  @keyframes celebBounce {
    0%   { transform: scale(0);    opacity: 0; }
    60%  { transform: scale(1.2);  opacity: 1; }
    80%  { transform: scale(0.95); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes celebDraw {
    from { stroke-dashoffset: 70; }
    to   { stroke-dashoffset: 0;  }
  }
  @keyframes celebPulse {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.8); opacity: 0;   }
  }
  @keyframes celebFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes celebSlideUp {
    from { opacity: 0; transform: translateY(44px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes celebStar {
    0%   { opacity: 0; transform: scale(0)   rotate(0deg);   }
    40%  { opacity: 1; transform: scale(1.4) rotate(160deg); }
    100% { opacity: 0; transform: scale(0)   rotate(360deg); }
  }
`;

function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const startRef  = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#0D2B6B','#F57C00','#2E7D32','#FFFFFF','#FDD835','#FF9800','#1565C0','#43A047','#E91E63'];
    const pieces = Array.from({ length: 150 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     -(Math.random() * window.innerHeight * 0.6),
      size:   6 + Math.random() * 10,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      speed:  2 + Math.random() * 4.5,
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.14,
      drift:  (Math.random() - 0.5) * 2,
      shape: ['rect','circle','triangle'][Math.floor(Math.random() * 3)],
    }));

    const DURATION = 4500;

    const draw = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const fade     = progress > 0.8 ? (1 - progress) / 0.2 : 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach(p => {
        p.y     += p.speed;
        p.x     += p.drift;
        p.angle += p.spin;
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }

        ctx.save();
        ctx.globalAlpha = 0.88 * fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      if (progress < 1) animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:10000 }} />;
}

const SPARKLE_POS = [
  { top:-28, left:64,    delay:'1.0s', color:'#FDD835' },
  { top:-20, left:-26,   delay:'1.1s', color:'#F57C00' },
  { top:34,  right:-30,  delay:'1.2s', color:'#43A047' },
  { bottom:6, left:-30,  delay:'1.3s', color:'#FDD835' },
  { bottom:-14, right:-8,delay:'1.4s', color:'#F57C00' },
];

function CelebrationOverlay({ booking, onDismiss }) {
  const navigate = useNavigate();
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(5,10,30,0.93)',
      zIndex:9998,
      display:'flex', alignItems:'center', justifyContent:'center',
      overflowY:'auto', padding:'20px 16px',
    }}>
      <style>{CELEB_CSS}</style>

      <div style={{ textAlign:'center', maxWidth:460, width:'100%' }}>

        {/* ── Check circle ── */}
        <div style={{ position:'relative', display:'inline-block', width:80, height:80, marginBottom:28 }}>
          {[0, 0.65].map((delay, i) => (
            <div key={i} style={{
              position:'absolute', inset:-10, borderRadius:'50%',
              border:'2.5px solid #4CAF50',
              animation:`celebPulse 2.2s ease-out ${delay}s infinite`,
            }} />
          ))}
          <div style={{ animation:'celebBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 0.2s both' }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ display:'block' }}>
              <circle cx="40" cy="40" r="39" fill="#4CAF50" />
              <circle cx="40" cy="40" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
              <polyline
                points="18,42 32,56 62,24"
                fill="none" stroke="white" strokeWidth="5.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray:70, strokeDashoffset:70, animation:'celebDraw 0.5s ease 0.8s both' }}
              />
            </svg>
          </div>
          {SPARKLE_POS.map((p, i) => {
            const { delay, color, ...pos } = p;
            return (
              <div key={i} style={{ position:'absolute', fontSize:15, color, animation:`celebStar 1.6s ease ${delay} infinite`, ...pos }}>✦</div>
            );
          })}
        </div>

        {/* ── Text ── */}
        <div style={{ fontSize:32, fontWeight:800, color:'white', marginBottom:8, animation:'celebFadeUp 0.5s ease 0.9s both' }}>
          🎉 Congratulations!
        </div>
        <div style={{ fontSize:18, fontWeight:600, color:'#A5D6A7', marginBottom:6, animation:'celebFadeUp 0.5s ease 1.1s both' }}>
          Your car booking is confirmed!
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:28, animation:'celebFadeUp 0.5s ease 1.2s both' }}>
          A confirmation email has been sent to {booking.customer_email}
        </div>

        {/* ── Booking details card ── */}
        <div style={{
          background:'white', borderRadius:20, padding:'24px 26px',
          boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
          marginBottom:24, textAlign:'left',
          animation:'celebSlideUp 0.55s ease 1.2s both',
        }}>
          <div style={{ textAlign:'center', marginBottom:18, paddingBottom:18, borderBottom:'1px solid #F0F0F0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:1, marginBottom:5 }}>Booking ID</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#0D2B6B', letterSpacing:-1 }}>
              #{String(booking.id).padStart(6,'0')}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, paddingBottom:18, borderBottom:'1px solid #F5F5F5' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0D2B6B,#1565C0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🚗</div>
            <div>
              <div style={{ fontWeight:800, color:'#0D2B6B', fontSize:16 }}>{booking.year} {booking.make} {booking.model}</div>
              <div style={{ fontSize:13, color:'#888' }}>{booking.city_name}, {booking.state_name}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Pickup', date:booking.pickup_date, time:booking.pickup_time },
              { label:'Return', date:booking.return_date, time:booking.return_time },
            ].map(({ label, date, time }) => (
              <div key={label} style={{ background:'#F8F9FF', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                <div style={{ fontWeight:700, color:'#0D2B6B', fontSize:14 }}>{fmtDate(date)}</div>
                <div style={{ fontSize:12, color:'#666', marginTop:2 }}>{fmtTime(time)}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#0D2B6B,#1565C0)', borderRadius:12, padding:'14px 18px' }}>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, fontWeight:600 }}>Total Paid</div>
            <div style={{ color:'#F57C00', fontSize:22, fontWeight:800 }}>{money(booking.total_amount)}</div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'celebFadeUp 0.5s ease 1.8s both' }}>
          <button
            onClick={onDismiss}
            style={{
              padding:'15px 24px', background:'#F57C00', color:'#0D2B6B',
              border:'none', borderRadius:12, fontSize:16, fontWeight:800,
              cursor:'pointer', fontFamily:'inherit',
              boxShadow:'0 6px 24px rgba(245,124,0,0.5)',
            }}
          >
            View My Booking →
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding:'13px 24px', background:'transparent',
              border:'2px solid rgba(255,255,255,0.35)', color:'white',
              borderRadius:12, fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CarRentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking,         setBooking]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const load = () => {
    api.get(`/api/car-rental/my-bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => navigate('/car-rental/my-rentals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!booking) return null;

  const s = STATUS[booking.status] || { label: booking.status, color: '#555', bg: '#eee' };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <ConfettiCanvas active={showCelebration} />
      {showCelebration && (
        <CelebrationOverlay
          booking={booking}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container" style={{ maxWidth: 760 }}>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 16, marginTop: 8 }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>Home</Link>
        {' › '}<Link to="/car-rental/my-rentals" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>My Rentals</Link>
        {' › '}<span style={{ color: 'white', fontWeight: 600 }}>#{id}</span>
      </p>

      {booking.status === 'payment_pending' && <CarStepBar currentStep={3} />}
      <CarHeroCard car={{
        make: booking.make, model: booking.model, year: booking.year,
        fuel_type: booking.fuel_type, seats: booking.seats,
        photos: booking.car_photos,
        price_per_day: booking.daily_rate,
        deposit_amount: booking.deposit_amount,
      }} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {booking.year} {booking.make} {booking.model}
          </h1>
          <span style={{ background: s.bg, color: s.color, padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {s.label}
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{booking.city_name}, {booking.state_name}</p>
      </div>

      {/* Status banners */}
      {booking.status === 'payment_pending' && (
        <div style={{ background: '#E3F2FD', border: '1px solid #90caf9', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>💳 Complete Your Payment</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Your booking is saved. Please complete payment below to confirm your reservation.
          </p>
        </div>
      )}

      {booking.status === 'confirmed' && (
        <div style={{ background: '#e6f4ea', border: '1px solid #4caf50', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>✅ Booking Confirmed!</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Payment received. A receipt has been sent to your email. Your rental agreement will arrive by email before pickup.
          </p>
        </div>
      )}

      {booking.status === 'agreement_sent' && (() => {
        if (!booking.rental_agreement_sent_at) return (
          <div style={{ background: '#fff3e0', border: '1px solid #ffa726', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <strong>📄 Rental Agreement Ready — Please Sign</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>Your rental agreement has been sent. Please review and sign it below before your pickup date.</p>
          </div>
        );
        const deadline = new Date(booking.rental_agreement_sent_at).getTime() + 24 * 60 * 60 * 1000;
        const msLeft = deadline - Date.now();
        const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
        const minsLeft  = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
        const isUrgent  = hoursLeft < 6;
        const isCritical = hoursLeft < 2;
        return (
          <div style={{
            background: isCritical ? '#FFEBEE' : isUrgent ? '#FFF3E0' : '#fff3e0',
            border: `${isCritical ? '2px' : '1px'} solid ${isCritical ? '#FFCDD2' : '#ffa726'}`,
            borderRadius: 10, padding: 16, marginBottom: 20,
          }}>
            {isUrgent ? (
              <>
                <strong style={{ color: isCritical ? '#b71c1c' : '#E65100', fontSize: 15 }}>
                  {isCritical ? '🚨' : '⚠️'} {isCritical ? 'Urgent:' : 'Action Required:'} Sign your rental agreement within{' '}
                  {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft} minutes`} or your booking will be cancelled
                </strong>
                <p style={{ margin: '8px 0 4px', fontSize: 13, color: isCritical ? '#b71c1c' : '#5d4037' }}>
                  Your booking will be <strong>automatically cancelled</strong> if the agreement is not signed in time.
                  A full refund will be issued, but you will lose your reserved dates.
                </p>
              </>
            ) : (
              <>
                <strong>📄 Rental Agreement Ready — Please Sign</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Your rental agreement has been sent. You have <strong>{hoursLeft}h {minsLeft}m</strong> to sign.
                  Please review and sign below before your pickup date.
                </p>
              </>
            )}
          </div>
        );
      })()}

      {booking.status === 'auto_cancelled' && (
        <div style={{ background: '#FFEBEE', border: '2px solid #FFCDD2', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong style={{ color: '#b71c1c' }}>⚠️ Booking Cancelled — Agreement Not Signed</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#b71c1c' }}>
            This booking was automatically cancelled because the rental agreement was not signed within 24 hours.
            A full refund will be processed to your original payment method within 48 hours.
            Please contact us at orlandosuperhost@gmail.com if you have any questions.
          </p>
        </div>
      )}

      {booking.status === 'awaiting_admin_signature' && (
        <div style={{ background: '#e1f5fe', border: '1px solid #4fc3f7', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>You Signed the Agreement</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Your signature was submitted on {fmtDate(booking.customer_signed_at)}. Orlando Travels Inc. is reviewing and signing the agreement — you will be notified when complete.
          </p>
        </div>
      )}

      {booking.status === 'agreement_complete' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #66bb6a', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>Agreement Fully Signed</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            The rental agreement has been signed by both you and Orlando Travels Inc. Please bring your driver's license to the pickup location.
          </p>
        </div>
      )}

      {booking.status === 'active_car_out' && (
        <div style={{ background: '#FFF3E0', border: '2px solid #FFCC80', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong style={{ color: '#E65100' }}>🚗 Your car is currently checked out</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Please return the vehicle by <strong>{(() => { if (!booking.return_date) return 'N/A'; const [y,m,d] = String(booking.return_date).slice(0,10).split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); })()}</strong> at <strong>{fmtTime(booking.return_time)}</strong>.
            Late returns are charged at $25/hour.
          </p>
        </div>
      )}

      {booking.status === 'returned' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #66bb6a', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>🚗 Vehicle Returned</strong>
          {booking.is_late_return && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#c62828' }}>
              Late return: {booking.late_return_hours} hour(s) — Late fee: {money(booking.late_return_fee)}
            </p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Deposit refund is being processed.
          </p>
        </div>
      )}

      {booking.status === 'completed' && (
        <div style={{ background: '#e3f2fd', border: '1px solid #64b5f6', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>✅ Booking Complete</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            {booking.deposit_refund_status === 'refunded'
              ? `Full deposit of ${money(booking.deposit_amount)} refunded.`
              : booking.deposit_refund_status === 'partial_refunded'
              ? `Partial deposit refund of ${money(booking.deposit_refunded_amount)} processed.`
              : `Deposit withheld.`}
          </p>
        </div>
      )}

      {booking.status === 'completed_with_charges' && (
        Number(booking.extra_charge_amount) > 0 ? (
          <div style={{ background: '#FFEBEE', border: '2px solid #FFCDD2', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <strong style={{ color: '#b71c1c', fontSize: 15 }}>⚠️ Additional Charge Applied</strong>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
              The damage and fees exceeded your security deposit. An additional charge of{' '}
              <strong style={{ color: '#c62828' }}>{money(booking.extra_charge_amount)}</strong> has been charged to your card on file.
              A detailed breakdown and email have been sent to you.
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff3e0', border: '1px solid #ffa726', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <strong>⚠️ Return Complete — Charges Applied</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Extra charges were applied to your deposit.
              {Number(booking.deposit_refunded_amount) > 0 && ` A refund of ${money(booking.deposit_refunded_amount)} will be returned within 48 hours.`}
            </p>
          </div>
        )
      )}

      {booking.status === 'cancelled' && (
        <div style={{ background: '#fce8e6', border: '1px solid #f44336', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <strong>❌ Booking Cancelled</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>This rental booking has been cancelled.</p>
        </div>
      )}

      {/* ── Return Summary (shown after return is processed) ── */}
      {['completed', 'completed_with_charges'].includes(booking.status) && booking.actual_return_date && (
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16, borderTop: `4px solid ${booking.status === 'completed_with_charges' ? '#F57C00' : '#2e7d32'}` }}>
          <h3 style={{ fontWeight: 800, color: '#0D2B6B', marginBottom: 18, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {booking.status === 'completed_with_charges' ? '⚠️' : '✅'} Return Summary
          </h3>

          {/* Return details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              ['Return Date', `${fmtDate(booking.actual_return_date)} at ${fmtTime(booking.actual_return_time)}`],
              ['Odometer at Return', booking.odometer_at_return != null ? `${booking.odometer_at_return} miles` : '—'],
              ['Fuel Level Returned', opt(booking.fuel_level_at_return)],
              ['Vehicle Condition', booking.condition_at_return],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#f8f9ff', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: label === 'Vehicle Condition' && value === 'Damaged' ? '#c62828' : '#0D2B6B' }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          {booking.damage_description && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#c62828', fontWeight: 700, marginBottom: 4 }}>DAMAGE NOTES</div>
              <div style={{ fontSize: 13, color: '#555' }}>{booking.damage_description}</div>
            </div>
          )}

          {/* Charges breakdown */}
          <div style={{ background: '#f8f9ff', borderRadius: 12, padding: 18, borderLeft: '4px solid #0D2B6B' }}>
            <div style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 14, marginBottom: 12 }}>Charges Breakdown</div>
            {[
              ['Rental Cost', money(booking.rental_cost), false],
              Number(booking.late_return_fee) > 0 && [`Late Fee (${booking.late_return_hours} hr${booking.late_return_hours !== 1 ? 's' : ''} × $25/hr)`, money(booking.late_return_fee), true],
              Number(booking.extra_mileage_fee) > 0 && [`Extra Mileage (${booking.extra_miles_driven} mi)`, money(booking.extra_mileage_fee), true],
              Number(booking.fuel_fee) > 0 && [`Fuel Fee`, money(booking.fuel_fee), true],
              Number(booking.damage_amount) > 0 && [`Damage / Repair Cost`, money(booking.damage_amount), true],
            ].filter(Boolean).map(([label, value, isCharge]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e8e8f0', fontSize: 13 }}>
                <span style={{ color: isCharge ? '#c62828' : '#555', paddingLeft: isCharge ? 12 : 0 }}>{label}</span>
                <span style={{ fontWeight: 700, color: isCharge ? '#c62828' : '#1a1a1a' }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #C5CAE9', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: '#555' }}>Security Deposit Held</span>
                <span style={{ fontWeight: 600 }}>{money(booking.deposit_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15, fontWeight: 800 }}>
                <span style={{ color: Number(booking.deposit_refunded_amount) > 0 ? '#2e7d32' : '#888' }}>
                  {Number(booking.deposit_refunded_amount) > 0 ? '💚 Deposit Refund' : 'No Refund'}
                </span>
                <span style={{ color: Number(booking.deposit_refunded_amount) > 0 ? '#2e7d32' : '#888' }}>
                  {money(booking.deposit_refunded_amount)}
                </span>
              </div>
              {Number(booking.extra_charge_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 15, fontWeight: 800, background: '#FFEBEE', borderRadius: 8, marginTop: 6, border: '1px solid #FFCDD2' }}>
                  <span style={{ color: '#b71c1c' }}>⚠️ Extra Amount Charged to Card</span>
                  <span style={{ color: '#b71c1c', fontSize: 17 }}>{money(booking.extra_charge_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Refund timeline */}
          {Number(booking.deposit_refunded_amount) > 0 && (
            <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 10, padding: '12px 16px', marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💸</span>
              <div>
                <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 14 }}>Refund of {money(booking.deposit_refunded_amount)}</div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>Your refund will be returned to your original payment method within <strong>48 hours</strong>.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rental Dates */}
      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14 }}>Rental Period</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Pickup</div>
            <div style={{ fontWeight: 700, color: '#0D2B6B' }}>{fmtDate(booking.pickup_date)}</div>
            <div style={{ fontSize: 13, color: '#555' }}>{fmtTime(booking.pickup_time)}</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Return</div>
            <div style={{ fontWeight: 700, color: '#0D2B6B' }}>{fmtDate(booking.return_date)}</div>
            <div style={{ fontSize: 13, color: '#555' }}>{fmtTime(booking.return_time)}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: '#555', fontWeight: 600 }}>
          Duration: {booking.total_days} day{booking.total_days !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Pricing */}
      {booking.status !== 'payment_pending' && (
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14 }}>Pricing</h3>
          <div className="summary-box">
            <div className="summary-row">
              <span>Daily Rate</span>
              <span>{money(booking.daily_rate)}/day</span>
            </div>
            <div className="summary-row">
              <span>Rental Cost ({booking.total_days} day{booking.total_days !== 1 ? 's' : ''})</span>
              <span>{money(booking.rental_cost)}</span>
            </div>
            {Number(booking.deposit_amount) > 0 && (
              <div className="summary-row">
                <span>Security Deposit</span>
                <span>{money(booking.deposit_amount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Paid</span>
              <span>{money(booking.total_amount)}</span>
            </div>
          </div>
          {booking.is_late_return && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#fce8e6', borderRadius: 8, fontSize: 13, color: '#c62828' }}>
              <strong>Late Return Fee:</strong> {booking.late_return_hours} hour(s) × $25.00 = {money(booking.late_return_fee)}
            </div>
          )}
        </div>
      )}

      {/* Payment form */}
      {booking.status === 'payment_pending' && (
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 4 }}>Step 3 — Complete Payment</h3>
          <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 20 }}>
            Your booking will be confirmed immediately after payment.
          </p>
          <StripePaymentForm
            booking={booking}
            onSuccess={() => {
              setBooking(b => ({ ...b, status: 'confirmed' }));
              setShowCelebration(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* Agreement Signing */}
      {booking.status === 'agreement_sent' && (
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 16, marginTop: 0 }}>Sign Rental Agreement</h3>
          <AgreementSignForm
            booking={booking}
            onSigned={() => {
              setBooking(b => ({ ...b, status: 'awaiting_admin_signature', customer_signed_at: new Date().toISOString() }));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* View agreement PDF (after it's been sent) */}
      {['agreement_sent', 'awaiting_admin_signature', 'agreement_complete', 'returned', 'completed'].includes(booking.status) && booking.rental_agreement_pdf && (
        <div style={{ background: '#E3F2FD', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0D2B6B' }}>
              {booking.status === 'agreement_complete' ? 'Fully Signed Rental Agreement' : 'Rental Agreement'}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              {booking.status === 'agreement_complete'
                ? `Signed by both parties — ${fmtDate(booking.admin_signed_at)}`
                : booking.customer_signed_at
                ? `Signed by you — ${fmtDate(booking.customer_signed_at)}`
                : 'Awaiting your signature'}
            </div>
          </div>
          <a href={`${API_URL}/uploads/${booking.rental_agreement_pdf}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            View PDF
          </a>
        </div>
      )}

      {/* Customer Info */}
      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14 }}>Renter Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Name', opt(booking.customer_full_name)],
            ['Email', opt(booking.customer_email)],
            ['Phone', opt(booking.customer_phone)],
            ['Date of Birth', booking.customer_dob ? fmtDate(booking.customer_dob) : '—'],
            ['Address', opt(booking.customer_address)],
          ].map(([label, value]) => (
            <div key={label} style={{ gridColumn: label === 'Address' ? '1/-1' : 'auto' }}>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, color: '#1a1a1a' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DL + Insurance */}
      {(booking.dl_number || booking.insurance_company) && (
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 10 }}>Driver's License</h4>
              {booking.dl_number && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Number:</strong> {booking.dl_number}</div>}
              {booking.dl_state && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>State:</strong> {booking.dl_state}</div>}
              {booking.dl_expiration && <div style={{ fontSize: 13 }}><strong>Expires:</strong> {fmtDate(booking.dl_expiration)}</div>}
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 10 }}>Insurance</h4>
              {booking.insurance_company && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Company:</strong> {booking.insurance_company}</div>}
              {booking.insurance_policy_number && <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Policy #:</strong> {booking.insurance_policy_number}</div>}
              {booking.insurance_covers_rental && <div style={{ fontSize: 13 }}><strong>Covers Rental:</strong> {booking.insurance_covers_rental}</div>}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Link to="/car-rental/my-rentals" style={{ color: '#1E88E5', fontSize: 14 }}>← Back to My Rentals</Link>
      </div>
    </div>
      </div>
    </div>
  );
}
