import { Link } from 'react-router-dom';

export default function CheckoutSuccess() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
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
      </div>
    </div>
  );
}
