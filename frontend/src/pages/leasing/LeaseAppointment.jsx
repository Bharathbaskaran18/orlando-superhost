import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
];

const formatTime = (t) => {
  const [h] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:00 ${ampm}`;
};

export default function LeaseAppointment() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/api/leasing/my-applications/${id}`)
      .then(r => {
        if (r.data.status !== 'step2_approved') {
          navigate(`/leasing/application/${id}`);
          return;
        }
        setApplication(r.data);
      })
      .catch(() => navigate('/leasing/my-applications'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const requestedDate = selectedDate.toISOString().split('T')[0];
      await api.post(`/api/leasing/applications/${id}/appointment`, {
        requestedDate,
        requestedTime: selectedTime,
      });
      navigate(`/leasing/application/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!application) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/leasing/my-applications">My Applications</Link> ›{' '}
          <Link to={`/leasing/application/${id}`}>Application #{id}</Link> › Book Visit
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B' }}>Book Property Visit</h1>
        <p style={{ color: '#6b6b6b' }}>Select a date and time to visit {application.property_title}.</p>
      </div>

      {/* Approval confirmation */}
      <div style={{
        background: '#e6f4ea', borderRadius: 12, padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🎉</span>
        <div>
          <div style={{ fontWeight: 700, color: '#1e7e34', fontSize: 14 }}>Full Application Approved!</div>
          <div style={{ fontSize: 13, color: '#1a1a1a' }}>You're ready to schedule a visit to {application.property_title}.</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D2B6B', marginBottom: 16 }}>Select Date</h3>
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileDisabled={({ date }) => date < today}
            minDate={today}
          />

          {selectedDate && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D2B6B', margin: '20px 0 12px' }}>
                Select Time for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '2px solid',
                      borderColor: selectedTime === slot ? '#1a237e' : '#e0e0e0',
                      background: selectedTime === slot ? '#1a237e' : 'white',
                      color: selectedTime === slot ? 'white' : '#1a1a1a',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {formatTime(slot)}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedDate && selectedTime && (
            <div style={{
              marginTop: 20, padding: '12px 16px', background: '#f8faff',
              borderRadius: 10, border: '1px solid #d0e3ff',
            }}>
              <div style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 4 }}>Your Requested Visit:</div>
              <div style={{ fontSize: 14, color: '#1a1a1a' }}>
                📅 {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ fontSize: 14, color: '#1a1a1a' }}>
                🕐 {formatTime(selectedTime)}
              </div>
              <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 6 }}>
                The admin will confirm or reschedule this appointment.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/leasing/application/${id}`)}>Cancel</button>
            <button
              type="submit"
              className="btn"
              style={{ background: '#1a237e', color: 'white' }}
              disabled={submitting || !selectedDate || !selectedTime}
            >
              {submitting ? 'Booking...' : 'Request Visit Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
      </div>
    </div>
  );
}
