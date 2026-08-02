import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (val, opts) => {
  if (!val) return '';
  const [y, m, d] = String(val).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US',
    opts || { year: 'numeric', month: 'long', day: 'numeric' }
  );
};

const STATUS_LABELS = {
  step1_pending: { label: 'Pending Admin Review', color: '#856404', bg: '#fff3cd', icon: '⏳' },
  step1_approved: { label: 'Screening Approved!', color: '#1e7e34', bg: '#e6f4ea', icon: '✅' },
  step1_rejected: { label: 'Screening Rejected', color: '#c62828', bg: '#fce8e6', icon: '❌' },
  step1_info_requested: { label: 'More Info Requested', color: '#7b3f00', bg: '#fef3e2', icon: '📋' },
  step2_pending: { label: 'Full Application Under Review', color: '#856404', bg: '#fff3cd', icon: '⏳' },
  step2_approved: { label: 'Full Application Approved!', color: '#1e7e34', bg: '#e6f4ea', icon: '✅' },
  step2_rejected: { label: 'Full Application Rejected', color: '#c62828', bg: '#fce8e6', icon: '❌' },
  step2_clarification_requested: { label: 'Clarification Requested', color: '#7b3f00', bg: '#fef3e2', icon: '📋' },
  appointment_pending: { label: 'Appointment Pending Confirmation', color: '#856404', bg: '#fff3cd', icon: '📅' },
  appointment_confirmed: { label: 'Appointment Confirmed!', color: '#1e7e34', bg: '#e6f4ea', icon: '🎉' },
  appointment_rescheduled: { label: 'Appointment Rescheduled', color: '#1E88E5', bg: '#E3F2FD', icon: '📅' },
  appointment_cancelled: { label: 'Appointment Cancelled', color: '#c62828', bg: '#fce8e6', icon: '❌' },
};

const STEPS = [
  { key: 'step1', label: 'Step 1: Screening', statuses: ['step1_pending', 'step1_approved', 'step1_rejected', 'step1_info_requested'] },
  { key: 'step2', label: 'Step 2: Full Application', statuses: ['step2_pending', 'step2_approved', 'step2_rejected', 'step2_clarification_requested'] },
  { key: 'appointment', label: 'Visit Appointment', statuses: ['appointment_pending', 'appointment_confirmed', 'appointment_rescheduled', 'appointment_cancelled'] },
];

function getStepIndex(status) {
  if (!status) return 0;
  if (status.startsWith('step2') || status.startsWith('appointment')) return status.startsWith('appointment') ? 2 : 1;
  return 0;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b', width: 180, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a' }}>{value}</span>
    </div>
  );
}

