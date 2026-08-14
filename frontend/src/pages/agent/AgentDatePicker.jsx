import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../../utils/api';
import { AgentStepBar, AgentHeroCard } from './AgentHeroCard';
import { useAuth } from '../../context/AuthContext';
import LoginPromptModal from '../../components/LoginPromptModal';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Start time: 6:00 AM – 6:00 PM (must leave at least 1hr before 7PM close)
const START_TIME_OPTIONS = [];
for (let h = 6; h <= 18; h++) {
  START_TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 18) START_TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

// End time pool: 7:00 AM – 7:00 PM
const END_TIME_POOL = [];
for (let h = 7; h <= 19; h++) {
  END_TIME_POOL.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 19) END_TIME_POOL.push(`${String(h).padStart(2, '0')}:30`);
}

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const toMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const dateToStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDateLong = (d) =>
  d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';

const CAL_CSS = `
  .agent-cal-booked {
    background: #FFEBEE !important;
    color: #C62828 !important;
    text-decoration: line-through;
  }
  .agent-cal-booked:hover { background: #FFCDD2 !important; }
  .agent-cal-unavail {
    color: #BDBDBD !important;
    background: #FAFAFA !important;
  }
  .agent-cal-unavail:hover { background: #F5F5F5 !important; }
`;

