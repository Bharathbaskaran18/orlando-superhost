import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/admin/locations', label: 'Locations', icon: '🗺️' },
  { path: '/admin/cars', label: 'Cars', icon: '🚗' },
  { path: '/admin/houses', label: 'Houses', icon: '🏠' },
  { path: '/admin/agents', label: 'Agents', icon: '🧭' },
  { path: '/admin/bookings', label: 'Bookings', icon: '📅' },
];

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path, exact) => exact ? pathname === path : pathname.startsWith(path);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          Plan<span>WithUs</span>
        </div>

        {NAV.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={isActive(item.path, item.exact) ? 'active' : ''}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 32, paddingTop: 12 }}>
          <div style={{ padding: '6px 20px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            Signed in as
          </div>
          <div style={{ padding: '0 20px 6px', fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {user?.name}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)', padding: '10px 20px', textAlign: 'left',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