export default function LeaseApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/api/leasing/my-applications/${id}`)
      .then(r => setApp(r.data))
      .catch(() => navigate('/leasing/my-applications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!app) return null;

  const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: '#6b6b6b', bg: '#f5f5f5', icon: '•' };
  const currentStepIndex = getStepIndex(app.status);

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

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
    <div className="container" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#6b6b6b', fontSize: 14, marginBottom: 4 }}>
          <Link to="/">Home</Link> › <Link to="/leasing/my-applications">My Applications</Link> › Application #{app.id}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D2B6B' }}>Application Details</h1>
      </div>

      {/* Property Card */}
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 16, marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', gap: 16, alignItems: 'center',
      }}>
        {app.property_photos?.[0] ? (
          <img
            src={`${API_URL}/uploads/${app.property_photos[0]}`}
            alt={app.property_title}
            style={{ width: 110, height: 76, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{
            width: 110, height: 76, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1a237e, #3949ab)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>🏡</div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0D2B6B' }}>{app.property_title}</div>
          <div style={{ fontSize: 13, color: '#6b6b6b' }}>📍 {app.property_address}</div>
          <div style={{ fontSize: 13, color: '#6b6b6b' }}>
            {app.city_name}, {app.state_name} · {app.num_bedrooms} bed · {app.num_bathrooms} bath · ${Number(app.price_per_month).toLocaleString()}/mo
          </div>
          {app.lease_agreement_pdf && (
            <a
              href={`${API_URL}/uploads/${app.lease_agreement_pdf}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#1E88E5', fontWeight: 600 }}
            >
              📄 Lease Agreement
            </a>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 20, marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((step, idx) => {
            const done = idx < currentStepIndex;
            const active = idx === currentStepIndex;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#e6f4ea' : active ? '#1a237e' : '#f5f5f5',
                    color: done ? '#1e7e34' : active ? 'white' : '#bbb',
                    fontWeight: 800, fontSize: 14,
                    border: active ? 'none' : done ? '2px solid #1e7e34' : '2px solid #e0e0e0',
                  }}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#1a237e' : done ? '#1e7e34' : '#bbb' }}>
                    {step.label}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 0.3, background: done ? '#1e7e34' : '#e0e0e0', margin: '0 4px', marginBottom: 20 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status */}
      <div style={{
        background: statusInfo.bg, borderRadius: 12, padding: 16, marginBottom: 20,
        border: `1px solid ${statusInfo.color}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{statusInfo.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: statusInfo.color, fontSize: 15 }}>
              {statusInfo.label}
            </div>
            {app.admin_note && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#1a1a1a' }}>
                <strong>Admin Note:</strong> {app.admin_note}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons based on status */}
        {app.status === 'step1_approved' && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              style={{ background: '#1a237e', color: 'white' }}
              onClick={() => navigate(`/leasing/application/${id}/step2`)}
            >
              Complete Full Application (Step 2) →
            </button>
          </div>
        )}
        {app.status === 'step2_approved' && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              style={{ background: '#1a237e', color: 'white' }}
              onClick={() => navigate(`/leasing/application/${id}/appointment`)}
            >
              Book Property Visit →
            </button>
          </div>
        )}
      </div>

      {/* Appointment Details */}
      {app.appointment && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14, fontSize: 15 }}>📅 Visit Appointment</h3>
          <InfoRow label="Requested Date" value={fmtDate(app.appointment.requested_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <InfoRow label="Requested Time" value={formatTime(app.appointment.requested_time)} />
          {app.appointment.confirmed_date && (
            <InfoRow label="Confirmed Date" value={fmtDate(app.appointment.confirmed_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          )}
          {app.appointment.confirmed_time && (
            <InfoRow label="Confirmed Time" value={formatTime(app.appointment.confirmed_time)} />
          )}
          {app.appointment.admin_note && (
            <InfoRow label="Admin Note" value={app.appointment.admin_note} />
          )}
        </div>
      )}

      {/* Step 2 Data */}
      {app.step2 && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14, fontSize: 15 }}>📁 Step 2 Submission</h3>
          {app.step2.id_photo && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b' }}>ID Photo:</span>{' '}
              <a href={`${API_URL}/uploads/${app.step2.id_photo}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1E88E5', fontSize: 13, fontWeight: 600 }}>View ↗</a>
            </div>
          )}
          {app.step2.income_proof && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b' }}>Income Proof:</span>{' '}
              <a href={`${API_URL}/uploads/${app.step2.income_proof}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1E88E5', fontSize: 13, fontWeight: 600 }}>View ↗</a>
            </div>
          )}
          {app.step2.rental_history && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6b6b' }}>Rental History:</span>{' '}
              <a href={`${API_URL}/uploads/${app.step2.rental_history}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1E88E5', fontSize: 13, fontWeight: 600 }}>View ↗</a>
            </div>
          )}
          <InfoRow label="Emergency Contact" value={app.step2.emergency_contact_name} />
          <InfoRow label="Contact Phone" value={app.step2.emergency_contact_phone} />
          <InfoRow label="Relationship" value={app.step2.emergency_contact_relation} />
        </div>
      )}

      {/* Step 1 Data */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontWeight: 700, color: '#0D2B6B', marginBottom: 14, fontSize: 15 }}>📝 Screening Application (Step 1)</h3>
        <InfoRow label="Full Name" value={app.full_name} />
        <InfoRow label="Email" value={app.email} />
        <InfoRow label="Phone" value={app.phone} />
        <InfoRow label="Current Address" value={app.current_address} />
        <InfoRow label="Monthly Income" value={app.monthly_income ? `$${Number(app.monthly_income).toLocaleString()}` : null} />
        <InfoRow label="Occupants" value={app.num_occupants?.toString()} />
        <InfoRow label="Reason for Moving" value={app.reason_for_moving} />
        <InfoRow label="Submitted" value={new Date(app.created_at).toLocaleString()} />
      </div>

      <div style={{ marginTop: 16, paddingBottom: 32 }}>
        <Link to="/leasing/my-applications" style={{ color: '#1E88E5', fontWeight: 600, fontSize: 14 }}>
          ← Back to My Applications
        </Link>
      </div>
    </div>
      </div>
    </div>
  );
}