export default function AgentDatePicker() {
  const { agentId } = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [agent, setAgent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [bookedDates, setBookedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime]   = useState('');
  const [endTime, setEndTime]       = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/agents/${agentId}`),
      api.get(`/api/agent-booking/booked-dates/${agentId}`),
    ])
      .then(([agentRes, datesRes]) => {
        setAgent(agentRes.data);
        setBookedDates(datesRes.data.bookedDates || []);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [agentId]);

  const isAvailableDay = (date) => {
    if (!agent?.available_days?.length) return true;
    return agent.available_days.includes(DAYS_OF_WEEK[date.getDay()]);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const tileDisabled = ({ date }) => {
    if (date < today) return true;
    if (!isAvailableDay(date)) return true;
    if (bookedDates.includes(dateToStr(date))) return true;
    return false;
  };

  const tileClassName = ({ date }) => {
    if (date < today) return null;
    if (bookedDates.includes(dateToStr(date))) return 'agent-cal-booked';
    if (!isAvailableDay(date)) return 'agent-cal-unavail';
    return null;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setStartTime('');
    setEndTime('');
  };

  // End time must be at least 60 min after start, max 7:00 PM
  const validEndTimes = startTime
    ? END_TIME_POOL.filter(t => toMins(t) >= toMins(startTime) + 60)
    : [];

  const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
  const totalMins   = startTime && endTime ? toMins(endTime) - toMins(startTime) : 0;
  const totalHours  = totalMins / 60;
  const hourlyRate  = rp(agent ? agent.hourly_rate : 0);
  const deposit     = rp(agent ? agent.deposit_amount || 0 : 0);
  const rentalCost  = rp(totalHours * hourlyRate);
  const totalAmount = rp(rentalCost + deposit);

  const canContinue = selectedDate && startTime && endTime && totalMins >= 60;

  const handleContinue = () => {
    if (!user) { setShowLoginPrompt(true); return; }
    navigate(`/agent/book/${agentId}/details`, {
      state: {
        agentId:       parseInt(agentId),
        bookingDate:   dateToStr(selectedDate),
        startTime:     startTime + ':00',
        endTime:       endTime + ':00',
        totalHours,
        hourlyRate,
        rentalCost,
        depositAmount: deposit,
        totalAmount,
      },
    });
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!agent)  return null;

  const selStr = selectedDate ? dateToStr(selectedDate) : '';
  const isDateBooked = selStr && bookedDates.includes(selStr);

  return (
    <div style={{ minHeight: '100vh', backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <style>{CAL_CSS}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.65)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 88, paddingBottom: 40 }}>
        <div style={{ marginBottom: 8 }}>
          <Link to={`/city/${agent.city_id}/agents`} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none' }}>
            ← Back to Agents
          </Link>
        </div>

        <AgentStepBar currentStep={1} />
        <AgentHeroCard agent={agent} />

        {agent.bio && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.6 }}>
            {agent.bio}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
          <div>

            {/* ── Calendar ─────────────────────────────── */}
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 12, fontSize: 15 }}>1. Select a Date</h3>

              {agent.available_days?.length > 0 && (
                <div style={{ marginBottom: 12, fontSize: 12, color: '#6b6b6b', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Available:</span>
                  {agent.available_days.map(d => (
                    <span key={d} style={{ background: '#E3F2FD', color: '#0D2B6B', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{d.slice(0,3)}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 11, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 14, height: 14, background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 3, display: 'inline-block' }} />
                  Already booked
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 14, height: 14, background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 3, display: 'inline-block' }} />
                  Unavailable
                </span>
              </div>

              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                minDate={new Date()}
              />
            </div>

            {/* ── Time Pickers ─────────────────────────── */}
            {selectedDate && !isDateBooked && (
              <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 16, fontSize: 15 }}>
                  2. Select Start & End Time
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Start Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Start Time
                    </label>
                    <select
                      value={startTime}
                      onChange={e => { setStartTime(e.target.value); setEndTime(''); }}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 10, fontFamily: 'inherit',
                        border: `2px solid ${startTime ? '#0D2B6B' : '#E0E0E0'}`,
                        fontSize: 14, outline: 'none', appearance: 'none',
                        background: startTime ? '#E3F2FD' : 'white', color: startTime ? '#0D2B6B' : '#999',
                        fontWeight: startTime ? 700 : 400, cursor: 'pointer',
                      }}
                    >
                      <option value="">— Pick start —</option>
                      {START_TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{fmt12(t)}</option>
                      ))}
                    </select>
                  </div>

                  {/* End Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      End Time
                    </label>
                    <select
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      disabled={!startTime}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 10, fontFamily: 'inherit',
                        border: `2px solid ${endTime ? '#0D2B6B' : '#E0E0E0'}`,
                        fontSize: 14, outline: 'none', appearance: 'none',
                        background: endTime ? '#E3F2FD' : startTime ? 'white' : '#f9f9f9',
                        color: endTime ? '#0D2B6B' : startTime ? '#999' : '#ccc',
                        fontWeight: endTime ? 700 : 400,
                        cursor: startTime ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <option value="">— Pick end —</option>
                      {validEndTimes.map(t => (
                        <option key={t} value={t}>{fmt12(t)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {startTime && !endTime && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#0D2B6B', fontWeight: 600 }}>
                    Minimum 1 hour · select an end time after {fmt12(startTime)}
                  </div>
                )}

                {startTime && endTime && (
                  <div style={{ marginTop: 14, background: '#E3F2FD', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#0D2B6B', fontWeight: 600 }}>
                    🕐 {fmt12(startTime)} → {fmt12(endTime)} &nbsp;·&nbsp; {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hours
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Summary Panel ─────────────────────────── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 16, fontSize: 16 }}>Booking Summary</h3>

              {/* Date */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Date</div>
                {selectedDate ? (
                  <div style={{ background: '#E3F2FD', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#0D2B6B', fontWeight: 700 }}>
                    📅 {fmtDateLong(selectedDate)}
                  </div>
                ) : (
                  <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#bbb' }}>Not selected</div>
                )}
              </div>

              {/* Time */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Time</div>
                {startTime && endTime ? (
                  <div style={{ background: '#E3F2FD', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#0D2B6B', fontWeight: 700 }}>
                    🕐 {fmt12(startTime)} — {fmt12(endTime)}
                  </div>
                ) : (
                  <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#bbb' }}>
                    {selectedDate ? 'Select start & end time' : '—'}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                {totalHours > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 5 }}>
                      <span>Total hours</span>
                      <span style={{ fontWeight: 700 }}>{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 5 }}>
                      <span>Hourly rate</span>
                      <span style={{ fontWeight: 700 }}>${hourlyRate.toFixed(2)}/hr</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 5 }}>
                      <span>{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h × ${hourlyRate.toFixed(2)}</span>
                      <span style={{ fontWeight: 700 }}>${rentalCost.toFixed(2)}</span>
                    </div>
                    {deposit > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 5 }}>
                        <span>Security deposit</span>
                        <span style={{ fontWeight: 700 }}>${deposit.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, color: '#0D2B6B', marginTop: 10, paddingTop: 10, borderTop: '2px solid #E3F2FD' }}>
                      <span>Total to pay</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '10px 0' }}>
                    Pick a date and times to see pricing
                  </div>
                )}
              </div>

              <button
                className="btn btn-full btn-lg"
                disabled={!canContinue}
                onClick={handleContinue}
                style={{ marginTop: 18, background: canContinue ? '#0D2B6B' : '#D0D0D0', color: 'white', border: 'none' }}
              >
                Continue to Details →
              </button>

              {!selectedDate && (
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 }}>Select a date to continue</p>
              )}
              {selectedDate && (!startTime || !endTime) && (
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 }}>Select start and end time</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectTo={`/agent/book/${agentId}`}
      />
    </div>
  );
}
