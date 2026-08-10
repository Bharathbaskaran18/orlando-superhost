import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../utils/api';
import { HouseStepBar, HouseHeroCard } from './HouseHeroCard';
import { pendingIdFile, clearPendingIdFile } from './houseBookingSession';
import { fmtLong, ordinal, parseLocal, buildDisplaySchedule } from './houseLeaseUtils';

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

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Row = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14 }}>
    <span style={{ color: '#555' }}>{label}</span>
    <span style={{ fontWeight: bold ? 800 : 600, color: bold ? '#0D2B6B' : '#1a1a1a' }}>{value}</span>
  </div>
);

function HouseCardInner({ state, houseId, idFile, total }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [paying,    setPaying]    = useState(false);
  const [payError,  setPayError]  = useState('');
  const [countdown, setCountdown] = useState(null);
  const [focused,   setFocused]   = useState(null);
  const [cardName,  setCardName]  = useState('');

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { navigate(`/house/book/${houseId}`); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate, houseId]);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!idFile) { setPayError('ID photo is missing. Please go back and re-upload your ID.'); return; }
    const cardNumberEl = elements.getElement(CardNumberElement);
    if (!cardNumberEl) { setPayError('Card details not ready. Please refresh.'); return; }

    setPaying(true);
    setPayError('');

    let bookingId = null;
    try {
      // Step 1: Create booking (status: payment_pending)
      const fd = new FormData();
      fd.append('houseId',           houseId);
      fd.append('moveInDate',        state.moveInDate);
      fd.append('numMonths',         state.numMonths);
      fd.append('customerFirstName', state.firstName);
      fd.append('customerLastName',  state.lastName);
      fd.append('customerDob',       state.dob || '');
      fd.append('customerPhone',     state.phone);
      fd.append('customerEmail',     state.email);
      fd.append('customerAddress',   state.address);
      fd.append('specialRequests',   state.specialRequests || '');
      fd.append('idType',            state.idType);
      fd.append('idPhoto',           idFile, idFile.name);

      const bookingRes = await api.post('/api/house-booking/bookings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bookingId = bookingRes.data.bookingId;

      // Step 2: Create payment intent
      const piRes = await api.post(`/api/house-booking/bookings/${bookingId}/payment-intent`);
      const { clientSecret } = piRes.data;

      // Step 3: Confirm & charge card
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: { name: cardName || `${state.firstName} ${state.lastName}` },
        },
      });

      if (stripeError) {
        if (stripeError.code === 'card_declined' || stripeError.decline_code === 'insufficient_funds') {
          setPayError(`Your card was declined: ${stripeError.message}. Please try a different card.`);
        } else if (stripeError.code === 'expired_card') {
          setPayError('Your card has expired. Please use a different card.');
        } else {
          setPayError(stripeError.message || 'Payment failed. Please try again.');
        }
        setPaying(false);
        return;
      }

      if (paymentIntent.status !== 'succeeded') {
        setPayError('Payment could not be completed. Please try again.');
        setPaying(false);
        return;
      }

      // Step 4: Confirm payment on backend
      await api.post(`/api/house-booking/bookings/${bookingId}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      });

      clearPendingIdFile();
      navigate(`/house/booking/${bookingId}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setPayError('This property just got booked by someone else. Redirecting…');
        setCountdown(5);
      } else {
        setPayError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
      setPaying(false);
    }
  };

  const elWrap = (focused) => ({
    border: `1.5px solid ${focused ? '#0D2B6B' : '#D0D7E3'}`,
    borderRadius: 10,
    padding: '13px 14px',
    background: '#fff',
    boxShadow: focused ? '0 0 0 3px rgba(13,43,107,0.12)' : 'none',
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 6 }}>
        Credit card only &nbsp;·&nbsp;
        <span style={{ fontWeight: 700, color: '#0D2B6B' }}>VISA</span>&nbsp;
        <span style={{ fontWeight: 700, color: '#EB001B' }}>MC</span>&nbsp;
        <span style={{ fontWeight: 700, color: '#2E77BC' }}>AMEX</span>
      </div>

      {/* Card holder name */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>NAME ON CARD</div>
        <input
          value={cardName}
          onChange={e => setCardName(e.target.value)}
          placeholder={`${state.firstName} ${state.lastName}`}
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
        <div style={elWrap(focused === 'number')}>
          <CardNumberElement
            options={STRIPE_EL_STYLE}
            onFocus={() => setFocused('number')}
            onBlur={() => setFocused(null)}
          />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>EXPIRY DATE</div>
          <div style={elWrap(focused === 'expiry')}>
            <CardExpiryElement
              options={STRIPE_EL_STYLE}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>CVC</div>
          <div style={elWrap(focused === 'cvc')}>
            <CardCvcElement
              options={STRIPE_EL_STYLE}
              onFocus={() => setFocused('cvc')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
      </div>

      {payError && (
        <div style={{ background: '#FFEBEE', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#C62828', fontWeight: 600 }}>
          ⚠ {payError}
          {countdown !== null && ` (${countdown}s)`}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: paying || !stripe ? '#ccc' : '#F57C00',
          color: paying || !stripe ? '#999' : '#0D2B6B',
          fontWeight: 800, fontSize: 17, cursor: paying || !stripe ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {paying ? (
          <>
            <span style={{
              display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
              border: '2.5px solid rgba(0,0,0,0.15)', borderTopColor: '#0D2B6B', animation: 'spin 0.7s linear infinite',
            }} />
            Processing…
          </>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
      </button>

      {/* Secured by Stripe badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, fontSize: 12, color: '#888' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Secured by Stripe · Your card is never stored on our servers
      </div>
    </div>
  );
}

export default function HousePayment() {
  const { houseId } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const state       = location.state || {};

  const [house, setHouse] = useState(null);

  useEffect(() => {
    api.get(`/api/house-booking/house/${houseId}`).then(r => setHouse(r.data)).catch(() => {});
  }, [houseId]);

  const idFile         = pendingIdFile;
  const total           = Number(state.totalDueToday || 0);
  const monthlyRent      = Number(state.monthlyRent || 0);
  const deposit          = Number(state.deposit || 0);
  const schedule         = buildDisplaySchedule(state.moveInDate, state.numMonths, monthlyRent);
  const gracePeriodDays  = house?.grace_period_days ?? 5;
  const latePaymentFee   = Number(house?.late_payment_fee || 0);
  const rentDueDay       = state.moveInDate ? ordinal(parseLocal(state.moveInDate).getDate()) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 780 }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        </div>

        <HouseStepBar currentStep={3} />
        <HouseHeroCard house={house} />

        {/* Move-In Summary */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>Move-In Summary</div>

          <div style={{ background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
            <span>📅 Move in {fmtDate(state.moveInDate)} → Move out {fmtDate(state.moveOutDate)}</span>
            <span>🗓 {state.numMonths} month{state.numMonths !== 1 ? 's' : ''}</span>
          </div>

          <Row label="First month rent" value={`$${monthlyRent.toFixed(2)}`} />
          <Row label="Security deposit (refundable)" value={`$${deposit.toFixed(2)}`} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: 20, fontWeight: 800, color: '#0D2B6B' }}>
            <span>Total Due Today</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div style={{ marginTop: 14, background: '#F0F7FF', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555' }}>
            💳 <strong>Remaining monthly payments:</strong> ${monthlyRent.toFixed(2)}/month for the rest of your lease.
          </div>
        </div>

        {/* Monthly Payment Schedule */}
        {schedule.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>Monthly Payment Schedule</div>
            {schedule.map(m => (
              <Row
                key={m.monthNumber}
                label={`Month ${m.monthNumber}`}
                value={m.paid ? `Already paid (${fmtLong(m.dueDate)})` : `Due ${fmtLong(m.dueDate)} — $${Number(m.amount).toFixed(2)}`}
              />
            ))}
          </div>
        )}

        {/* Payment Policy */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>Payment Policy</div>
          <div style={{ background: '#F0F7FF', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#333', lineHeight: 1.9 }}>
            📅 Monthly rent due on the <strong>{rentDueDay}</strong> of each month<br />
            ⏳ Grace period: <strong>{gracePeriodDays} day{gracePeriodDays !== 1 ? 's' : ''}</strong><br />
            ⚠️ Late payment fee: <strong>${latePaymentFee.toFixed(2)} per day</strong> after grace period
          </div>
        </div>

        {/* Guest Info */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>Your Information</div>
          <Row label="Name"    value={`${state.firstName} ${state.lastName}`} />
          <Row label="Email"   value={state.email} />
          <Row label="Phone"   value={state.phone} />
          <Row label="Address" value={state.address} />
          <Row label="ID Type" value={state.idType?.replace('_', ' ')?.replace(/\b\w/g, c => c.toUpperCase())} />
          {idFile && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>ID PHOTO</div>
              <img src={URL.createObjectURL(idFile)} alt="ID" style={{ maxHeight: 100, borderRadius: 8, border: '2px solid #E3F2FD' }} />
            </div>
          )}
          {!idFile && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFF3E0', borderRadius: 8, fontSize: 13, color: '#E65100' }}>
              ⚠️ ID photo not found. Please go back and re-upload.
            </div>
          )}
        </div>

        {/* Payment */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D2B6B', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E3F2FD' }}>Step 3 — Complete Payment</div>
          <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 20 }}>
            You'll be charged today for the first month's rent + security deposit. Your lease will be pending admin approval after payment.
          </p>

          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <HouseCardInner state={state} houseId={houseId} idFile={idFile} total={total} />
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
