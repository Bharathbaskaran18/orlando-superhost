import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

const NAV = [
  { path: '/admin',                       label: 'Dashboard',          icon: '📊', exact: true },
  { path: '/admin/bookings',             label: 'Bookings',            icon: '📅' },
  { path: '/admin/locations',             label: 'Locations',          icon: '🗺️' },
  { path: '/admin/cars',                  label: 'Cars',               icon: '🚗' },
  { path: '/admin/houses',               label: 'Houses',              icon: '🏠' },
  { path: '/admin/house-bookings',       label: 'House Bookings',      icon: '🛏️' },
  { path: '/admin/agents',               label: 'Agents',              icon: '🧭', exact: true },
  { path: '/admin/agent-bookings',       label: 'Agent Bookings',      icon: '📝' },
  { path: '/admin/leasing',              label: 'Leasing',             icon: '🏡', exact: true },
  { path: '/admin/leasing/applications', label: 'Lease Applications',  icon: '📋' },
];

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path, exact) => exact ? pathname === path : pathname.startsWith(path);

  return (
    <div className="admin-layout" style={{
      backgroundImage: "url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 0, pointerEvents: 'none' }} />
      <aside className="admin-sidebar" style={{ position: 'relative', zIndex: 2, background: 'rgba(21,101,192,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="admin-sidebar-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo scale={0.72} variant="dark" />
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

      <main className="admin-content" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
