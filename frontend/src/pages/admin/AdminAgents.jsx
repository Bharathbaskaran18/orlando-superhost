import { useState, useEffect } from 'react';
import api, { API_URL } from '../../utils/api';
import AdminLayout from './AdminLayout';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'Portuguese',
  'German', 'Italian', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
  'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
  'Dutch', 'Swedish', 'Polish', 'Turkish', 'Greek',
  'Hebrew', 'Thai', 'Vietnamese', 'Filipino', 'Indonesian',
];

const PILL_COLORS = [
  { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' },
  { bg: '#E3F2FD', text: '#0D2B6B', border: '#90CAF9' },
  { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  { bg: '#FCE4EC', text: '#880E4F', border: '#F48FB1' },
  { bg: '#E0F7FA', text: '#00695C', border: '#80DEEA' },
  { bg: '#F9FBE7', text: '#558B2F', border: '#C5E1A5' },
  { bg: '#E3F2FD', text: '#4527A0', border: '#B39DDB' },
];

const pillColor = (i) => PILL_COLORS[i % PILL_COLORS.length];

function LanguagePill({ lang, index, onRemove }) {
  const c = pillColor(index);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {lang}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, fontSize: 13, lineHeight: 1, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}
        >✕</button>
      )}
    </span>
  );
}

function LanguageSelector({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const toggle = (lang) => {
    onChange(value.includes(lang) ? value.filter(l => l !== lang) : [...value, lang]);
  };

  const addCustom = (raw) => {
    const trimmed = raw.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim()) return;
      const match = LANGUAGES.find(l => l.toLowerCase() === query.trim().toLowerCase());
      addCustom(match || query.trim());
    }
  };

  const suggestions = LANGUAGES.filter(
    l => l.toLowerCase().includes(query.toLowerCase()) && !value.includes(l)
  );

  const showSuggestions = focused && (query ? suggestions.length > 0 : true);
  const showAddButton = query.trim() && !LANGUAGES.some(l => l.toLowerCase() === query.trim().toLowerCase()) && !value.includes(query.trim());

  return (
    <div>
      {/* Selected pills */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {value.map((lang, i) => (
            <LanguagePill key={lang} lang={lang} index={i} onRemove={() => toggle(lang)} />
          ))}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={value.length === 0 ? 'Search or type a language...' : 'Add another language...'}
          style={{ paddingRight: showAddButton ? 80 : 14 }}
        />
        {showAddButton && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); addCustom(query); }}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: '#1565C0', color: 'white', border: 'none', borderRadius: 6,
              padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >+ Add</button>
        )}

        {/* Dropdown */}
        {showSuggestions && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
            background: '#fff', border: '1.5px solid #D0D7E3', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(21,101,192,0.12)', maxHeight: 180, overflowY: 'auto',
          }}>
            {(query ? suggestions : LANGUAGES.filter(l => !value.includes(l))).map(lang => (
              <div
                key={lang}
                onMouseDown={e => { e.preventDefault(); toggle(lang); setQuery(''); }}
                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#1a1a1a', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#EBF3FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {lang}
              </div>
            ))}
            {query && suggestions.length === 0 && !showAddButton && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: '#888' }}>Already added</div>
            )}
          </div>
        )}
      </div>

      {value.length === 0 && !focused && (
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
          Click to search, or browse: {LANGUAGES.slice(0, 5).join(', ')}…
        </div>
      )}
    </div>
  );
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_FORM = {
  cityId: '', name: '', specialty: '', hourlyRate: '', available: true, languages: [],
  depositAmount: '', availableDays: [], meetingLocation: '', bio: '',
};

