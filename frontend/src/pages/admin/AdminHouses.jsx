import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const EMPTY_FORM = { cityId: '', name: '', address: '', rooms: 2, bathrooms: 1, pricePerNight: '', available: true };

export default function AdminHouses() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [houses, setHouses] = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/states').then(r => setStates(r.data));
    loadHouses();
  }, []);

  const loadHouses = async (cityId = '') => {
    setLoading(true);
    const url = cityId ? `/api/admin/houses?cityId=${cityId}` : '/api/admin/houses';
    const { data } = await api.get(url);
    setHouses(data);
    setLoading(false);
  };

  const handleFilterState = async (stateId) => {
    setFilterState(stateId);
    setFilterCity('');
    setCities([]);
    if (!stateId) { loadHouses(); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
    loadHouses();
  };

  const handleFilterCity = (cityId) => {
    setFilterCity(cityId);
    loadHouses(cityId);
  };

  const handleFormState = async (stateId) => {
    setForm(f => ({ ...f, cityId: '', stateId }));
    if (!stateId) return;
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setPhotos([]); setEditId(null); setError(''); setShowModal(true); };

  const openEdit = (h) => {
    setForm({ cityId: h.city_id, name: h.name, address: h.address, rooms: h.rooms, bathrooms: h.bathrooms, pricePerNight: h.price_per_night, available: h.available });
    setPhotos([]);
    setEditId(h.id);
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
      photos.forEach(f => fd.append('photos', f));
      if (editId) {
        await api.put(`/api/admin/houses/${editId}`, fd);
      } else {
        await api.post('/api/admin/houses', fd);
      }
      setShowModal(false);
      loadHouses(filterCity);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this house?')) return;
    await api.delete(`/api/admin/houses/${id}`);
    loadHouses(filterCity);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🏠 Houses</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add House</button>
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
              <tr><th>House</th><th>City</th><th>Rooms / Baths</th><th>Price/Night</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {houses.map(h => (
                <tr key={h.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {h.photos?.[0] ? (
                        <img src={`${API_URL}/uploads/${h.photos[0]}`} alt="" style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 50, height: 36, background: '#e6f4ea', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏠</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: '#6b6b6b' }}>{h.address}</div>
                      </div>
                    </div>
                  </td>
                  <td>{h.city_name}<br /><span style={{ fontSize: 12, color: '#6b6b6b' }}>{h.state_name}</span></td>
                  <td>{h.rooms} rooms · {h.bathrooms} baths</td>
                  <td style={{ fontWeight: 700 }}>${Number(h.price_per_night).toFixed(2)}</td>
                  <td><span className={`badge ${h.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{h.available ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {houses.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No houses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? 'Edit House' : 'Add House'}</h2>
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
                  <label>House Name *</label>
                  <input placeholder="Cozy Downtown Loft" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Address *</label>
                  <input placeholder="123 Main St" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Rooms *</label>
                  <input type="number" min="1" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Bathrooms *</label>
                  <input type="number" min="1" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Price per Night ($) *</label>
                  <input type="number" min="0" step="0.01" placeholder="149.99" value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Photos (up to 10)</label>
                  <input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files))} />
                  {photos.length > 0 && <span style={{ fontSize: 12, color: '#6b6b6b' }}>{photos.length} file(s) selected</span>}
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
                  {saving ? 'Saving...' : editId ? 'Update House' : 'Add House'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
