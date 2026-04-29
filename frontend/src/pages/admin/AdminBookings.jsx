import { useState, useEffect } from 'react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

const TYPE_ICONS = { car: '🚗', house: '🏠', agent: '🧭' };

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/api/admin/bookings')
      .then(r => setBookings(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    await api.put(`/api/admin/bookings/${id}/cancel`);
    load();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  let filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.user_name?.toLowerCase().includes(q) ||
      b.user_email?.toLowerCase().includes(q) ||
      b.item_name?.toLowerCase().includes(q) ||
      b.city_name?.toLowerCase().includes(q)
    );
  }

  const totalRevenue = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + Number(b.total_price), 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Bookings</h1>
          <p style={{ color: '#6b6b6b', fontSize: 14, marginTop: 4 }}>
            {bookings.filter(b => b.status === 'confirmed').length} confirmed ·{' '}
            Total revenue: <strong>${totalRevenue.toFixed(2)}</strong>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by user, item, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Booking</th>
                <th>City</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ color: '#6b6b6b', fontSize: 12 }}>#{b.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                    <div style={{ fontSize: 12, color: '#6b6b6b' }}>{b.user_email}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{TYPE_ICONS[b.booking_type] || '📦'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.item_name || `#${b.item_id}`}</div>
                        <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'capitalize' }}>{b.booking_type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{b.city_name || '—'}</td>
                  <td style={{ fontSize: 12, color: '#6b6b6b' }}>
                    <div>{formatDate(b.start_date)}</div>
                    {b.end_date && b.end_date !== b.start_date && (
                      <div>→ {formatDate(b.end_date)}</div>
                    )}
                    {b.start_time && <div style={{ color: '#003580' }}>{b.start_time.slice(0,5)}</div>}
                  </td>
                  <td style={{ fontWeight: 700, color: '#003580' }}>${Number(b.total_price).toFixed(2)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    {b.status === 'confirmed' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#6b6b6b', padding: 40 }}>
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
