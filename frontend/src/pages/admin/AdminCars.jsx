import { useState, useEffect, useRef } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const CAR_DATA = {
  'Acura':        ['ILX', 'MDX', 'NSX', 'RDX', 'RLX', 'TLX'],
  'Alfa Romeo':   ['Giulia', 'Stelvio', 'Tonale'],
  'Aston Martin': ['DB11', 'DBX', 'DBS', 'Vantage'],
  'Audi':         ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'RS3', 'RS5', 'RS7', 'S3', 'S4', 'S5', 'TT', 'e-tron'],
  'Bentley':      ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulliner'],
  'BMW':          ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'M2', 'M3', 'M4', 'M5', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4'],
  'Buick':        ['Enclave', 'Encore', 'Envision', 'LaCrosse'],
  'Cadillac':     ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'XT6'],
  'Chevrolet':    ['Blazer', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Express', 'Impala', 'Malibu', 'Silverado', 'Suburban', 'Tahoe', 'Traverse', 'Trax'],
  'Chrysler':     ['300', 'Pacifica', 'Voyager'],
  'Dodge':        ['Challenger', 'Charger', 'Durango', 'Grand Caravan', 'Hornet'],
  'Ferrari':      ['296', 'F8', 'Roma', 'SF90'],
  'Fiat':         ['500', '500X'],
  'Ford':         ['Bronco', 'EcoSport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'F-250', 'F-350', 'Maverick', 'Mustang', 'Ranger', 'Transit'],
  'Genesis':      ['G70', 'G80', 'G90', 'GV70', 'GV80'],
  'GMC':          ['Acadia', 'Canyon', 'Savana', 'Sierra', 'Terrain', 'Yukon'],
  'Honda':        ['Accord', 'Civic', 'CR-V', 'HR-V', 'Insight', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline'],
  'Hyundai':      ['Elantra', 'Ioniq', 'Kona', 'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson', 'Venue'],
  'Infiniti':     ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  'Jaguar':       ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF'],
  'Jeep':         ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  'Kia':          ['Carnival', 'EV6', 'Forte', 'K5', 'Niro', 'Seltos', 'Soul', 'Sorento', 'Sportage', 'Stinger', 'Telluride'],
  'Lamborghini':  ['Huracan', 'Urus'],
  'Land Rover':   ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Lexus':        ['ES', 'GS', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RX', 'UX'],
  'Lincoln':      ['Aviator', 'Corsair', 'MKZ', 'Nautilus', 'Navigator'],
  'Lotus':        ['Emira', 'Evija'],
  'Maserati':     ['Ghibli', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda':        ['CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
  'McLaren':      ['Artura', 'GT', '720S', '765LT'],
  'Mercedes-Benz':['A-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'EQS', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'SL', 'AMG GT'],
  'MINI':         ['Clubman', 'Convertible', 'Countryman', 'Hardtop'],
  'Mitsubishi':   ['Eclipse Cross', 'Mirage', 'Outlander', 'Outlander Sport'],
  'Nissan':       ['Altima', 'Armada', 'Frontier', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa'],
  'Porsche':      ['718', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Ram':          ['1500', '2500', '3500', 'ProMaster'],
  'Rivian':       ['R1S', 'R1T'],
  'Rolls-Royce':  ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'],
  'Subaru':       ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX'],
  'Tesla':        ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Toyota':       ['4Runner', 'Avalon', 'Camry', 'Corolla', 'GR86', 'Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Sienna', 'Tacoma', 'Tundra', 'Venza'],
  'Volkswagen':   ['Atlas', 'Golf', 'ID.4', 'Jetta', 'Passat', 'Taos', 'Tiguan'],
  'Volvo':        ['C40', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
};

const MAKES = Object.keys(CAR_DATA).sort();
const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const EMPTY_FORM = {
  cityId: '', make: '', model: '', year: new Date().getFullYear(),
  fuelType: 'Gasoline', seats: 5, pricePerDay: '', available: true,
  licensePlate: '', vinNumber: '', mileageCapPerDay: '',
  overageRatePerMile: '', additionalDriverFeePerDay: '', cancellationFee: '', depositAmount: '',
};
const FUEL_TYPES = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'];

function MakeSelect({ value, onChange }) {
  const [query, setQuery]   = useState(value || '');
  const [open, setOpen]     = useState(false);
  const [hovered, setHov]   = useState(null);
  const containerRef        = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = MAKES.filter(m => m.toLowerCase().includes(query.toLowerCase()));

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange('');
    setOpen(true);
  };

  const handleSelect = (make) => {
    setQuery(make);
    onChange(make);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="Search car makes..."
          required
          style={{ paddingRight: 32 }}
        />
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: '#999', pointerEvents: 'none', fontSize: 12,
        }}>▾</span>
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #dce3ef', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(21,101,192,0.14)', zIndex: 9999,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(make => (
            <div
              key={make}
              onMouseDown={() => handleSelect(make)}
              onMouseEnter={() => setHov(make)}
              onMouseLeave={() => setHov(null)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: hovered === make ? '#EBF3FF' : 'transparent',
                color: hovered === make ? '#1565C0' : '#222',
                transition: 'background 0.1s',
              }}
            >
              {make}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #dce3ef', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(21,101,192,0.14)', zIndex: 9999,
          padding: '12px 14px', fontSize: 13, color: '#999',
        }}>
          No matches found
        </div>
      )}
    </div>
  );
}

