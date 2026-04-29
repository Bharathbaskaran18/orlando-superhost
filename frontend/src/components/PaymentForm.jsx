import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../utils/api';

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      fontFamily: "'Poppins', sans-serif",
      color: '#1a1a1a',
      '::placeholder': { color: '#aaa' },
    },
    invalid: { color: '#cc0000' },
  },
};

export default function PaymentForm({ amount, bookingDetails, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    try {
      const { data } = await api.post('/api/bookings/payment-intent', { amount });
      const { clientSecret, paymentIntentId } = data;

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message);
        setProcessing(false);
        return;
      }

      await api.post('/api/bookings/confirm', {
        ...bookingDetails,
        paymentIntentId,
      });

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b6b6b', marginBottom: 6 }}>
          Card Details
        </label>
        <div className="stripe-card-element">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fce8e6', color: '#cc0000', padding: '10px 14px',
          borderRadius: 8, fontSize: 13, marginBottom: 14
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-accent btn-full btn-lg"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>

      <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 10 }}>
        🔒 Secured by Stripe. Your card info is never stored.
      </p>
    </form>
  );
}
