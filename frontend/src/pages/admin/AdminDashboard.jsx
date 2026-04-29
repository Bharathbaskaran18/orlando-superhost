import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>
          Welcome back! Here's what's happening.
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Bookings</div>
            <div className="stat-value">{stats?.totalBookings ?? 0}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Revenue</div>
            <div className="stat-value">${(stats?.totalRevenue ?? 0).toFixed(0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Cars</div>
            <div className="stat-value">{stats?.totalCars ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Houses</div>
            <div className="stat-value">{stats?.totalHouses ?? 0}</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Active Agents</div>
            <div className="stat-value">{stats?.totalAgents ?? 0}</div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#003580', marginBottom: 16 }}>
        Quick Actions
      </h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/admin/locations" className="btn btn-primary">🗺️ Manage Locations</Link>
        <Link to="/admin/cars" className="btn btn-primary">🚗 Manage Cars</Link>
        <Link to="/admin/houses" className="btn btn-primary">🏠 Manage Houses</Link>
        <Link to="/admin/agents" className="btn btn-primary">🧭 Manage Agents</Link>
        <Link to="/admin/bookings" className="btn btn-outline">📅 View All Bookings</Link>
      </div>

      <div style={{
        marginTop: 32, padding: 20, background: '#fff9e6', borderRadius: 12,
        border: '1px solid #f5a623', fontSize: 14, color: '#7a5000',
      }}>
        <strong>Getting started:</strong> First go to <strong>Locations</strong> to enable states and cities,
        then add Cars, Houses, and Agents for those cities. Users will only see enabled states and cities.
      </div>
    </AdminLayout>
  );
}
