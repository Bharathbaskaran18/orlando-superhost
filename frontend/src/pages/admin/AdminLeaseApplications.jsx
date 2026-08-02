import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const fmtDate = (val, opts) => {
  if (!val) return '';
  const [y, m, d] = String(val).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US',
    opts || { year: 'numeric', month: 'long', day: 'numeric' }
  );
};

const STATUS_LABELS = {
  step1_pending: { label: 'Step 1 Pending', color: '#856404', bg: '#fff3cd' },
  step1_approved: { label: 'Step 1 Approved', color: '#1e7e34', bg: '#e6f4ea' },
  step1_rejected: { label: 'Step 1 Rejected', color: '#c62828', bg: '#fce8e6' },
  step1_info_requested: { label: 'More Info Requested', color: '#7b3f00', bg: '#fef3e2' },
  step2_pending: { label: 'Step 2 Pending', color: '#856404', bg: '#fff3cd' },
  step2_approved: { label: 'Step 2 Approved', color: '#1e7e34', bg: '#e6f4ea' },
  step2_rejected: { label: 'Step 2 Rejected', color: '#c62828', bg: '#fce8e6' },
  step2_clarification_requested: { label: 'Clarification Needed', color: '#7b3f00', bg: '#fef3e2' },
  appointment_pending: { label: 'Appt. Pending', color: '#856404', bg: '#fff3cd' },
  appointment_confirmed: { label: 'Appt. Confirmed', color: '#1e7e34', bg: '#e6f4ea' },
  appointment_rescheduled: { label: 'Appt. Rescheduled', color: '#1E88E5', bg: '#E3F2FD' },
  appointment_cancelled: { label: 'Appt. Cancelled', color: '#c62828', bg: '#fce8e6' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Applications' },
  { value: 'step1_pending', label: 'Step 1 Pending' },
  { value: 'step2_pending', label: 'Step 2 Pending' },
  { value: 'appointment_pending', label: 'Appointment Pending' },
  { value: 'step1_approved', label: 'Step 1 Approved' },
  { value: 'step2_approved', label: 'Step 2 Approved' },
  { value: 'appointment_confirmed', label: 'Appointment Confirmed' },
  { value: 'step1_rejected', label: 'Rejected' },
];

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b', width: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a' }}>{value}</span>
    </div>
  );
}

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

