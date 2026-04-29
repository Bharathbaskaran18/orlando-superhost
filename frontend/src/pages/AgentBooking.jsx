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

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function AgentBooking() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [city, setCity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [blockedDates, setBlockedDates] = useState(new Set());
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    api.get(`/api/cities/${cityId}`).then(r => setCity(r.data)).catch(() => navigate('/'));
  }, [cityId]);

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedAgent(null);
    setShowPayment(false);
    const dateStr = date.toISOString().split('T')[0];
    setLoadingAgents(true);
    try {
      const { data } = await api.get(`/api/agents?cityId=${cityId}&date=${dateStr}`);
      setAgents(data);
    } catch {
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleSelectAgent = async (agent) => {
    setSelectedAgent(agent);
    setShowPayment(false);
    try {
      const { data } = await api.get(`/api/agents/${agent.id}/blocked-dates`);
      const blocked = new Set(data.map(b => b.start_date?.split('T')[0] || b.start_date));
      setBlockedDates(blocked);
    } catch { setBlockedDates(new Set()); }
  };

  const total = selectedAgent ? Number(selectedAgent.hourly_rate) * 2 : 0;

  const bookingDetails = selectedAgent && selectedDate && selectedTime ? {
    bookingType: 'agent',
    itemId: selectedAgent.id,
    startDate: selectedDate.toISOString().split('T')[0],
    startTime: selectedTime + ':00',
    totalPrice: total,
  } : null;

  const handlePaymentSuccess = () => {
    navigate('/booking-success', { state: { type: 'agent', item: selectedAgent, date: selectedDate, time: selectedTime, total } });
  };

  const isDateBlocked = ({ date }) => {
    const d = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return d < today;
  };

  const getPhotoUrl = (filename) => `${API_URL}/uploads/${filename}`;

  if (!city) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/">Home</Link> › <Link to={`/city/${cityId}`}>{city.name}</Link> › Book an Agent
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#003580' }}>
          🧭 Local Travel Agents in {city.name}
        </h1>
        <p style={{ color: '#6b6b6b' }}>{city.state_name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: '#003580', marginBottom: 14 }}>Select a Date</h3>
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              tileDisabled={isDateBlocked}
              minDate={new Date()}
            />
          </div>

          {selectedDate && (
            <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, color: '#003580', marginBottom: 14 }}>Select a Time Slot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    style={{
                      padding: '10px 8px',
                      border: `2px solid ${selectedTime === t ? '#7b1fa2' : '#e7e7e7'}`,
                      borderRadius: 8,
                      background: selectedTime === t ? '#7b1fa2' : 'white',
                      color: selectedTime === t ? 'white' : '#1a1a1a',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingAgents && <div className="loading"><div className="spinner" /><span>Finding available agents...</span></div>}

          {!loadingAgents && selectedDate && (
            <>
              <h3 style={{ fontWeight: 700, color: '#003580', marginBottom: 14 }}>
                {agents.length > 0 ? `${agents.length} Agent${agents.length !== 1 ? 's' : ''} Available` : 'No agents available on this date'}
              </h3>
              <div className="grid">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      border: selectedAgent?.id === agent.id ? '2px solid #7b1fa2' : '2px solid transparent',
                    }}
                    onClick={() => handleSelectAgent(agent)}
                  >
                    {agent.photo ? (
                      <img src={getPhotoUrl(agent.photo)} alt={agent.name} className="card-img" style={{ objectPosition: 'top' }} onError={e => e.target.style.display='none'} />
                    ) : (
                      <div className="card-img-placeholder" style={{ background: 'linear-gradient(135deg, #7b1fa2, #ab47bc)' }}>🧭</div>
                    )}
                    <div className="card-body">
                      <div className="card-title">{agent.name}</div>
                      <div style={{ fontSize: 13, color: '#7b1fa2', fontWeight: 600, marginBottom: 8 }}>
                        {agent.specialty}
                      </div>
                      <div className="card-price" style={{ color: '#7b1fa2' }}>
                        ${Number(agent.hourly_rate).toFixed(2)} <span>/ hour</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 12 }}>
                        2-hour session = ${(Number(agent.hourly_rate) * 2).toFixed(2)}
                      </div>
                      <button
                        className="btn btn-full"
                        style={{
                          background: selectedAgent?.id === agent.id ? '#f5a623' : '#7b1fa2',
                          color: 'white',
                        }}
                        onClick={e => { e.stopPropagation(); handleSelectAgent(agent); }}
                      >
                        {selectedAgent?.id === agent.id ? '✓ Selected' : 'Select Agent'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!selectedDate && (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <h3>Pick a date first</h3>
              <p>Select a date to see which agents are available</p>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: 80 }}>
          {selectedAgent ? (
            <div className="booking-panel">
              <h3>Booking Summary</h3>
              <div style={{ marginBottom: 16 }}>
                {agent?.photo ? (
                  <img src={getPhotoUrl(selectedAgent.photo)} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: 'top', borderRadius: 8 }} onError={e => e.target.style.display='none'} />
                ) : (
                  <div style={{ background: 'linear-gradient(135deg,#7b1fa2,#ab47bc)', height: 80, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🧭</div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#003580', marginBottom: 2 }}>
                {selectedAgent.name}
              </div>
              <div style={{ fontSize: 13, color: '#7b1fa2', fontWeight: 600, marginBottom: 16 }}>
                {selectedAgent.specialty}
              </div>

              <div className="summary-box">
                {selectedDate && (
                  <div className="summary-row">
                    <span>Date</span>
                    <span>{selectedDate.toLocaleDateString()}</span>
                  </div>
                )}
                {selectedTime && (
                  <div className="summary-row">
                    <span>Time</span>
                    <span>{selectedTime}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>${Number(selectedAgent.hourly_rate).toFixed(2)}/hr × 2 hrs</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {!selectedTime && (
                <p style={{ fontSize: 13, color: '#cc8800', marginBottom: 12, textAlign: 'center' }}>
                  ⚠️ Please select a time slot above
                </p>
              )}

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
                <button
                  className="btn btn-accent btn-full btn-lg"
                  onClick={() => setShowPayment(true)}
                  disabled={!selectedTime || !selectedDate}
                >
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
              <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
              <h3 style={{ marginBottom: 8 }}>No agent selected</h3>
              <p style={{ fontSize: 13, color: '#6b6b6b' }}>
                Pick a date and choose your local travel expert
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
