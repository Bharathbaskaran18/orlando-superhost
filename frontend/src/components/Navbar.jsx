import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Plan<span>WithUs</span>
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, padding: '7px 10px' }}>
              Hi, {user.name.split(' ')[0]}
            </span>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ color: '#f5a623', fontWeight: 700 }}>Admin Panel</Link>
            )}
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" style={{
              background: '#f5a623',
              color: 'white',
              padding: '7px 16px',
              borderRadius: 6,
              fontWeight: 700
            }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