export default function AdminLeaseApplications() {
  const [applications, setApplications] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedApp && !detailLoading) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedApp(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedApp, detailLoading]);
  const [actionModal, setActionModal] = useState(null); // { type, appId, apptId? }
  const [actionNote, setActionNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTime, setConfirmTime] = useState('');
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  const loadApplications = async () => {
    setLoading(true);
    const url = filterStatus
      ? `/api/admin/leasing/applications?status=${filterStatus}`
      : '/api/admin/leasing/applications';
    const { data } = await api.get(url);
    setApplications(data);
    setLoading(false);
  };

  const openDetail = async (appId) => {
    setDetailLoading(true);
    setSelectedApp(null);
    const { data } = await api.get(`/api/admin/leasing/applications/${appId}`);
    setSelectedApp(data);
    setDetailLoading(false);
  };

  const openAction = (type, appId, apptId = null, appt = null) => {
    setActionNote('');
    setRescheduleDate('');
    setRescheduleTime('');
    setConfirmDate(appt?.requested_date || '');
    setConfirmTime(appt?.requested_time || '');
    setActionError('');
    setActionModal({ type, appId, apptId });
  };

  const handleStatusAction = async () => {
    setActioning(true);
    setActionError('');
    try {
      if (['step1_approved', 'step1_rejected', 'step1_info_requested', 'step2_approved', 'step2_rejected', 'step2_clarification_requested'].includes(actionModal.type)) {
        await api.put(`/api/admin/leasing/applications/${actionModal.appId}/status`, {
          status: actionModal.type,
          adminNote: actionNote || undefined,
        });
      } else if (actionModal.type === 'appt_confirm') {
        await api.put(`/api/admin/leasing/appointments/${actionModal.apptId}`, {
          action: 'confirm',
          confirmedDate: confirmDate || undefined,
          confirmedTime: confirmTime || undefined,
          adminNote: actionNote || undefined,
        });
      } else if (actionModal.type === 'appt_reschedule') {
        if (!rescheduleDate || !rescheduleTime) {
          setActionError('New date and time are required');
          setActioning(false);
          return;
        }
        await api.put(`/api/admin/leasing/appointments/${actionModal.apptId}`, {
          action: 'reschedule',
          confirmedDate: rescheduleDate,
          confirmedTime: rescheduleTime,
          adminNote: actionNote || undefined,
        });
      } else if (actionModal.type === 'appt_cancel') {
        await api.put(`/api/admin/leasing/appointments/${actionModal.apptId}`, {
          action: 'cancel',
          adminNote: actionNote || undefined,
        });
      }

      setActionModal(null);
      loadApplications();
      if (selectedApp?.id === actionModal.appId) {
        openDetail(actionModal.appId);
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  const ACTION_META = {
    step1_approved: { title: 'Approve Step 1', btnColor: '#1e7e34', btnBg: '#e6f4ea', noteLabel: 'Note to applicant (optional)' },
    step1_rejected: { title: 'Reject Step 1', btnColor: '#c62828', btnBg: '#fce8e6', noteLabel: 'Reason for rejection (optional)' },
    step1_info_requested: { title: 'Request More Info', btnColor: '#7b3f00', btnBg: '#fef3e2', noteLabel: 'What info do you need? *' },
    step2_approved: { title: 'Approve Full Application', btnColor: '#1e7e34', btnBg: '#e6f4ea', noteLabel: 'Note to applicant (optional)' },
    step2_rejected: { title: 'Reject Full Application', btnColor: '#c62828', btnBg: '#fce8e6', noteLabel: 'Reason for rejection (optional)' },
    step2_clarification_requested: { title: 'Request Clarification', btnColor: '#7b3f00', btnBg: '#fef3e2', noteLabel: 'What clarification is needed? *' },
    appt_confirm: { title: 'Confirm Appointment', btnColor: '#1e7e34', btnBg: '#e6f4ea', noteLabel: 'Note to applicant (optional)' },
    appt_reschedule: { title: 'Reschedule Appointment', btnColor: '#1E88E5', btnBg: '#E3F2FD', noteLabel: 'Reason for rescheduling (optional)' },
    appt_cancel: { title: 'Cancel Appointment', btnColor: '#c62828', btnBg: '#fce8e6', noteLabel: 'Reason for cancellation (optional)' },
  };

  const meta = actionModal ? ACTION_META[actionModal.type] : null;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">📋 Lease Applications</h1>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e7e7e7', fontFamily: 'inherit', fontSize: 14 }}
        >
          {STATUS_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Applications table */}
      <div>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Applicant</th><th>Property</th><th>City</th><th>Status</th><th>Updated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: '#6b6b6b', bg: '#f5f5f5' };
                  return (
                    <tr
                      key={app.id}
                      style={{ cursor: 'pointer', background: selectedApp?.id === app.id ? '#f0f4ff' : undefined }}
                      onClick={() => openDetail(app.id)}
                    >
                        <td style={{ fontWeight: 600, color: '#6b6b6b' }}>#{app.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.user_name}</div>
                          <div style={{ fontSize: 12, color: '#6b6b6b' }}>{app.user_email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, maxWidth: 180 }}>{app.property_title}</div>
                        </td>
                        <td>{app.city_name}<br /><span style={{ fontSize: 11, color: '#6b6b6b' }}>{app.state_name}</span></td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            color: statusInfo.color, background: statusInfo.bg,
                          }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#6b6b6b' }}>
                          {new Date(app.updated_at).toLocaleDateString()}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {app.status === 'step1_pending' && (
                              <>
                                <button className="btn btn-sm" style={{ background: '#e6f4ea', color: '#1e7e34', fontSize: 11 }} onClick={() => openAction('step1_approved', app.id)}>Approve</button>
                                <button className="btn btn-sm" style={{ background: '#fce8e6', color: '#c62828', fontSize: 11 }} onClick={() => openAction('step1_rejected', app.id)}>Reject</button>
                                <button className="btn btn-sm" style={{ background: '#fef3e2', color: '#7b3f00', fontSize: 11 }} onClick={() => openAction('step1_info_requested', app.id)}>Ask Info</button>
                              </>
                            )}
                            {app.status === 'step2_pending' && (
                              <>
                                <button className="btn btn-sm" style={{ background: '#e6f4ea', color: '#1e7e34', fontSize: 11 }} onClick={() => openAction('step2_approved', app.id)}>Approve</button>
                                <button className="btn btn-sm" style={{ background: '#fce8e6', color: '#c62828', fontSize: 11 }} onClick={() => openAction('step2_rejected', app.id)}>Reject</button>
                                <button className="btn btn-sm" style={{ background: '#fef3e2', color: '#7b3f00', fontSize: 11 }} onClick={() => openAction('step2_clarification_requested', app.id)}>Clarify</button>
                              </>
                            )}
                            {app.status === 'appointment_pending' && (
                              <>
                                <button className="btn btn-sm" style={{ background: '#e6f4ea', color: '#1e7e34', fontSize: 11 }} onClick={async () => { const d = await api.get(`/api/admin/leasing/applications/${app.id}`); openAction('appt_confirm', app.id, d.data.appointment?.id, d.data.appointment); }}>Confirm</button>
                                <button className="btn btn-sm" style={{ background: '#E3F2FD', color: '#1E88E5', fontSize: 11 }} onClick={async () => { const d = await api.get(`/api/admin/leasing/applications/${app.id}`); openAction('appt_reschedule', app.id, d.data.appointment?.id, d.data.appointment); }}>Reschedule</button>
                                <button className="btn btn-sm" style={{ background: '#fce8e6', color: '#c62828', fontSize: 11 }} onClick={async () => { const d = await api.get(`/api/admin/leasing/applications/${app.id}`); openAction('appt_cancel', app.id, d.data.appointment?.id, null); }}>Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {applications.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No applications found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full-screen detail modal */}
      {(selectedApp || detailLoading) && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', paddingLeft:'calc(220px + 20px)', paddingRight:20, paddingTop:20, paddingBottom:20, animation:'fadeIn 0.2s ease' }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            style={{ background:'#fff', width:'85%', maxWidth:1000, maxHeight:'90vh', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'2px solid #E3F2FD', flexShrink:0, background:'#fff' }}>
              <div>
                <div style={{ fontSize:12, color:'#888', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Lease Application</div>
                <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0D2B6B' }}>
                  Application #{selectedApp?.id}
                  {selectedApp && (() => {
                    const si = STATUS_LABELS[selectedApp.status] || { label: selectedApp.status, color: '#6b6b6b', bg: '#f5f5f5' };
                    return <span style={{ marginLeft:12, padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:700, color:si.color, background:si.bg }}>{si.label}</span>;
                  })()}
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                title="Close (Esc)"
                style={{ background:'#F5F5F5', border:'none', borderRadius:'50%', width:36, height:36, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
              >✕</button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY:'auto', flex:1, padding:'24px' }}>
              {detailLoading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : selectedApp && (
                <>
                  {/* Status note */}
                  {selectedApp.admin_note && (
                    <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13, color:'#555' }}>
                      <strong>Admin Note:</strong> {selectedApp.admin_note}
                    </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    {/* Left column */}
                    <div>
                      {/* Property */}
                      <div style={{ background:'#F0F7FF', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#0D2B6B', marginBottom:4 }}>{selectedApp.property_title}</div>
                        <div style={{ fontSize:12, color:'#6b6b6b' }}>📍 {selectedApp.property_address} · {selectedApp.city_name}</div>
                      </div>

                      {/* Applicant info */}
                      <div style={{ fontWeight:700, fontSize:12, color:'#6b6b6b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Applicant</div>
                      <InfoRow label="Name" value={selectedApp.user_name} />
                      <InfoRow label="Email" value={selectedApp.user_email} />

                      <div style={{ fontWeight:700, fontSize:12, color:'#6b6b6b', textTransform:'uppercase', letterSpacing:0.5, margin:'16px 0 8px' }}>Step 1 — Screening</div>
                      <InfoRow label="Full Name" value={selectedApp.full_name} />
                      <InfoRow label="Phone" value={selectedApp.phone} />
                      <InfoRow label="Email" value={selectedApp.email} />
                      <InfoRow label="Current Address" value={selectedApp.current_address} />
                      <InfoRow label="Monthly Income" value={selectedApp.monthly_income ? `$${Number(selectedApp.monthly_income).toLocaleString()}` : null} />
                      <InfoRow label="Occupants" value={selectedApp.num_occupants?.toString()} />
                      <InfoRow label="Reason to Move" value={selectedApp.reason_for_moving} />
                    </div>

                    {/* Right column */}
                    <div>
                      {/* Step 2 */}
                      {selectedApp.step2 && (
                        <>
                          <div style={{ fontWeight:700, fontSize:12, color:'#6b6b6b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Step 2 — Full Application</div>
                          {selectedApp.step2.id_photo && (
                            <div style={{ marginBottom:8 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'#6b6b6b', marginRight:6 }}>ID Photo:</span>
                              <a href={`${API_URL}/uploads/${selectedApp.step2.id_photo}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#1E88E5', fontWeight:600 }}>View ↗</a>
                            </div>
                          )}
                          {selectedApp.step2.income_proof && (
                            <div style={{ marginBottom:8 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'#6b6b6b', marginRight:6 }}>Income Proof:</span>
                              <a href={`${API_URL}/uploads/${selectedApp.step2.income_proof}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#1E88E5', fontWeight:600 }}>View ↗</a>
                            </div>
                          )}
                          {selectedApp.step2.rental_history && (
                            <div style={{ marginBottom:8 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'#6b6b6b', marginRight:6 }}>Rental History:</span>
                              <a href={`${API_URL}/uploads/${selectedApp.step2.rental_history}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#1E88E5', fontWeight:600 }}>View ↗</a>
                            </div>
                          )}
                          <InfoRow label="Emergency Contact" value={selectedApp.step2.emergency_contact_name} />
                          <InfoRow label="Contact Phone" value={selectedApp.step2.emergency_contact_phone} />
                          <InfoRow label="Relationship" value={selectedApp.step2.emergency_contact_relation} />
                        </>
                      )}

                      {/* Appointment */}
                      {selectedApp.appointment && (
                        <>
                          <div style={{ fontWeight:700, fontSize:12, color:'#6b6b6b', textTransform:'uppercase', letterSpacing:0.5, margin:'16px 0 8px' }}>Appointment</div>
                          <InfoRow label="Requested Date" value={fmtDate(selectedApp.appointment.requested_date)} />
                          <InfoRow label="Requested Time" value={formatTime(selectedApp.appointment.requested_time)} />
                          {selectedApp.appointment.confirmed_date && <InfoRow label="Confirmed Date" value={fmtDate(selectedApp.appointment.confirmed_date)} />}
                          {selectedApp.appointment.confirmed_time && <InfoRow label="Confirmed Time" value={formatTime(selectedApp.appointment.confirmed_time)} />}
                          {selectedApp.appointment.admin_note && <InfoRow label="Admin Note" value={selectedApp.appointment.admin_note} />}
                        </>
                      )}

                      {/* Actions */}
                      <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:8 }}>
                        {selectedApp.status === 'step1_pending' && (
                          <>
                            <button className="btn btn-sm" style={{ background:'#1e7e34', color:'white', width:'100%' }} onClick={() => openAction('step1_approved', selectedApp.id)}>✓ Approve Step 1</button>
                            <button className="btn btn-sm" style={{ background:'#fce8e6', color:'#c62828', width:'100%' }} onClick={() => openAction('step1_rejected', selectedApp.id)}>✕ Reject</button>
                            <button className="btn btn-sm" style={{ background:'#fef3e2', color:'#7b3f00', width:'100%' }} onClick={() => openAction('step1_info_requested', selectedApp.id)}>📋 Ask for More Info</button>
                          </>
                        )}
                        {selectedApp.status === 'step2_pending' && (
                          <>
                            <button className="btn btn-sm" style={{ background:'#1e7e34', color:'white', width:'100%' }} onClick={() => openAction('step2_approved', selectedApp.id)}>✓ Approve Full Application</button>
                            <button className="btn btn-sm" style={{ background:'#fce8e6', color:'#c62828', width:'100%' }} onClick={() => openAction('step2_rejected', selectedApp.id)}>✕ Reject</button>
                            <button className="btn btn-sm" style={{ background:'#fef3e2', color:'#7b3f00', width:'100%' }} onClick={() => openAction('step2_clarification_requested', selectedApp.id)}>📋 Ask Clarification</button>
                          </>
                        )}
                        {selectedApp.status === 'appointment_pending' && selectedApp.appointment && (
                          <>
                            <button className="btn btn-sm" style={{ background:'#1e7e34', color:'white', width:'100%' }} onClick={() => openAction('appt_confirm', selectedApp.id, selectedApp.appointment.id, selectedApp.appointment)}>✓ Confirm Appointment</button>
                            <button className="btn btn-sm" style={{ background:'#E3F2FD', color:'#1E88E5', width:'100%' }} onClick={() => openAction('appt_reschedule', selectedApp.id, selectedApp.appointment.id, selectedApp.appointment)}>📅 Reschedule</button>
                            <button className="btn btn-sm" style={{ background:'#fce8e6', color:'#c62828', width:'100%' }} onClick={() => openAction('appt_cancel', selectedApp.id, selectedApp.appointment.id, null)}>✕ Cancel Appointment</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && meta && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: meta.btnColor }}>{meta.title}</h2>
            {actionError && <div className="form-error">{actionError}</div>}

            {/* Confirm appointment: show requested time and allow override */}
            {actionModal.type === 'appt_confirm' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 12 }}>
                  Confirming at the requested time, or change the date/time below:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Confirmed Date</label>
                    <input type="date" value={confirmDate} onChange={e => setConfirmDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Confirmed Time</label>
                    <input type="time" value={confirmTime} onChange={e => setConfirmTime(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Reschedule: require new date and time */}
            {actionModal.type === 'appt_reschedule' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>New Date *</label>
                    <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>New Time *</label>
                    <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} required />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{meta.noteLabel}</label>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                rows={3}
                placeholder="Add a note for the applicant..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: meta.btnColor, color: 'white' }}
                disabled={actioning}
                onClick={handleStatusAction}
              >
                {actioning ? 'Processing...' : meta.title}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
