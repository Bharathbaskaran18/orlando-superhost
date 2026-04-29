import { Link } from 'react-router-dom';

export default function CheckoutSuccess() {
  return (
    <div className="container">
      <div className="success-wrap">
        <div className="success-icon">✅</div>
        <h1>Booking Confirmed!</h1>
        <p>Your payment was successful and your booking is now confirmed. You'll find it in My Bookings.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/my-bookings" className="btn btn-primary">View My Bookings</Link>
          <Link to="/" className="btn btn-secondary">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
