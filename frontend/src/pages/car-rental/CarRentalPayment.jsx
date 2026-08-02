import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../utils/api';
import { CarStepBar, CarHeroCard } from './CarHeroCard';
import { pendingDlPhoto, clearPendingDlPhoto } from './carRentalSession';

console.log('Stripe key loaded:', !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
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

const LS_KEY = 'carRentalFormData';

const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—';

function CarPaymentInner({ state, carId, dlPhoto }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [paying,    setPaying]    = useState(false);
  const [payError,  setPayError]  = useState('');
  const [countdown, setCountdown] = useState(null);
  const [focused,   setFocused]   = useState(null);
  const [cardName,  setCardName]  = useState(state.customerFullName || '');
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      clearInterval(timerRef.current);
      navigate(`/car-rental/book/${carId}`);
      return;
    }
  }, [countdown, navigate, carId]);

  const elWrap = (field) => ({
    border: `1.5px solid ${focused === field ? '#0D2B6B' : '#D0D7E3'}`,
    borderRadius: 10,
    padding: '13px 14px',
    background: '#fff',
    boxShadow: focused === field ? '0 0 0 3px rgba(13,43,107,0.12)' : 'none',
    transition: 'all 0.15s',
  });

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardNumberElement);
    if (!cardEl) { setPayError('Card details not ready. Please refresh.'); return; }

    setPaying(true);
    setPayError('');

    let bookingId = null;
    try {
      // Step 1: Create booking
      const fd = new FormData();
      fd.append('carId',        carId);
      fd.append('pickupDate',   state.pickupDate);
      fd.append('pickupTime',   state.pickupTime);
      fd.append('returnDate',   state.returnDate);
      fd.append('returnTime',   state.returnTime);
      fd.append('customerFullName',              state.customerFullName || '');
      fd.append('customerDob',                   state.customerDob || '');
      fd.append('customerAddress',               state.customerAddress || '');
      fd.append('customerPhone',                 state.customerPhone || '');
      fd.append('customerEmail',                 state.customerEmail || '');
      fd.append('dlNumber',                      state.dlNumber || '');
      fd.append('dlState',                       state.dlState || '');
      fd.append('dlExpiration',                  state.dlExpiration || '');
      fd.append('insuranceCompany',              state.insuranceCompany || '');
      fd.append('insurancePolicyNumber',         state.insurancePolicyNumber || '');
      fd.append('insurancePolicyExpiration',     state.insurancePolicyExpiration || '');
      fd.append('insuranceLiabilityLimits',      state.insuranceLiabilityLimits || '');
      fd.append('insuranceCoversRental',         state.insuranceCoversRental || '');
      if (dlPhoto) fd.append('dlPhoto', dlPhoto, dlPhoto.name);

      const bookingRes = await api.post('/api/car-rental/bookings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bookingId = bookingRes.data.id;

      // Step 2: Create payment intent
      const piRes = await api.post(`/api/car-rental/bookings/${bookingId}/payment-intent`);
      const { clientSecret } = piRes.data;

      // Step 3: Confirm card payment (manual capture)
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: { name: cardName || state.customerFullName },
        },
      });

      if (stripeError) {
        if (stripeError.code === 'card_declined') {
          setPayError(`Card declined: ${stripeError.message}. Please try a different card.`);
        } else if (stripeError.code === 'expired_card') {
          setPayError('Your card has expired. Please use a different card.');
        } else {
          setPayError(stripeError.message || 'Payment failed. Please try again.');
        }
        setPaying(false);
        return;
      }

      if (!['requires_capture', 'succeeded'].includes(paymentIntent.status)) {
        setPayError('Payment could not be authorized. Please try again.');
        setPaying(false);
        return;
      }

      // Step 4: Confirm on backend
      await api.post(`/api/car-rental/bookings/${bookingId}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      });

      clearPendingDlPhoto();
      localStorage.removeItem(LS_KEY);
      navigate(`/car-rental/rental/${bookingId}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setPayError('Sorry! This car was just booked by someone else. Redirecting to dates…');
        let secs = 5;
        setCountdown(secs);
        timerRef.current = setInterval(() => {
          secs -= 1;
          setCountdown(secs);
          if (secs <= 0) clearInterval(timerRef.current);
        }, 1000);
      } else {
        setPayError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay}>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 10 }}>
        Credit card only &nbsp;·&nbsp;
        <span style={{ fontWeight: 700, color: '#0D2B6B' }}>VISA</span>&nbsp;
        <span style={{ fontWeight: 700, color: '#EB001B' }}>MC</span>&nbsp;
        <span style={{ fontWeight: 700, color: '#2E77BC' }}>AMEX</span>
      </div>

      {/* Name on card */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>NAME ON CARD</div>
        <input
          value={cardName}
          onChange={e => setCardName(e.target.value)}
          placeholder={state.customerFullName}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${focused === 'name' ? '#0D2B6B' : '#D0D7E3'}`,
            borderRadius: 10, padding: '13px 14px', fontSize: 15,
            background: '#fff', outline: 'none',
            boxShadow: focused === 'name' ? '0 0 0 3px rgba(13,43,107,0.12)' : 'none',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />
      </div>

      {/* Card number */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>CARD NUMBER</div>
        <div style={elWrap('number')}>
          <CardNumberElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('number')} onBlur={() => setFocused(null)} />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>EXPIRY DATE</div>
          <div style={elWrap('expiry')}>
            <CardExpiryElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('expiry')} onBlur={() => setFocused(null)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>CVC</div>
          <div style={elWrap('cvc')}>
            <CardCvcElement options={STRIPE_EL_STYLE} onFocus={() => setFocused('cvc')} onBlur={() => setFocused(null)} />
          </div>
        </div>
      </div>

      {payError && (
        <div style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#C62828', fontSize: 14, fontWeight: 600 }}>
          ⚠ {payError}
          {countdown !== null && <span style={{ fontWeight: 700 }}> ({countdown}s)</span>}
        </div>
      )}

      <button
        type="submit"
        disabled={paying || !stripe || countdown !== null}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: paying || !stripe ? '#ccc' : '#F57C00',
          color: paying || !stripe ? '#999' : '#0D2B6B',
          fontWeight: 800, fontSize: 17,
          cursor: paying || !stripe ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: paying || !stripe ? 'none' : '0 6px 20px rgba(245,124,0,0.35)',
        }}
      >
        {paying ? (
          <>
            <span style={{ width: 18, height: 18, border: '2.5px solid rgba(0,0,0,0.15)', borderTopColor: '#0D2B6B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            Authorizing…
          </>
        ) : (
          `Authorize ${money(state.totalAmount)}`
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, fontSize: 12, color: '#888' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Secured by Stripe · Payment held until car is returned
      </div>
    </form>
  );
}

export default function CarRentalPayment() {
  const { carId }  = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const state      = location.state || {};

  useEffect(() => {
    if (!state.car || !state.pickupDate || !state.customerFullName) {
      navigate(`/car-rental/book/${carId}`, { replace: true });
    }
  }, []);

  if (!state.car || !state.pickupDate || !state.customerFullName) return null;

  const dlPhoto = pendingDlPhoto;
  const total   = Number(state.totalAmount || 0);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80')",
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,60,0.70)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: '80px 20px 60px' }}>

        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
        >
          ← Back
        </button>

        <CarStepBar currentStep={3} />
        <CarHeroCard car={state.car} />

        {/* Price breakdown */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 8px 40px rgba(0,0,20,0.2)', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #E3F2FD' }}>
            Booking Summary
          </div>

          <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#0D2B6B', fontWeight: 600 }}>
            <span>📅 {fmtDate(state.pickupDate)} · {fmtTime(state.pickupTime)}</span>
            <span style={{ color: '#F57C00', fontWeight: 800 }}>→</span>
            <span>🏁 {fmtDate(state.returnDate)} · {fmtTime(state.returnTime)}</span>
          </div>

          {[
            [`Rental (${state.totalDays} day${state.totalDays !== 1 ? 's' : ''} × ${money(state.car?.price_per_day ?? state.car?.daily_rate)}/day)`, money(state.rentalCost)],
            Number(state.depositAmount) > 0 ? ['Security deposit (refundable)', money(state.depositAmount)] : null,
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14 }}>
              <span style={{ color: '#555' }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{val}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: 20, fontWeight: 800, color: '#0D2B6B' }}>
            <span>Total to Authorize</span>
            <span>{money(total)}</span>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Payment authorized (held) now — charged only after car is returned.
          </div>
        </div>

        {/* Cancellation policy */}
        <div style={{ background: '#FFFDE7', border: '1.5px solid #FFE082', borderLeft: '5px solid #F57C00', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: '#E65100', fontSize: 14, marginBottom: 8 }}>📋 Cancellation Policy</div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#5d4037', lineHeight: 1.9 }}>
            <li>Cancel more than 24 hours before pickup — full refund</li>
            <li>Cancel less than 24 hours before pickup — no refund</li>
            <li>No show — no refund</li>
          </ul>
        </div>

        {/* Payment form */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 8px 40px rgba(0,0,20,0.2)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #E3F2FD' }}>
            Step 3 — Secure Payment
          </div>
          <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 20 }}>
            Your card will be authorized now and charged only after the car is returned. Deposit refunded after inspection.
          </p>

          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <CarPaymentInner state={state} carId={carId} dlPhoto={dlPhoto} />
            </Elements>
          ) : (
            <div style={{ background: '#FFEBEE', borderRadius: 10, padding: '14px 18px', fontSize: 14, color: '#C62828', fontWeight: 600 }}>
              ⚠ Payment processing is not configured. Please contact support.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