export default function AdminAgents() {
  const [states, setStates]       = useState([]);
  const [cities, setCities]       = useState([]);
  const [agents, setAgents]       = useState([]);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [photo, setPhoto]         = useState(null);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError]   = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deleting, setDeleting]         = useState(false);

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

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setPhoto(null);
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (a) => {
    setForm({
      cityId: a.city_id, name: a.name, specialty: a.specialty,
      hourlyRate: a.hourly_rate, available: a.available,
      languages: Array.isArray(a.languages) ? a.languages : [],
      depositAmount: a.deposit_amount || '',
      availableDays: Array.isArray(a.available_days) ? a.available_days : [],
      meetingLocation: a.meeting_location || '',
      bio: a.bio || '',
    });
    setPhoto(null);
    setEditId(a.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.languages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('cityId',     form.cityId);
      fd.append('name',       form.name);
      fd.append('specialty',  form.specialty);
      fd.append('hourlyRate', form.hourlyRate);
      fd.append('available',  form.available);
      fd.append('languages',       JSON.stringify(form.languages));
      fd.append('depositAmount',   form.depositAmount || '0');
      fd.append('availableDays',   JSON.stringify(form.availableDays));
      fd.append('meetingLocation', form.meetingLocation || '');
      fd.append('bio',             form.bio || '');
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

  const handleDelete = (id, name) => {
    console.log('[Delete] Clicked delete for agent:', id, name);
    setDeleteTarget({ id, label: name });
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    console.log('[Delete] Confirming delete for agent id:', deleteTarget.id);
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/api/admin/agents/${deleteTarget.id}`);
      console.log('[Delete] Agent deleted successfully:', deleteTarget.id);
      setAgents(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteSuccess('Agent deleted successfully');
      setTimeout(() => setDeleteSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete agent';
      console.error('[Delete] Error:', msg);
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🧭 Agents</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Agent</button>
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
              <tr><th>Agent</th><th>City</th><th>Specialty</th><th>Languages</th><th>Rate/Hour</th><th>Status</th><th>Actions</th></tr>
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
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Array.isArray(a.languages) && a.languages.slice(0, 3).map((lang, i) => (
                        <LanguagePill key={lang} lang={lang} index={i} />
                      ))}
                      {Array.isArray(a.languages) && a.languages.length > 3 && (
                        <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>+{a.languages.length - 3} more</span>
                      )}
                      {(!a.languages || a.languages.length === 0) && (
                        <span style={{ fontSize: 12, color: '#ccc' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>${Number(a.hourly_rate).toFixed(2)}</td>
                  <td><span className={`badge ${a.available ? 'badge-confirmed' : 'badge-cancelled'}`}>{a.available ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id, a.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b6b6b', padding: 32 }}>No agents yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => { setDeleteTarget(null); setDeleteError(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Delete Agent?</h2>
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

                {/* Languages */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>
                    Languages Spoken *
                    {form.languages.length === 0 && <span style={{ color: '#E53935', marginLeft: 4, fontSize: 12 }}>required</span>}
                  </label>
                  <LanguageSelector
                    value={form.languages}
                    onChange={langs => setForm(f => ({ ...f, languages: langs }))}
                  />
                </div>

                {/* Pricing */}
                <div className="form-group">
                  <label>Deposit Amount ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} />
                </div>
                <div className="form-group">
                  {/* spacer */}
                </div>

                {/* Available Days */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Available Days <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>(leave blank = all days)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isChecked = form.availableDays.includes(day);
                      return (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, fontWeight: isChecked ? 700 : 400, color: isChecked ? '#0D2B6B' : '#444' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setForm(f => ({
                              ...f,
                              availableDays: isChecked
                                ? f.availableDays.filter(d => d !== day)
                                : [...f.availableDays, day],
                            }))}
                          />
                          {day.slice(0, 3)}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Meeting Location */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Meeting Location</label>
                  <input placeholder="e.g., Hotel Lobby, City Tourist Office, etc." value={form.meetingLocation} onChange={e => setForm(f => ({ ...f, meetingLocation: e.target.value }))} />
                </div>

                {/* Bio */}
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Bio</label>
                  <textarea placeholder="Brief description of the agent's experience and style..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ resize: 'vertical', minHeight: 80 }} />
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
