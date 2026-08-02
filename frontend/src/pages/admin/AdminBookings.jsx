import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

const CAR_STATUS_LABEL = {
  payment_pending:          'Pending',
  confirmed:                'Confirmed',
  agreement_sent:           'Agreement Sent',
  awaiting_admin_signature: 'Awaiting Rep Signature',
  agreement_complete:       'Agreement Complete',
  active_car_out:           'Active — Car Out',
  returned:                 'Returned',
  completed:                'Completed',
  completed_with_charges:   'Completed w/ Charges',
  cancelled:                'Cancelled',
};

function CarStatusBadge({ status }) {
  const label = CAR_STATUS_LABEL[status] || status;
  if (status === 'payment_pending')
    return <span style={{ background:'#FFF9C4', color:'#F57F17', border:'1px solid #FFF176', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>⏳ {label}</span>;
  if (status === 'active_car_out')
    return <span style={{ background:'#FFF3E0', color:'#E65100', border:'1px solid #FFCC80', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>🚗 {label}</span>;
  if (status === 'completed' || status === 'completed_with_charges')
    return <span style={{ background:'#E8F5E9', color:'#2e7d32', border:'1px solid #A5D6A7', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>✅ {label}</span>;
  if (status === 'cancelled')
    return <span style={{ background:'#FFEBEE', color:'#c62828', border:'1px solid #FFCDD2', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>✕ {label}</span>;
  return <span style={{ background:'#E3F2FD', color:'#1565C0', border:'1px solid #BBDEFB', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>{label}</span>;
}

function GenericStatusBadge({ status }) {
  if (status === 'confirmed')
    return <span style={{ background:'#E8F5E9', color:'#2e7d32', border:'1px solid #A5D6A7', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>✅ Confirmed</span>;
  if (status === 'cancelled')
    return <span style={{ background:'#FFEBEE', color:'#c62828', border:'1px solid #FFCDD2', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>✕ Cancelled</span>;
  if (status === 'pending')
    return <span style={{ background:'#FFF9C4', color:'#F57F17', border:'1px solid #FFF176', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>⏳ Pending</span>;
  return <span style={{ background:'#E3F2FD', color:'#1565C0', border:'1px solid #BBDEFB', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>{status}</span>;
}

const fmtDate = (val) => {
  if (!val) return '—';
  const [y, m, d] = String(val).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—';

const TABS = [
  { key: 'all',   label: 'All Bookings' },
  { key: 'car',   label: '🚗 Car Rentals' },
  { key: 'house', label: '🏠 House Bookings' },
  { key: 'agent', label: '🧭 Agent Bookings' },
];

export default function AdminBookings() {
  const navigate = useNavigate();
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('all');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [genRes, carRes, houseRes] = await Promise.all([
        api.get('/api/admin/bookings'),
        api.get('/api/admin/car-rental/bookings'),
        api.get('/api/admin/house-bookings'),
      ]);

      const genRows = (genRes.data || [])
        .filter(b => b.booking_type !== 'car')
        .map(b => ({
          _key:               `gen-${b.id}`,
          _type:              b.booking_type,
          id:                 b.id,
          car_rental_id:      null,
          house_booking_id:   null,
          user_name:          b.user_name,
          user_email:         b.user_email,
          item_name:          b.item_name || `#${b.item_id}`,
          city_name:          b.city_name,
          start_date:         b.start_date,
          end_date:           b.end_date,
          total_price:        b.total_price,
          status:             b.status,
          created_at:         b.created_at,
        }));

      const carRows = (carRes.data || []).map(crb => ({
        _key:               `car-${crb.id}`,
        _type:              'car',
        id:                 crb.id,
        car_rental_id:      crb.id,
        house_booking_id:   null,
        user_name:          crb.user_name,
        user_email:         crb.user_email,
        item_name:          `${crb.year} ${crb.make} ${crb.model}`,
        city_name:          crb.city_name,
        start_date:         crb.pickup_date,
        end_date:           crb.return_date,
        total_price:        crb.total_amount,
        status:             crb.status,
        created_at:         crb.created_at,
      }));

      const houseRows = (houseRes.data || []).map(hb => ({
        _key:               `house-${hb.id}`,
        _type:              'house',
        id:                 hb.id,
        car_rental_id:      null,
        house_booking_id:   hb.id,
        user_name:          hb.customer_full_name || hb.user_name,
        user_email:         hb.customer_email || hb.user_email,
        item_name:          hb.house_name,
        city_name:          hb.city_name,
        start_date:         hb.checkin_date,
        end_date:           hb.checkout_date,
        total_price:        hb.total_amount,
        status:             hb.status,
        created_at:         hb.created_at,
      }));

      const merged = [...genRows, ...carRows, ...houseRows].sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setAll(merged);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    await api.put(`/api/admin/bookings/${id}/cancel`);
    loadAll();
  };

  const displayed = tab === 'all' ? all : all.filter(b => b._type === tab);

  const counts = {
    all:   all.length,
    car:   all.filter(b => b._type === 'car').length,
    house: all.filter(b => b._type === 'house').length,
    agent: all.filter(b => b._type === 'agent').length,
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">📅 Bookings</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 24,
              border: tab === t.key ? '2px solid #1565C0' : '2px solid #e0e0e0',
              background: tab === t.key ? '#1565C0' : '#fff',
              color: tab === t.key ? '#fff' : '#333',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: 7,
              background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#f0f0f0',
              color: tab === t.key ? '#fff' : '#666',
              borderRadius: 12,
              padding: '1px 7px',
              fontSize: 11,
              fontWeight: 800,
            }}>
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
                <th>Customer</th>
                <th>Type</th>
                <th>Item</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(b => (
                <tr key={b._key}>
                  <td style={{ color: '#6b6b6b', fontSize: 12 }}>#{b.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                    <div style={{ fontSize: 12, color: '#6b6b6b' }}>{b.user_email}</div>
                  </td>
                  <td style={{ fontSize: 20 }}>
                    {b._type === 'car' ? '🚗' : b._type === 'house' ? '🏠' : '🧭'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.item_name}</div>
                    {b.city_name && <div style={{ fontSize: 11, color: '#6b6b6b' }}>{b.city_name}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: '#444' }}>
                    <div>{fmtDate(b.start_date)}</div>
                    {b.end_date && b.end_date !== b.start_date && (
                      <div style={{ color: '#6b6b6b' }}>→ {fmtDate(b.end_date)}</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: '#1565C0' }}>{money(b.total_price)}</td>
                  <td>
                    {b._type === 'car'
                      ? <CarStatusBadge status={b.status} />
                      : <GenericStatusBadge status={b.status} />
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {b._type === 'car' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#1565C0', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => navigate(`/admin/car-rentals/${b.car_rental_id}`)}
                        >
                          View Details
                        </button>
                      )}
                      {b._type === 'house' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#1565C0', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => navigate(`/admin/house-bookings/${b.house_booking_id}`)}
                        >
                          View Details
                        </button>
                      )}
                      {b._type !== 'car' && b._type !== 'house' && b.status === 'confirmed' && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={() => handleCancel(b.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#6b6b6b', padding: 40 }}>
                    No bookings found.
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
