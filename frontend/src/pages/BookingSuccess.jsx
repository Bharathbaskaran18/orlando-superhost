import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function BookingSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const icons = { car: '🚗', house: '🏠', agent: '🧭' };
  const labels = { car: 'Car Rental', house: 'Vacation Home', agent: 'Travel Agent' };

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
        <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: '50px 40px',
            textAlign: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0D2B6B', marginBottom: 8 }}>
              Booking Confirmed!
            </h1>
            <p style={{ color: '#6b6b6b', fontSize: 16, marginBottom: 28 }}>
              Your {state?.type ? labels[state.type] : 'booking'} has been successfully booked and paid.
            </p>

            {state && (
              <div style={{
                background: '#f8faff',
                border: '1px solid #d0e3ff',
                borderRadius: 12,
                padding: '20px',
                marginBottom: 28,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>
                  {icons[state.type] || '✈️'}
                </div>
                {state.item && (
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0D2B6B', marginBottom: 8, textAlign: 'center' }}>
                    {state.type === 'car'
                      ? `${state.item.year} ${state.item.make} ${state.item.model}`
                      : state.item.name}
                  </div>
                )}
                <div style={{ borderTop: '1px solid #e7e7e7', paddingTop: 12 }}>
                  {state.nights && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b6b6b', marginBottom: 6 }}>
                      <span>Duration</span>
                      <span>{state.nights} {state.type === 'house' ? 'nights' : 'days'}</span>
                    </div>
                  )}
                  {state.date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b6b6b', marginBottom: 6 }}>
                      <span>Date</span>
                      <span>{new Date(state.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {state.time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b6b6b', marginBottom: 6 }}>
                      <span>Time</span>
                      <span>{state.time}</span>
                    </div>
                  )}
                  {state.total && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#0D2B6B', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e7e7e7' }}>
                      <span>Total Paid</span>
                      <span>${Number(state.total).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline btn-full"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate('/')}
              >
                Book Another Trip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
