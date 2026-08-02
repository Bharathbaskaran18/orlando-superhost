import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const EMPTY_FORM = {
  cityId: '', title: '', address: '',
  numRooms: '', numBedrooms: '', numBathrooms: '',
  pricePerMonth: '', available: true,
};

export default function AdminLeasing() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formStateId, setFormStateId] = useState('');
  const [formCities, setFormCities] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/states').then(r => setStates(r.data));
    loadProperties();
  }, []);

  const loadProperties = async (cityId = '') => {
    setLoading(true);
    const url = cityId ? `/api/admin/leasing/properties?cityId=${cityId}` : '/api/admin/leasing/properties';
    const { data } = await api.get(url);
    setProperties(data);
    setLoading(false);
  };

  const handleFilterState = async (stateId) => {
    setFilterState(stateId);
    setFilterCity('');
    setCities([]);
    if (!stateId) { loadProperties(); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
    loadProperties();
  };

  const handleFilterCity = (cityId) => {
    setFilterCity(cityId);
    loadProperties(cityId);
  };

  const handleFormState = async (stateId) => {
    setFormStateId(stateId);
    setForm(f => ({ ...f, cityId: '' }));
    if (!stateId) { setFormCities([]); return; }
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setFormCities(data);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormStateId('');
    setFormCities([]);
    setPhotos([]);
    setPdfFile(null);
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = async (prop) => {
    const stateRes = await api.get(`/api/admin/cities?stateId=`).catch(() => ({ data: [] }));
    const cityData = await api.get(`/api/admin/cities`).then(r => r.data);
    const city = cityData.find(c => c.id === prop.city_id);
    if (city) {
      setFormStateId(city.state_id);
      const { data } = await api.get(`/api/admin/cities?stateId=${city.state_id}`);
      setFormCities(data);
    }
    setForm({
      cityId: prop.city_id,
      title: prop.title,
      address: prop.address,
      numRooms: prop.num_rooms,
      numBedrooms: prop.num_bedrooms,
      numBathrooms: prop.num_bathrooms,
      pricePerMonth: prop.price_per_month,
      available: prop.available,
    });
    setPhotos([]);
    setPdfFile(null);
    setEditId(prop.id);
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
      if (pdfFile) fd.append('leaseAgreementPdf', pdfFile);
      if (editId) {
        await api.put(`/api/admin/leasing/properties/${editId}`, fd);
      } else {
        await api.post('/api/admin/leasing/properties', fd);
      }
      setShowModal(false);
      loadProperties(filterCity);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this property? All related applications will also be deleted.')) return;
    await api.delete(`/api/admin/leasing/properties/${id}`);
    loadProperties(filterCity);
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🏡 Lease Properties</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Property</button>
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
              <tr>
                <th>Property</th><th>City</th><th>Rooms / Beds / Baths</th><th>Price/Month</th><th>Files</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.photos?.[0] ? (
                        <img src={`${API_URL}/uploads/${p.photos[0]}`} alt="" style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{ width: 54, height: 40, background: 'linear-gradient(135deg, #1a237e, #3949ab)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏡</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: '#6b6b6b' }}>{p.address}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.city_name}<br /><span style={{ fontSize: 12, color: '#6b6b6b' }}>{p.state_name}</span></td>
                  <td>{p.num_rooms} rooms · {p.num_bedrooms} bed · {p.num_bathrooms} bath</td>
                  <td style={{ fontWeight: 700 }}>${Number(p.price_per_month).toLocaleString()}</td>
                  <td>
                    {p.photos?.length > 0 && <span style={{ fontSize: 12, color: '#1E88E5' }}>📷 {p.photos.length}</span>}
                    {p.lease_agreement_pdf && (
                      <a href={`${API_URL}/uploads/${p.lease_agreement_pdf}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: '#1E88E5' }}>📄 PDF</a>
                    )}
                  </td>
                  <td><span className={`badge ${p.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{p.available ? 'Available' : 'Unavailable'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No properties yet. Click "+ Add Property" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2>{editId ? 'Edit Property' : 'Add Lease Property'}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>State *</label>
                  <select value={formStateId} onChange={e => handleFormState(e.target.value)} required>
                    <option value="">— Select State —</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>City *</label>
                  <select value={form.cityId} onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))} required>
                    <option value="">— Select City —</option>
                    {formCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Property Title *</label>
                  <input placeholder="e.g. Sunny 2BR Apartment" value={form.title} onChange={set('title')} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Address *</label>
                  <input placeholder="123 Main St, City, State ZIP" value={form.address} onChange={set('address')} required />
                </div>
                <div className="form-group">
                  <label>Total Rooms *</label>
                  <input type="number" min="1" value={form.numRooms} onChange={set('numRooms')} required />
                </div>
                <div className="form-group">
                  <label>Bedrooms *</label>
                  <input type="number" min="0" value={form.numBedrooms} onChange={set('numBedrooms')} required />
                </div>
                <div className="form-group">
                  <label>Bathrooms *</label>
                  <input type="number" min="1" value={form.numBathrooms} onChange={set('numBathrooms')} required />
                </div>
                <div className="form-group">
                  <label>Price per Month ($) *</label>
                  <input type="number" min="0" step="50" value={form.pricePerMonth} onChange={set('pricePerMonth')} placeholder="1500" required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Photos (up to 10)</label>
                  <input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files))} />
                  {photos.length > 0 && <span style={{ fontSize: 12, color: '#6b6b6b' }}>{photos.length} photo(s) selected</span>}
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Lease Agreement PDF</label>
                  <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0])} />
                  {pdfFile && <span style={{ fontSize: 12, color: '#6b6b6b' }}>{pdfFile.name}</span>}
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} />
                    Available for lease applications
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Property' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