// ── photo helpers ────────────────────────────────────────────────────────────

const PHOTO_SECTIONS = [
  { key: 'exterior',   field: 'exterior_photos',   label: '🚗 Exterior Photos',    sub: 'Front, back, sides of the car',       required: true },
  { key: 'interior',   field: 'interior_photos',   label: '🪑 Interior Photos',    sub: 'Dashboard, seats, back seat' },
  { key: 'additional', field: 'additional_photos', label: '📸 Additional Photos',  sub: 'Engine, trunk, special features' },
];

function PhotoSection({ section, items, onAdd, onRemove, apiUrl }) {
  const inputId = `photo-input-${section.key}`;
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (valid.length) onAdd(valid);
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1565C0', marginBottom: 2 }}>
        {section.label}{section.required && <span style={{ color: '#E53935', marginLeft: 3 }}>*</span>}
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{section.sub}</div>

      {/* Hidden file input — label below triggers it via htmlFor */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Drop zone — label so any click reliably opens the file picker */}
      <label
        htmlFor={inputId}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        style={{
          display: 'block',
          border: `2px dashed ${dragOver ? '#1565C0' : '#C5D5EA'}`,
          borderRadius: 10,
          padding: '14px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? '#EBF3FF' : '#F8FBFF',
          transition: 'all 0.2s',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
        <div style={{ fontSize: 13, color: '#1565C0', fontWeight: 600 }}>Click to upload or drag & drop</div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>JPG, PNG · Max 10MB each</div>
      </label>

      {/* Thumbnails */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map((item, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 52, borderRadius: 6, overflow: 'hidden', border: '2px solid #D0E4F7', animation: 'fadeIn 0.2s ease' }}>
              <img
                src={item.type === 'new' ? item.preview : `${apiUrl}/uploads/${item.url}`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── normalize DB photos → section state ─────────────────────────────────────

function buildSectionState(car) {
  const empty = { exterior: [], interior: [], additional: [] };
  if (!car) return empty;
  const cats = car.photos_categorized;
  if (Array.isArray(cats) && cats.length > 0) {
    const out = { exterior: [], interior: [], additional: [] };
    cats.forEach(p => {
      const cat = p.category || 'exterior';
      if (out[cat]) out[cat].push({ type: 'existing', url: p.url, category: cat });
    });
    return out;
  }
  // legacy: photos text[]
  if (Array.isArray(car.photos) && car.photos.length > 0) {
    return { exterior: car.photos.map(u => ({ type: 'existing', url: u, category: 'exterior' })), interior: [], additional: [] };
  }
  return empty;
}

export default function AdminCars() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [cars, setCars] = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoState, setPhotoState] = useState({ exterior: [], interior: [], additional: [] });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const addPhotos = (category, files) => {
    const items = files.map(file => ({ type: 'new', file, preview: URL.createObjectURL(file), category }));
    setPhotoState(ps => ({ ...ps, [category]: [...ps[category], ...items] }));
  };

  const removePhoto = (category, index) => {
    setPhotoState(ps => {
      const next = [...ps[category]];
      const item = next[index];
      if (item.type === 'new') URL.revokeObjectURL(item.preview);
      next.splice(index, 1);
      return { ...ps, [category]: next };
    });
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setPhotoState({ exterior: [], interior: [], additional: [] });
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (car) => {
    setForm({
      cityId: car.city_id, make: car.make, model: car.model, year: car.year,
      fuelType: car.fuel_type, seats: car.seats, pricePerDay: car.price_per_day,
      available: car.available,
      licensePlate: car.license_plate || '', vinNumber: car.vin_number || '',
      mileageCapPerDay: car.mileage_cap_per_day || '', overageRatePerMile: car.overage_rate_per_mile || '',
      additionalDriverFeePerDay: car.additional_driver_fee_per_day || '',
      cancellationFee: car.cancellation_fee || '', depositAmount: car.deposit_amount || '',
    });
    setPhotoState(buildSectionState(car));
    setEditId(car.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (photoState.exterior.length === 0) {
      setError('At least one exterior photo is required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // Kept existing photos
      const keptExisting = [
        ...photoState.exterior.filter(p => p.type === 'existing'),
        ...photoState.interior.filter(p => p.type === 'existing'),
        ...photoState.additional.filter(p => p.type === 'existing'),
      ].map(p => ({ url: p.url, category: p.category }));
      fd.append('existingPhotosJson', JSON.stringify(keptExisting));

      // New file uploads per category
      photoState.exterior.filter(p => p.type === 'new').forEach(p => fd.append('exterior_photos', p.file));
      photoState.interior.filter(p => p.type === 'new').forEach(p => fd.append('interior_photos', p.file));
      photoState.additional.filter(p => p.type === 'new').forEach(p => fd.append('additional_photos', p.file));

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

  const handleDelete = (id, label) => {
    console.log('[Delete] Clicked delete for car:', id, label);
    setDeleteTarget({ id, label });
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    console.log('[Delete] Confirming delete for car id:', deleteTarget.id);
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/api/admin/cars/${deleteTarget.id}`);
      console.log('[Delete] Car deleted successfully:', deleteTarget.id);
      setCars(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteSuccess('Car deleted successfully');
      setTimeout(() => setDeleteSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete car';
      console.error('[Delete] Error:', msg);
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const modelOptions = form.make && CAR_DATA[form.make] ? CAR_DATA[form.make] : [];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🚗 Cars</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Car</button>
      </div>

      {deleteSuccess && (
        <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 600 }}>
          ✅ {deleteSuccess}
        </div>
      )}

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
                        <div style={{ width: 50, height: 36, background: '#E3F2FD', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚗</div>
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
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car.id, `${car.year} ${car.make} ${car.model}`)}>Delete</button>
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

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => { setDeleteTarget(null); setDeleteError(''); }}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#C62828', marginBottom: 8 }}>Delete Car?</h2>
            <p style={{ color: '#555', marginBottom: 6 }}>
              Are you sure you want to delete <strong>{deleteTarget.label}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>
                ⚠️ {deleteError}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ background: '#C62828', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
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

                {/* Make — searchable */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Make *</label>
                  <MakeSelect
                    value={form.make}
                    onChange={make => setForm(f => ({ ...f, make, model: '' }))}
                  />
                </div>

                {/* Model — appears after make is chosen */}
                {modelOptions.length > 0 && (
                  <div
                    className="form-group"
                    style={{
                      gridColumn: '1/-1',
                      animation: 'fadeIn 0.2s ease',
                    }}
                  >
                    <label>Model *</label>
                    <select
                      value={form.model}
                      onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                      required
                    >
                      <option value="">— Select Model —</option>
                      {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}

                {/* Year dropdown */}
                <div className="form-group">
                  <label>Year *</label>
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
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
                <div className="form-group" style={{ gridColumn: '1/-1', borderTop: '1px solid #eee', paddingTop: 12, marginTop: 4 }}>
                  <label style={{ fontWeight: 700, color: '#1565C0', fontSize: 13 }}>Car Rental Details (optional)</label>
                </div>
                <div className="form-group">
                  <label>License Plate</label>
                  <input placeholder="ABC-1234" value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>VIN Number</label>
                  <input placeholder="1HGCM82633A004352" value={form.vinNumber} onChange={e => setForm(f => ({ ...f, vinNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Mileage Cap (miles/day)</label>
                  <input type="number" min="0" placeholder="150" value={form.mileageCapPerDay} onChange={e => setForm(f => ({ ...f, mileageCapPerDay: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Overage Rate ($/mile)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.25" value={form.overageRatePerMile} onChange={e => setForm(f => ({ ...f, overageRatePerMile: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Additional Driver Fee ($/day)</label>
                  <input type="number" min="0" step="0.01" placeholder="10.00" value={form.additionalDriverFeePerDay} onChange={e => setForm(f => ({ ...f, additionalDriverFeePerDay: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Cancellation Fee ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="25.00" value={form.cancellationFee} onChange={e => setForm(f => ({ ...f, cancellationFee: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Security Deposit ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="200.00" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} />
                </div>
                {/* Photo sections */}
                <div style={{ gridColumn: '1/-1', borderTop: '1px solid #eee', paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1565C0', marginBottom: 14 }}>Car Photos</div>
                  {PHOTO_SECTIONS.map(section => (
                    <PhotoSection
                      key={section.key}
                      section={section}
                      items={photoState[section.key]}
                      onAdd={(files) => addPhotos(section.key, files)}
                      onRemove={(i) => removePhoto(section.key, i)}
                      apiUrl={API_URL}
                    />
                  ))}
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
