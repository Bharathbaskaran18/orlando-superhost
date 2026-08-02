import { useState, useEffect } from 'react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

export default function AdminLocations() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [addCityForm, setAddCityForm] = useState('');
  const [addingCity, setAddingCity] = useState(false);
  const [search, setSearch] = useState('');

  const loadStates = async () => {
    const { data } = await api.get('/api/admin/states');
    setStates(data);
    setLoading(false);
  };

  useEffect(() => { loadStates(); }, []);

  const loadCities = async (stateId) => {
    const { data } = await api.get(`/api/admin/cities?stateId=${stateId}`);
    setCities(data);
  };

  const handleSelectState = (state) => {
    setSelectedState(state);
    setAddCityForm('');
    loadCities(state.id);
  };

  const toggleState = async (state) => {
    setToggling(`state-${state.id}`);
    try {
      const { data } = await api.put(`/api/admin/states/${state.id}/toggle`);
      setStates(prev => prev.map(s => s.id === state.id ? data : s));
      if (selectedState?.id === state.id) setSelectedState(data);
    } finally {
      setToggling(null);
    }
  };

  const toggleCity = async (city) => {
    setToggling(`city-${city.id}`);
    try {
      const { data } = await api.put(`/api/admin/cities/${city.id}/toggle`);
      setCities(prev => prev.map(c => c.id === city.id ? data : c));
    } finally {
      setToggling(null);
    }
  };

  const addCity = async (e) => {
    e.preventDefault();
    if (!addCityForm.trim() || !selectedState) return;
    setAddingCity(true);
    try {
      await api.post('/api/admin/cities', { stateId: selectedState.id, name: addCityForm.trim() });
      setAddCityForm('');
      loadCities(selectedState.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add city');
    } finally {
      setAddingCity(false);
    }
  };

  const deleteCity = async (cityId) => {
    if (!confirm('Delete this city? All listings in this city will also be deleted.')) return;
    await api.delete(`/api/admin/cities/${cityId}`);
    setCities(prev => prev.filter(c => c.id !== cityId));
  };

  const filteredStates = search
    ? states.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : states;

  const enabledCount = states.filter(s => s.enabled).length;
  const enabledCityCount = cities.filter(c => c.enabled).length;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗺️ Locations</h1>
          <p style={{ color: '#6b6b6b', fontSize: 14, marginTop: 4 }}>
            {enabledCount} state{enabledCount !== 1 ? 's' : ''} enabled · Enable states and cities for users to see them
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* States panel */}
        <div>
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 16 }}>All 50 States</h3>
              <span className="badge badge-enabled">{enabledCount} enabled</span>
            </div>
            <input
              type="text"
              placeholder="Search states..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e7e7e7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              {filteredStates.map(state => (
                <div
                  key={state.id}
                  onClick={() => handleSelectState(state)}
                  style={{
                    background: selectedState?.id === state.id ? '#E3F2FD' : 'rgba(255,255,255,0.97)',
                    borderBottom: '1px solid #f5f5f5',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: '#0D2B6B', color: 'white', padding: '2px 7px',
                      borderRadius: 4, fontSize: 11, fontWeight: 700,
                    }}>
                      {state.code}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{state.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${state.enabled ? 'badge-enabled' : 'badge-disabled'}`}>
                      {state.enabled ? 'On' : 'Off'}
                    </span>
                    <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={state.enabled}
                        onChange={() => toggleState(state)}
                        disabled={toggling === `state-${state.id}`}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cities panel */}
        <div>
          {selectedState ? (
            <>
              <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 16, marginBottom: 4 }}>
                  Cities in {selectedState.name}
                </h3>
                <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 12 }}>
                  {enabledCityCount} of {cities.length} cities enabled
                </p>
                <form onSubmit={addCity} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add new city..."
                    value={addCityForm}
                    onChange={e => setAddCityForm(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e7e7e7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addingCity || !addCityForm.trim()}>
                    {addingCity ? '...' : '+ Add'}
                  </button>
                </form>
              </div>

              <div style={{ maxHeight: 520, overflowY: 'auto', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                {cities.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.97)', padding: 32, textAlign: 'center', color: '#6b6b6b', fontSize: 14, borderRadius: 12 }}>
                    No cities found for {selectedState.name}
                  </div>
                ) : (
                  cities.map(city => (
                    <div
                      key={city.id}
                      style={{
                        background: 'rgba(255,255,255,0.97)',
                        borderBottom: '1px solid #f5f5f5',
                        padding: '11px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{city.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${city.enabled ? 'badge-enabled' : 'badge-disabled'}`}>
                          {city.enabled ? 'On' : 'Off'}
                        </span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={city.enabled}
                            onChange={() => toggleCity(city)}
                            disabled={toggling === `city-${city.id}`}
                          />
                          <span className="toggle-slider" />
                        </label>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteCity(city.id)}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: 40,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', textAlign: 'center',
              color: '#6b6b6b',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <p>Select a state to manage its cities</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
