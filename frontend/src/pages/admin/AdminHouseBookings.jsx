import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';
import AdminHouseBookingDetail from './AdminHouseBookingDetail';

const STATUS_CONFIG = {
  pending_approval:        { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17', border: '#FFF176' },
  approved:                { label: 'Approved',         bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
  checked_in:              { label: 'Checked In',       bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
  completed:               { label: 'Completed',        bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  completed_with_charges:  { label: 'Completed w/ Charges', bg: '#FFF8E1', color: '#F57C00', border: '#FFE082' },
  completed_extra_charged: { label: 'Extra Charged',    bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
  cancelled:               { label: 'Cancelled',        bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F5F5F5', color: '#555', border: '#E0E0E0' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m-1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const FILTER_TABS = [
  { key: 'all',              label: 'All' },
  { key: 'pending_approval', label: '⏳ Pending' },
  { key: 'approved',         label: '✅ Approved' },
  { key: 'checked_in',       label: '🏠 Checked In' },
  { key: 'completed',        label: '✓ Completed' },
  { key: 'cancelled',        label: '✕ Cancelled' },
];

export default function AdminHouseBookings() {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  useEffect(() => {
    api.get('/api/admin/house-bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isCompleted = (s) => ['completed', 'completed_with_charges', 'completed_extra_charged'].includes(s);

  const displayed = tab === 'all' ? bookings
    : tab === 'completed' ? bookings.filter(b => isCompleted(b.status))
    : bookings.filter(b => b.status === tab);

  const counts = {
    all:              bookings.length,
    pending_approval: bookings.filter(b => b.status === 'pending_approval').length,
    approved:         bookings.filter(b => b.status === 'approved').length,
    checked_in:       bookings.filter(b => b.status === 'checked_in').length,
    completed:        bookings.filter(b => isCompleted(b.status)).length,
    cancelled:        bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🏠 House Bookings</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 24, cursor: 'pointer', fontFamily: 'inherit',
              border: tab === t.key ? '2px solid #1565C0' : '2px solid #E0E0E0',
              background: tab === t.key ? '#1565C0' : '#fff',
              color: tab === t.key ? '#fff' : '#333',
              fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            }}
          >
            {t.label}
            <span style={{ marginLeft: 6, background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#F0F0F0', color: tab === t.key ? '#fff' : '#666', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Property</th>
                <th>Guest</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(b => {
                const photo = b.house_photos?.[0];
                return (
                  <tr key={b.id} onClick={() => setSelectedId(b.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: '#6b6b6b', fontSize: 12 }}>#{b.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {photo ? (
                          <img src={`${API_URL}/uploads/${photo}`} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 36, background: 'linear-gradient(135deg,#1565C0,#42A5F5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏠</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{b.house_name}</div>
                          <div style={{ fontSize: 11, color: '#6b6b6b' }}>{b.city_name}, {b.state_name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.customer_full_name || b.user_name}</div>
                      <div style={{ fontSize: 11, color: '#6b6b6b' }}>{b.customer_email || b.user_email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div>{fmtDate(b.checkin_date)}</div>
                      <div style={{ color: '#6b6b6b' }}>→ {fmtDate(b.checkout_date)}</div>
                      <div style={{ color: '#888', fontSize: 11 }}>{b.total_nights} night{b.total_nights !== 1 ? 's' : ''}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {b.num_guests} {b.pets ? '🐾' : ''}
                    </td>
                    <td style={{ fontWeight: 700, color: '#1565C0' }}>${Number(b.total_amount).toFixed(2)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#1565C0', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                        onClick={() => setSelectedId(b.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#6b6b6b', padding: 40 }}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', paddingLeft:'calc(220px + 20px)', paddingRight:20, paddingTop:20, paddingBottom:20, animation:'fadeIn 0.2s ease' }}
          onClick={() => setSelectedId(null)}
        >
          <div
            style={{ background:'#F0F4F8', width:'85%', maxWidth:1000, maxHeight:'90vh', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedId(null)}
              title="Close (Esc)"
              style={{ position:'absolute', top:16, right:16, zIndex:10, background:'white', border:'none', borderRadius:'50%', width:36, height:36, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.2)', lineHeight:1, transition:'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
            >✕</button>
            <div style={{ overflowY:'auto', flex:1 }}>
              <AdminHouseBookingDetail bookingId={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
