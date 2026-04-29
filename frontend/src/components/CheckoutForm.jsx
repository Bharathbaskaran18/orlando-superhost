import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import api from '../api/axios';

export default function CheckoutForm({ type, itemId, dateRange, total, paymentIntentId, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    try {
      await api.post('/bookings', {
        item_type: type,
        item_id: parseInt(itemId),
        start_date: dateRange[0].toISOString().split('T')[0],
        end_date: dateRange[1].toISOString().split('T')[0],
        total_price: total,
        stripe_payment_intent_id: paymentIntentId,
      });
      navigate('/checkout/success');
    } catch {
      setError('Payment succeeded but booking failed. Please contact support.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="summary-box" style={{ marginBottom: 20 }}>
        <div className="summary-row">
          <span>Total to pay</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>

      <PaymentElement />

      {error && (
        <p style={{ color: '#e53935', fontSize: 13, marginTop: 12 }}>{error}</p>
      )}

      <button
        type="submit"
        className="btn btn-success btn-full"
        style={{ marginTop: 16 }}
        disabled={processing || !stripe || !elements}
      >
        {processing ? 'Processing…' : `Pay $${total.toFixed(2)}`}
      </button>

      <button
        type="button"
        className="btn btn-secondary btn-full"
        style={{ marginTop: 8 }}
        onClick={onBack}
        disabled={processing}
      >
        Back
      </button>
    </form>
  );
}
