import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import PaymentForm from '../components/PaymentForm';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const getDatesInRange = (start, end) => {
  const dates = [];
  let cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

export default function HouseBooking() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [city, setCity] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [blockedDates, setBlockedDates] = useState(new Set());
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    api.get(`/api/cities/${cityId}`).then(r => setCity(r.data)).catch(() => navigate('/'));
  }, [cityId]);

  const handleDateChange = async (range) => {
    setDateRange(range);
    setSelectedHouse(null);
    setShowPayment(false);
    if (!range || !range[0] || !range[1]) return;
    const start = range[0].toISOString().split('T')[0];
    const end = range[1].toISOString().split('T')[0];
    setLoadingHouses(true);
    try {
      const { data } = await api.get(`/api/houses?cityId=${cityId}&startDate=${start}&endDate=${end}`);
      setHouses(data);
    } catch {
      setHouses([]);
    } finally {
      setLoadingHouses(false);
    }
  };

  const handleSelectHouse = async (house) => {
    setSelectedHouse(house);
    setShowPayment(false);
    try {
      const { data } = await api.get(`/api/houses/${house.id}/blocked-dates`);
      const blocked = new Set();
      data.forEach(b => {
        getDatesInRange(b.start_date, b.end_date).forEach(d => blocked.add(d));
      });
      setBlockedDates(blocked);
    } catch { setBlockedDates(new Set()); }
  };

  const nights = dateRange?.[0] && dateRange?.[1]
    ? Math.ceil((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24))
    : 0;

  const total = selectedHouse ? Number(selectedHouse.price_per_night) * nights : 0;

  const bookingDetails = selectedHouse && dateRange ? {
    bookingType: 'house',
    itemId: selectedHouse.id,
    startDate: dateRange[0].toISOString().split('T')[0],
    endDate: dateRange[1].toISOString().split('T')[0],
    totalPrice: total,
  } : null;

  const handlePaymentSuccess = () => {
    navigate('/booking-success', { state: { type: 'house', item: selectedHouse, nights, total } });
  };

  const getPhotoUrl = (filename) => `${API_URL}/uploads/${filename}`;

  if (!city) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/">Home</Link> › <Link to={`/city/${cityId}`}>{city.name}</Link> › Book a House
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#003580' }}>
          🏠 Vacation Homes in {city.name}
        </h1>
        <p style={{ color: '#6b6b6b' }}>{city.state_name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: '#003580', marginBottom: 14 }}>Select Your Stay Dates</h3>
            <Calendar
              onChange={handleDateChange}
              value={dateRange}
              selectRange
              minDate={new Date()}
            />
            {dateRange && (
              <div style={{ marginTop: 12, color: '#00695c', fontWeight: 600, fontSize: 14 }}>
                {nights} night{nights !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {loadingHouses && <div className="loading"><div className="spinner" /><span>Searching available homes...</span></div>}

          {!loadingHouses && dateRange && (
            <>
              <h3 style={{ fontWeight: 700, color: '#003580', marginBottom: 14 }}>
                {houses.length > 0 ? `${houses.length} Home${houses.length !== 1 ? 's' : ''} Available` : 'No homes available for these dates'}
              </h3>
              <div className="grid">
                {houses.map(house => (
                  <div
                    key={house.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      border: selectedHouse?.id === house.id ? '2px solid #26a69a' : '2px solid transparent',
                    }}
                    onClick={() => handleSelectHouse(house)}
                  >
                    {house.photos?.[0] ? (
                      <img src={getPhotoUrl(house.photos[0])} alt={house.name} className="card-img" onError={e => e.target.style.display='none'} />
                    ) : (
                      <div className="card-img-placeholder" style={{ background: 'linear-gradient(135deg, #00695c, #26a69a)' }}>🏠</div>
                    )}
                    <div className="card-body">
                      <div className="card-title">{house.name}</div>
                      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 8 }}>{house.address}</div>
                      <div className="card-tags">
                        <span className="tag tag-green">🛏️ {house.rooms} rooms</span>
                        <span className="tag tag-green">🚿 {house.bathrooms} baths</span>
                      </div>
                      <div className="card-price" style={{ color: '#00695c' }}>
                        ${Number(house.price_per_night).toFixed(2)} <span>/ night</span>
                      </div>
                      {nights > 0 && (
                        <div style={{ fontSize: 13, color: '#00695c', fontWeight: 600, marginBottom: 10 }}>
                          Total: ${(Number(house.price_per_night) * nights).toFixed(2)} for {nights} nights
                        </div>
                      )}
                      <button
                        className={`btn btn-full ${selectedHouse?.id === house.id ? 'btn-accent' : 'btn-success'}`}
                        onClick={e => { e.stopPropagation(); handleSelectHouse(house); }}
                      >
                        {selectedHouse?.id === house.id ? '✓ Selected' : 'Select This Home'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!dateRange && (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <h3>Pick your stay dates</h3>
              <p>Select check-in and check-out dates to see available homes</p>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: 80 }}>
          {selectedHouse ? (
            <div className="booking-panel">
              <h3>Booking Summary</h3>
              <div style={{ marginBottom: 16 }}>
                {selectedHouse.photos?.[0] ? (
                  <img src={getPhotoUrl(selectedHouse.photos[0])} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} onError={e => e.target.style.display='none'} />
                ) : (
                  <div style={{ background: 'linear-gradient(135deg,#00695c,#26a69a)', height: 80, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🏠</div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#003580', marginBottom: 4 }}>
                {selectedHouse.name}
              </div>
              <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 16 }}>
                {selectedHouse.rooms} rooms · {selectedHouse.bathrooms} baths
              </div>

              <div className="summary-box">
                <div className="summary-row">
                  <span>${Number(selectedHouse.price_per_night).toFixed(2)} × {nights} nights</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {!user ? (
                <div>
                  <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 12, textAlign: 'center' }}>
                    Please log in to complete your booking
                  </p>
                  <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                    Login to Book
                  </button>
                </div>
              ) : !showPayment ? (
                <button className="btn btn-accent btn-full btn-lg" onClick={() => setShowPayment(true)}>
                  Book Now — ${total.toFixed(2)}
                </button>
              ) : (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    amount={total}
                    bookingDetails={bookingDetails}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              )}
            </div>
          ) : (
            <div className="booking-panel" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
              <h3 style={{ marginBottom: 8 }}>No home selected</h3>
              <p style={{ fontSize: 13, color: '#6b6b6b' }}>
                Select dates and choose a home to see pricing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
