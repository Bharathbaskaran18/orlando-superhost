import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../utils/api';
import { AgentStepBar, AgentHeroCard } from './AgentHeroCard';
import { pendingIdFile, clearPendingIdFile } from './agentBookingSession';

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

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmt12 = (t) => {
  if (!t) return '';
  const h = parseInt(t);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};

const Row = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0F4F8', fontSize: 14 }}>
    <span style={{ color: '#555' }}>{label}</span>
    <span style={{ fontWeight: bold ? 800 : 600, color: bold ? '#0D2B6B' : '#1a1a1a' }}>{value}</span>
  </div>
);

function AgentCardInner({ state, agentId, idFile }) {
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
    if (countdown <= 0) { navigate(`/agent/book/${agentId}`); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate, agentId]);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!idFile) { setPayError('ID photo is missing. Please go back and re-upload your ID.'); return; }
    const cardEl = elements.getElement(CardNumberElement);
    if (!cardEl) { setPayError('Card details not ready. Please refresh.'); return; }

    setPaying(true);
    setPayError('');

    let bookingId = null;
    try {
      // Step 1: Create booking
      const fd = new FormData();
      fd.append('agentId',           state.agentId);
      fd.append('bookingDate',       state.bookingDate);
      fd.append('startTime',         state.startTime);
      fd.append('endTime',           state.endTime);
      fd.append('totalHours',        state.totalHours);
      fd.append('hourlyRate',        state.hourlyRate);
      fd.append('rentalCost',        state.rentalCost);
      fd.append('depositAmount',     state.depositAmount || 0);
      fd.append('totalAmount',       state.totalAmount);
      fd.append('customerFirstName', state.firstName);
      fd.append('customerLastName',  state.lastName);
      fd.append('customerDob',       state.dob || '');
      fd.append('customerPhone',     state.phone);
      fd.append('customerEmail',     state.email);
      fd.append('customerAddress',   state.address);
      fd.append('idType',            state.idType);
      fd.append('idPhoto',           idFile, idFile.name);
      if (state.purpose)         fd.append('purpose',        state.purpose);
      if (state.specialRequests) fd.append('specialRequests', state.specialRequests);

      const bookingRes = await api.post('/api/agent-booking/bookings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bookingId = bookingRes.data.bookingId;

      // Step 2: Create payment intent
      const piRes = await api.post(`/api/agent-booking/bookings/${bookingId}/payment-intent`);
      const { clientSecret } = piRes.data;

      // Step 3: Confirm card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: { name: cardName || `${state.firstName} ${state.lastName}` },
        },
      });

      if (stripeError) {
        if (stripeError.code === 'card_declined') {
          setPayError(`Your card was declined: ${stripeError.message}. Please try a different card.`);
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

      // Step 4: Confirm payment on backend
      await api.post(`/api/agent-booking/bookings/${bookingId}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      });

      clearPendingIdFile();
      navigate(`/agent/booking/${bookingId}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setPayError('This time slot was just booked by someone else. Redirecting you to pick a new time...');
        setCountdown(5);
      } else {
        setPayError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
      setPaying(false);
    }
  };

  const elStyle = (field) => ({
    padding: '13px 14px', borderRadius: 10,
    border: `2px solid ${focused === field ? '#0D2B6B' : '#E0E0E0'}`,
    background: 'white', transition: 'border-color 0.2s',
  });

  return (
    <div>
      {payError && (
        <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#C62828', fontSize: 14 }}>
          ⚠ {payError}
          {countdown !== null && <span style={{ fontWeight: 700 }}> Redirecting in {countdown}s...</span>}
        </div>
      )}

      {/* Card Name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>Name on Card</label>
        <input
          value={cardName}
          onChange={e => setCardName(e.target.value)}
          placeholder={`${state.firstName} ${state.lastName}`}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 10, fontFamily: 'inherit',
            border: `2px solid ${focused === 'name' ? '#0D2B6B' : '#E0E0E0'}`,
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />
      </div>

      {/* Card Number */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>Card Number</label>
        <div style={elStyle('number')}>
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
          <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>Expiry Date</label>
          <div style={elStyle('expiry')}>
            <CardExpiryElement
              options={STRIPE_EL_STYLE}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>CVC</label>
          <div style={elStyle('cvc')}>
            <CardCvcElement
              options={STRIPE_EL_STYLE}
              onFocus={() => setFocused('cvc')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="btn btn-full btn-lg"
        style={{ background: paying ? '#ccc' : '#F57C00', color: paying ? '#999' : '#0D2B6B', border: 'none', fontWeight: 800, boxShadow: paying ? 'none' : '0 6px 20px rgba(245,124,0,0.35)' }}
      >
        {paying ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 18, border: '2px solid rgba(13,43,107,0.2)', borderTop: '2px solid #0D2B6B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            Processing...
          </span>
        ) : (
          `Pay $${Number(state.totalAmount).toFixed(2)} to Reserve`
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, color: '#999', fontSize: 12 }}>
        <span>🔒</span><span>Secured by Stripe · Payment held until admin approves</span>
      </div>
    </div>
  );
}

export default function AgentPayment() {
  const { agentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  if (!state.bookingDate || !state.firstName) {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 32, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p>Missing booking info. <Link to={`/agent/book/${agentId}`}>Go back to Step 1</Link></p>
        </div>
      </div>
    );
  }

  const idFile = pendingIdFile;

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40, maxWidth: 720 }}>
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        </div>

        <AgentStepBar currentStep={3} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {/* Payment Form */}
          <div>
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, color: '#0D2B6B', marginBottom: 20, fontSize: 16 }}>💳 Secure Payment</h3>
              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <AgentCardInner state={state} agentId={agentId} idFile={idFile} />
                </Elements>
              ) : (
                <div style={{ background: '#FFF8E1', borderRadius: 10, padding: 16, color: '#E65100', fontSize: 14 }}>
                  Payment processing is not configured. Please contact support.
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0D2B6B', marginBottom: 14 }}>Order Summary</div>
              <Row label="Date"       value={fmtDate(state.bookingDate)} />
              <Row label="Time"       value={`${fmt12(state.startTime)} — ${fmt12(state.endTime)}`} />
              <Row label="Duration"   value={`${state.totalHours}h`} />
              <Row label="Rate"       value={`$${Number(state.hourlyRate).toFixed(2)}/hr`} />
              <Row label="Session fee" value={`$${Number(state.rentalCost).toFixed(2)}`} />
              {Number(state.depositAmount) > 0 && (
                <Row label="Deposit" value={`$${Number(state.depositAmount).toFixed(2)}`} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 16, fontWeight: 800, color: '#0D2B6B' }}>
                <span>Total</span><span>${Number(state.totalAmount).toFixed(2)}</span>
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#E3F2FD', borderRadius: 8, fontSize: 12, color: '#0D2B6B', lineHeight: 1.5 }}>
                ℹ Your payment is held until admin approves your booking. You'll receive an email confirmation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
