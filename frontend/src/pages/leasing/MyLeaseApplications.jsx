import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = {
  step1_pending: { label: 'Screening Pending', color: '#856404', bg: '#fff3cd' },
  step1_approved: { label: 'Screening Approved', color: '#1e7e34', bg: '#e6f4ea' },
  step1_rejected: { label: 'Screening Rejected', color: '#c62828', bg: '#fce8e6' },
  step1_info_requested: { label: 'More Info Needed', color: '#7b3f00', bg: '#fef3e2' },
  step2_pending: { label: 'Full Review Pending', color: '#856404', bg: '#fff3cd' },
  step2_approved: { label: 'Full Review Approved', color: '#1e7e34', bg: '#e6f4ea' },
  step2_rejected: { label: 'Full Review Rejected', color: '#c62828', bg: '#fce8e6' },
  step2_clarification_requested: { label: 'Clarification Needed', color: '#7b3f00', bg: '#fef3e2' },
  appointment_pending: { label: 'Appointment Pending', color: '#856404', bg: '#fff3cd' },
  appointment_confirmed: { label: 'Appointment Confirmed', color: '#1e7e34', bg: '#e6f4ea' },
  appointment_rescheduled: { label: 'Appointment Rescheduled', color: '#1E88E5', bg: '#E3F2FD' },
  appointment_cancelled: { label: 'Appointment Cancelled', color: '#c62828', bg: '#fce8e6' },
};

export default function MyLeaseApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/api/leasing/my-applications')
      .then(r => setApplications(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: "url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.85)' }}>Home</Link> › My Lease Applications
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>🏡 My Lease Applications</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Track the status of your rental applications.</p>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
          <h3>No applications yet</h3>
          <p style={{ marginBottom: 20 }}>Browse available properties and apply to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Browse Properties
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {applications.map(app => {
            const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: '#6b6b6b', bg: '#f5f5f5' };
            return (
              <div
                key={app.id}
                onClick={() => navigate(`/leasing/application/${app.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 20,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'pointer',
                  display: 'flex', gap: 16, alignItems: 'center',
                  transition: 'box-shadow 0.2s',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = '#1E88E5'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                {app.property_photos?.[0] ? (
                  <img
                    src={`${API_URL}/uploads/${app.property_photos[0]}`}
                    alt={app.property_title}
                    style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                    onError={e => e.target.style.display = 'none'}
                  />
                ) : (
                  <div style={{
                    width: 90, height: 64, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1a237e, #3949ab)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>🏡</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0D2B6B', marginBottom: 2 }}>
                    {app.property_title}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 4 }}>
                    📍 {app.property_address} · {app.city_name}, {app.state_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b6b6b' }}>
                    ${Number(app.price_per_month).toLocaleString()}/month · Applied {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    color: statusInfo.color,
                    background: statusInfo.bg,
                    marginBottom: 8,
                  }}>
                    {statusInfo.label}
                  </span>
                  <div style={{ fontSize: 12, color: '#1E88E5', fontWeight: 600 }}>View Details →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
      </div>
    </div>
  );
}
