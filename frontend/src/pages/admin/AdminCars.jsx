import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const EMPTY_FORM = { cityId: '', make: '', model: '', year: new Date().getFullYear(), fuelType: 'Gasoline', seats: 5, pricePerDay: '', available: true };
const FUEL_TYPES = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'];

export default function AdminCars() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [cars, setCars] = useState([]);
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
    loadCars();
  }, []);

  const loadCars = async (cityId = '') => {
    setLoading(true);
    const url = cityId ? `/api/admin/cars?cityId=${cityId}` : '/api/admin/cars';
    const { data } = await api.get(url);
    setCars(data);
    setLoading(false);
  };

  const handleFilterState = async (stateId) => {
    setFilterState(stateId);
    setFilterCity('');
    setCities([]);
    setCars([]);
    if (!stateId) { loadCars(); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
    loadCars();
  };

  const handleFilterCity = (cityId) => {
    setFilterCity(cityId);
    loadCars(cityId);
  };

  const handleFormState = async (stateId) => {
    setForm(f => ({ ...f, cityId: '', stateId }));
    if (!stateId) { setCities([]); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setPhotos([]);
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (car) => {
    setForm({
      cityId: car.city_id, make: car.make, model: car.model, year: car.year,
      fuelType: car.fuel_type, seats: car.seats, pricePerDay: car.price_per_day,
      available: car.available,
    });
    setPhotos([]);
    setEditId(car.id);
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
        await api.put(`/api/admin/cars/${editId}`, fd);
      } else {
        await api.post('/api/admin/cars', fd);
      }
      setShowModal(false);
      loadCars(filterCity);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this car? This cannot be undone.')) return;
    await api.delete(`/api/admin/cars/${id}`);
    loadCars(filterCity);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🚗 Cars</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Car</button>
      </div>

      {/* Filters */}
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
              <tr>
                <th>Car</th><th>City</th><th>Fuel / Seats</th><th>Price/Day</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(car => (
                <tr key={car.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {car.photos?.[0] ? (
                        <img src={`${API_URL}/uploads/${car.photos[0]}`} alt="" style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ width: 50, height: 36, background: '#e8f0fe', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚗</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{car.year} {car.make} {car.model}</div>
                      </div>
                    </div>
                  </td>
                  <td>{car.city_name}<br /><span style={{ fontSize: 12, color: '#6b6b6b' }}>{car.state_name}</span></td>
                  <td>{car.fuel_type} · {car.seats} seats</td>
                  <td style={{ fontWeight: 700 }}>${Number(car.price_per_day).toFixed(2)}</td>
                  <td><span className={`badge ${car.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{car.available ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(car)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {cars.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No cars yet. Click "+ Add Car" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? 'Edit Car' : 'Add Car'}</h2>
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
                <div className="form-group">
                  <label>Make *</label>
                  <input placeholder="Toyota" value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Model *</label>
                  <input placeholder="Camry" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Year *</label>
                  <input type="number" min="1990" max="2030" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Seats *</label>
                  <input type="number" min="1" max="15" value={form.seats} onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Fuel Type *</label>
                  <select value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}>
                    {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Price per Day ($) *</label>
                  <input type="number" min="0" step="0.01" placeholder="89.99" value={form.pricePerDay} onChange={e => setForm(f => ({ ...f, pricePerDay: e.target.value }))} required />
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
                  {saving ? 'Saving...' : editId ? 'Update Car' : 'Add Car'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
