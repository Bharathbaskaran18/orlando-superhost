import { useState, useEffect } from 'react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import AdminCarRentalDetail from './AdminCarRentalDetail';
import { formatDateShort } from '../../utils/dateHelper';

const STATUS_OPTS = [
  { value: '',                         label: 'All' },
  { value: 'payment_pending',          label: 'Pending' },
  { value: 'confirmed',                label: 'Confirmed' },
  { value: 'agreement_sent',           label: 'Agreement Sent' },
  { value: 'awaiting_admin_signature', label: 'Awaiting Rep Signature' },
  { value: 'agreement_complete',       label: 'Agreement Complete' },
  { value: 'active_car_out',           label: 'Active — Car Out' },
  { value: 'returned',                 label: 'Returned' },
  { value: 'completed',                label: 'Completed' },
  { value: 'completed_with_charges',   label: 'Completed with Charges' },
  { value: 'cancelled',                label: 'Cancelled' },
  { value: 'auto_cancelled',           label: 'Auto Cancelled' },
];

const STATUS_LABEL = {
  payment_pending:          'Pending',
  confirmed:                'Confirmed',
  agreement_sent:           'Agreement Sent',
  awaiting_admin_signature: 'Awaiting Rep Signature',
  agreement_complete:       'Agreement Complete',
  active_car_out:           'Active — Car Out',
  returned:                 'Returned',
  completed:                'Completed',
  completed_with_charges:   'Completed with Charges',
  cancelled:                'Cancelled',
  auto_cancelled:           'Auto Cancelled',
};

function StatusBadge({ status }) {
  const label = STATUS_LABEL[status] || status;

  if (status === 'payment_pending') {
    return <span style={{ background:'#FFF9C4', color:'#F57F17', border:'1px solid #FFF176', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>⏳ {label}</span>;
  }
  if (status === 'active_car_out') {
    return <span style={{ background:'#FFF3E0', color:'#E65100', border:'1px solid #FFCC80', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>🚗 {label}</span>;
  }
  if (status === 'completed') {
    return <span style={{ background:'#E8F5E9', color:'#2e7d32', border:'1px solid #A5D6A7', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>✅ {label}</span>;
  }
  if (status === 'completed_with_charges') {
    return <span style={{ background:'#E8F5E9', color:'#2e7d32', border:'1px solid #A5D6A7', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>✅ {label}</span>;
  }
  if (status === 'cancelled') {
    return <span style={{ background:'#FFEBEE', color:'#c62828', border:'1px solid #FFCDD2', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>✕ {label}</span>;
  }
  if (['confirmed','agreement_sent','awaiting_admin_signature','agreement_complete','returned'].includes(status)) {
    return <span style={{ background:'#E3F2FD', color:'#0D2B6B', border:'1px solid #BBDEFB', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>{label}</span>;
  }
  return <span className="badge badge-pending">{label}</span>;
}

const fmtDate = formatDateShort;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

export default function AdminCarRentals() {
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId,   setSelectedId]   = useState(null);

  useEffect(() => { loadBookings(); }, [statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const loadBookings = async () => {
    setLoading(true);
    const url = statusFilter
      ? `/api/admin/car-rental/bookings?status=${statusFilter}`
      : '/api/admin/car-rental/bookings';
    const { data } = await api.get(url);
    setBookings(data);
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Car Rental Bookings</h1>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Car</th><th>Renter</th><th>Dates</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} onClick={() => setSelectedId(b.id)} style={{ cursor:'pointer' }}>
                  <td style={{ color:'#6b6b6b', fontSize:12 }}>#{b.id}</td>
                  <td>
                    <div style={{ fontWeight:700 }}>{b.year} {b.make} {b.model}</div>
                    <div style={{ fontSize:12, color:'#6b6b6b' }}>{b.city_name}, {b.state_name}</div>
                  </td>
                  <td>
                    <div>{b.user_name}</div>
                    <div style={{ fontSize:12, color:'#6b6b6b' }}>{b.user_email}</div>
                  </td>
                  <td style={{ fontSize:12 }}>{fmtDate(b.pickup_date)} →<br />{fmtDate(b.return_date)}</td>
                  <td style={{ fontWeight:700 }}>{money(b.total_amount)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'#6b6b6b', padding:32 }}>No bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Full-screen booking detail modal */}
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
              <AdminCarRentalDetail bookingId={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
