import { useState, useEffect } from 'react';
import api from '../api/axios';

const TYPE_ICONS = { car: '🚗', house: '🏠', agent: '👤' };

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () =>
    api.get('/bookings/my').then((res) => setBookings(res.data)).finally(() => setLoading(false));

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    await api.put(`/bookings/${id}/cancel`);
    fetchBookings();
  };

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading bookings…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No bookings yet</h3>
          <p>Browse cars, houses, and agents to make your first booking.</p>
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="booking-card">
            <div className="booking-card-info">
              <h3>
                {TYPE_ICONS[b.item_type]} {b.item_type.charAt(0).toUpperCase() + b.item_type.slice(1)} #{b.item_id}
              </h3>
              <p>📅 {b.start_date} → {b.end_date}</p>
              <p>💳 Total: ${Number(b.total_price).toFixed(2)}</p>
              <p>Booked on: {new Date(b.created_at).toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <span className={`badge badge-${b.status}`}>{b.status}</span>
              {b.status !== 'cancelled' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
