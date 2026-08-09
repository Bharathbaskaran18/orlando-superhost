import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const EMPTY_FORM = {
  cityId: '', stateId: '', name: '', address: '',
  rooms: 2, bedrooms: 1, bathrooms: 1,
  pricePerMonth: '', depositAmount: '0',
  minRentalMonths: '1', maxRentalMonths: '12',
  available: true,
};

export default function AdminHouses() {
  const [states, setStates]         = useState([]);
  const [cities, setCities]         = useState([]);
  const [houses, setHouses]         = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [photos, setPhotos]         = useState([]);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError]   = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deleting, setDeleting]         = useState(false);

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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setPhotos([]);
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = async (h) => {
    setForm({
      cityId:           h.city_id,
      stateId:          h.state_id || '',
      name:             h.name,
      address:          h.address,
      rooms:            h.rooms,
      bedrooms:         h.bedrooms || 1,
      bathrooms:        h.bathrooms,
      pricePerMonth:    h.price_per_month,
      depositAmount:    h.deposit_amount || '0',
      minRentalMonths:  h.min_rental_months || '1',
      maxRentalMonths:  h.max_rental_months || '12',
      available:        h.available,
    });
    if (h.state_id) {
      const { data } = await api.get(`/api/admin/cities?stateId=${h.state_id}`);
      setCities(data);
    }
    setPhotos([]);
    setEditId(h.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (parseInt(form.minRentalMonths) > parseInt(form.maxRentalMonths)) {
      setError('Minimum rental period cannot be greater than maximum rental period');
      return;
    }
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

  const handleDelete = (id, name) => {
    setDeleteTarget({ id, label: name });
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/api/admin/houses/${deleteTarget.id}`);
      setHouses(prev => prev.filter(h => h.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteSuccess('House deleted successfully');
      setTimeout(() => setDeleteSuccess(''), 4000);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete house');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🏠 Houses</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add House</button>
      </div>

      {deleteSuccess && (
        <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 8, padding: '10px 16px', marginBottom: 12, color: '#2E7D32', fontWeight: 600 }}>
          {deleteSuccess}
        </div>
      )}

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
              <tr><th>House</th><th>City</th><th>Bed/Bath</th><th>Price/Month</th><th>Deposit</th><th>Rental Period</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {houses.map(h => (
                <tr key={h.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {h.photos?.[0] ? (
                        <img src={`${API_URL}/uploads/${h.photos[0]}`} alt="" style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 50, height: 36, background: 'linear-gradient(135deg,#1565C0,#42A5F5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏠</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: '#6b6b6b' }}>{h.address}</div>
                      </div>
                    </div>
                  </td>
                  <td>{h.city_name}<br /><span style={{ fontSize: 12, color: '#6b6b6b' }}>{h.state_name}</span></td>
                  <td>{h.bedrooms || h.rooms} bed · {h.bathrooms} bath</td>
                  <td style={{ fontWeight: 700 }}>${Number(h.price_per_month || 0).toFixed(2)}</td>
                  <td>${Number(h.deposit_amount || 0).toFixed(2)}</td>
                  <td>{h.min_rental_months}–{h.max_rental_months} mo</td>
                  <td><span className={`badge ${h.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{h.available ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h.id, h.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {houses.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No houses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => { setDeleteTarget(null); setDeleteError(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Delete House?</h2>
            <p style={{ margin: '12px 0 20px' }}>
              Are you sure you want to delete <strong>{deleteTarget.label}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#C62828', fontWeight: 600 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setDeleteTarget(null); setDeleteError(''); }} disabled={deleting}>Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editId ? 'Edit House' : 'Add House'}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* Location */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>State *</label>
                  <select value={form.stateId || ''} onChange={e => handleFormState(e.target.value)} required={!editId}>
                    <option value="">— Select State —</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>City *</label>
                  <select value={form.cityId} onChange={set('cityId')} required>
                    <option value="">— Select City —</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Property Name *</label>
                  <input placeholder="Cozy Downtown Loft" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Address *</label>
                  <input placeholder="123 Main St, Orlando, FL 32801" value={form.address} onChange={set('address')} required />
                </div>

                {/* Room Details */}
                <div className="form-group">
                  <label>Total Rooms</label>
                  <input type="number" min="1" value={form.rooms} onChange={set('rooms')} required />
                </div>
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input type="number" min="0" value={form.bedrooms} onChange={set('bedrooms')} />
                </div>
                <div className="form-group">
                  <label>Bathrooms *</label>
                  <input type="number" min="1" step="0.5" value={form.bathrooms} onChange={set('bathrooms')} required />
                </div>

                {/* Pricing */}
                <div className="form-group">
                  <label>Price per Month ($) *</label>
                  <input type="number" min="0" step="0.01" placeholder="1500.00" value={form.pricePerMonth} onChange={set('pricePerMonth')} required />
                </div>
                <div className="form-group">
                  <label>Security Deposit ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="1500.00" value={form.depositAmount} onChange={set('depositAmount')} />
                </div>
                <div className="form-group">
                  <label>Minimum Rental Period (months)</label>
                  <input type="number" min="1" placeholder="1" value={form.minRentalMonths} onChange={set('minRentalMonths')} />
                </div>
                <div className="form-group">
                  <label>Maximum Rental Period (months)</label>
                  <input type="number" min="1" placeholder="12" value={form.maxRentalMonths} onChange={set('maxRentalMonths')} />
                </div>

                {/* Photos */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Photos (up to 10)</label>
                  <input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files))} />
                  {photos.length > 0 && <span style={{ fontSize: 12, color: '#6b6b6b' }}>{photos.length} file(s) selected</span>}
                </div>

                {/* Toggles */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.available} onChange={setCheck('available')} />
                    Available for Booking
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
