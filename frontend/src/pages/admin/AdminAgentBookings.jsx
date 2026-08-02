import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';
import AdminAgentBookingDetail from './AdminAgentBookingDetail';

const STATUS_CONFIG = {
  payment_pending:  { label: 'Payment Pending',  bg: '#E3F2FD', color: '#0D2B6B'  },
  pending_approval: { label: 'Pending Approval', bg: '#FFF9C4', color: '#F57F17'  },
  approved:         { label: 'Confirmed',         bg: '#E8F5E9', color: '#2E7D32'  },
  cancelled:        { label: 'Cancelled',         bg: '#FFEBEE', color: '#C62828'  },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmt12 = (t) => {
  if (!t) return '—';
  const h = parseInt(t);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${ampm}`;
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F5F5F5', color: '#555' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export default function AdminAgentBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId,   setSelectedId]   = useState(null);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const load = async (status = '') => {
    setLoading(true);
    const url = status ? `/api/admin/agent-bookings?status=${status}` : '/api/admin/agent-bookings';
    const { data } = await api.get(url);
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusFilter = (v) => {
    setStatusFilter(v);
    load(v);
  };

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🧭 Agent Bookings</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: bookings.length, color: '#0D2B6B' },
          { label: 'Pending Approval', value: counts.pending_approval || 0, color: '#F57F17' },
          { label: 'Confirmed', value: counts.approved || 0, color: '#2E7D32' },
          { label: 'Cancelled', value: counts.cancelled || 0, color: '#C62828' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div className="form-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => handleStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Booking</th><th>Agent</th><th>Customer</th><th>Date & Time</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 700, color: '#0D2B6B' }}>#{b.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.agent_photo ? (
                        <img src={`${API_URL}/uploads/${b.agent_photo}`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 36, height: 36, background: '#E3F2FD', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧭</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{b.agent_name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{b.city_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.customer_full_name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{b.customer_email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{fmtDate(b.booking_date)}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{fmt12(b.start_time)} — {fmt12(b.end_time)}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>${Number(b.total_amount).toFixed(2)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(b.id)}>View</button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No agent bookings found.</td></tr>
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
              <AdminAgentBookingDetail bookingId={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
