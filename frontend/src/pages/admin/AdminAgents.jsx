import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const EMPTY_FORM = { cityId: '', name: '', specialty: '', hourlyRate: '', available: true };

export default function AdminAgents() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/states').then(r => setStates(r.data));
    loadAgents();
  }, []);

  const loadAgents = async (cityId = '') => {
    setLoading(true);
    const url = cityId ? `/api/admin/agents?cityId=${cityId}` : '/api/admin/agents';
    const { data } = await api.get(url);
    setAgents(data);
    setLoading(false);
  };

  const handleFilterState = async (stateId) => {
    setFilterState(stateId);
    setFilterCity('');
    setCities([]);
    if (!stateId) { loadAgents(); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
    loadAgents();
  };

  const handleFilterCity = (cityId) => {
    setFilterCity(cityId);
    loadAgents(cityId);
  };

  const handleFormState = async (stateId) => {
    setForm(f => ({ ...f, cityId: '', stateId }));
    if (!stateId) return;
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setPhoto(null); setEditId(null); setError(''); setShowModal(true); };

  const openEdit = (a) => {
    setForm({ cityId: a.city_id, name: a.name, specialty: a.specialty, hourlyRate: a.hourly_rate, available: a.available });
    setPhoto(null);
    setEditId(a.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      if (editId) {
        await api.put(`/api/admin/agents/${editId}`, fd);
      } else {
        await api.post('/api/admin/agents', fd);
      }
      setShowModal(false);
      loadAgents(filterCity);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent?')) return;
    await api.delete(`/api/admin/agents/${id}`);
    loadAgents(filterCity);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🧭 Agents</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Agent</button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Filter by State</label>
          <select value={filterState} onChange={e => handleFilterState(e.target.value)}>
            <option value="">All States</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {filterState && (
          <div className="form-group">
            <label>Filter by City</label>
            <select value={filterCity} onChange={e => handleFilterCity(e.target.value)}>
              <option value="">All Cities</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Agent</th><th>City</th><th>Specialty</th><th>Rate/Hour</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {a.photo ? (
                        <img src={`${API_URL}/uploads/${a.photo}`} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 40, height: 40, background: '#f3e5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧭</div>
                      )}
                      <span style={{ fontWeight: 700 }}>{a.name}</span>
                    </div>
                  </td>
                  <td>{a.city_name}<br /><span style={{ fontSize: 12, color: '#6b6b6b' }}>{a.state_name}</span></td>
                  <td>{a.specialty}</td>
                  <td style={{ fontWeight: 700 }}>${Number(a.hourly_rate).toFixed(2)}</td>
                  <td><span className={`badge ${a.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{a.available ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No agents yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? 'Edit Agent' : 'Add Agent'}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>State *</label>
                  <select value={form.stateId || ''} onChange={e => handleFormState(e.target.value)} required>
                    <option value="">— Select State —</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>City *</label>
                  <select value={form.cityId} onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))} required>
                    <option value="">— Select City —</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Full Name *</label>
                  <input placeholder="Sarah Johnson" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Specialty *</label>
                  <input placeholder="Adventure Tours & Hiking" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Hourly Rate ($) *</label>
                  <input type="number" min="0" step="0.01" placeholder="75.00" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Profile Photo</label>
                  <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} />
                    Available for booking
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Agent' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
