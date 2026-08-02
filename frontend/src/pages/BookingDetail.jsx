import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../api/axios';
import CheckoutForm from '../components/CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const ICONS = { car: '🚗', house: '🏠', agent: '👤' };
const LABELS = { car: 'Car', house: 'House', agent: 'Agent' };

function toLocalMidnight(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function BookingDetail() {
  const { type, id } = useParams();
  const [item, setItem] = useState(null);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('select'); // 'select' | 'payment'
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const itemEndpoint = type === 'agent' ? 'agents' : `${type}s`;
    Promise.all([
      api.get(`/${itemEndpoint}/${id}`),
      api.get(`/bookings/dates/${type}/${id}`),
    ])
      .then(([itemRes, datesRes]) => {
        setItem(itemRes.data);
        setBookedRanges(datesRes.data);
      })
      .finally(() => setLoading(false));
  }, [type, id]);

  const isBooked = (date) =>
    bookedRanges.some(({ start_date, end_date }) => {
      const s = toLocalMidnight(start_date);
      const e = toLocalMidnight(end_date);
      return date >= s && date <= e;
    });

  const start = Array.isArray(dateRange) ? dateRange[0] : null;
  const end = Array.isArray(dateRange) ? dateRange[1] : null;
  const days = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : 0;
  const pricePerUnit = item
    ? Number(type === 'agent' ? item.price_per_hour : item.price_per_day)
    : 0;
  const total = days * pricePerUnit;

  const handleProceed = async () => {
    if (!start || !end) { setError('Please select a date range'); return; }
    setError('');
    try {
      const res = await api.post('/payments/create-payment-intent', { amount: total });
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId);
      setStep('payment');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payment');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading…</p></div>;
  if (!item) return <div className="container"><p>Item not found.</p></div>;

  const unit = type === 'agent' ? '/hr' : '/day';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container">
      <div className="booking-detail">
        {/* Left: item info */}
        <div>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="detail-img" />
          ) : (
            <div className="detail-img-placeholder">{ICONS[type]}</div>
          )}
          <h1 className="detail-name">{item.name}</h1>
          <p className="detail-desc">{item.description || item.bio}</p>
          {type === 'car' && item.seats && (
            <p style={{ marginTop: 12, color: '#555', fontSize: 14 }}>👥 {item.seats} seats</p>
          )}
          {type === 'house' && (
            <p style={{ marginTop: 12, color: '#555', fontSize: 14 }}>
              📍 {item.location} &nbsp;|&nbsp; 🛏 {item.bedrooms} bedroom(s)
            </p>
          )}
          {type === 'agent' && item.specialty && (
            <p style={{ marginTop: 12, color: '#555', fontSize: 14 }}>⭐ {item.specialty}</p>
          )}
        </div>

        {/* Right: booking panel */}
        <div className="booking-panel">
          <h3>Book this {LABELS[type]}</h3>
          <div className="price-big">
            ${pricePerUnit.toFixed(2)}<span>{unit}</span>
          </div>

          {step === 'select' && (
            <>
              <p style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>
                Select your dates:
              </p>
              <Calendar
                selectRange
                onChange={setDateRange}
                value={dateRange}
                minDate={new Date()}
                tileDisabled={({ date }) => isBooked(date)}
              />

              {days > 0 && (
                <div className="summary-box">
                  <div className="summary-row">
                    <span>${pricePerUnit.toFixed(2)} × {days} {days === 1 ? 'day' : 'days'}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {error && <p style={{ color: '#e53935', fontSize: 13, margin: '8px 0' }}>{error}</p>}

              <button
                onClick={handleProceed}
                className="btn btn-primary btn-full"
                style={{ marginTop: 12 }}
                disabled={days === 0}
              >
                Proceed to Payment
              </button>
            </>
          )}

          {step === 'payment' && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <CheckoutForm
                type={type}
                itemId={id}
                dateRange={[start, end]}
                total={total}
                paymentIntentId={paymentIntentId}
                onBack={() => setStep('select')}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}
