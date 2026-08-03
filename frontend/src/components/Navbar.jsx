import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const [scrolled, setScrolled]         = useState(false);
  const [visible, setVisible]           = useState(true);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const lastY      = useRef(0);
  const dropRef    = useRef(null);
  const profileRef = useRef(null);

  // scroll hide/show + transparency on home page
  useEffect(() => {
    if (!isHomePage) { setScrolled(false); setVisible(true); return; }
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      setVisible(y < 100 ? true : y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHomePage]);

  // close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setBookingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // close dropdowns on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setBookingsOpen(false); setProfileOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close dropdowns on navigation
  useEffect(() => { setBookingsOpen(false); setProfileOpen(false); }, [location.pathname]);

  const navBg  = isHomePage && !scrolled ? 'rgba(21,101,192,0.82)' : '#1565C0';
  const navBlur = isHomePage && !scrolled;
  const firstName = user?.name?.split(' ')[0] || '';
  const initial   = firstName[0]?.toUpperCase() || '?';

  return (
    <>
      <style>{`
        .nb-link {
          color: rgba(255,255,255,0.85);
          font-weight: 600;
          font-size: 14px;
          padding: 7px 13px;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .nb-link:hover { background: rgba(255,255,255,0.12); color: white; }
        .nb-drop-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 20px;
          color: #1565C0 !important;
          text-decoration: none !important;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s, color 0.15s;
          background: transparent;
        }
        .nb-drop-item:hover {
          background: #E3F2FD !important;
          color: #1565C0 !important;
        }
        .nb-drop-item.nb-logout:hover {
          background: #FFEBEE !important;
          color: #c62828 !important;
        }
      `}</style>

      <nav
        className="navbar"
        style={{
          background: navBg,
          backdropFilter: navBlur ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: navBlur ? 'blur(14px)' : 'none',
          boxShadow: scrolled || !isHomePage ? '0 2px 20px rgba(21,101,192,0.25)' : '0 2px 20px rgba(0,0,0,0.1)',
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease, background 0.3s ease',
        }}
      >
        {/* Logo */}
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <Logo scale={1} variant="dark" />
        </Link>

        {/* Right side */}
        <div className="navbar-links">
          {user ? (
            <>
              {/* Home */}
              <Link to="/" className="nb-link">Home</Link>

              {/* My Bookings dropdown */}
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setBookingsOpen(o => !o)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  className="nb-link"
                >
                  My Bookings
                  <span style={{
                    fontSize: 9,
                    display: 'inline-block',
                    transition: 'transform 0.2s ease',
                    transform: bookingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▼</span>
                </button>

                {/* Dropdown panel */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                  background: '#ffffff', borderRadius: 12,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  minWidth: 190, zIndex: 9999,
                  overflow: 'hidden',
                  opacity: bookingsOpen ? 1 : 0,
                  transform: bookingsOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                  pointerEvents: bookingsOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  transformOrigin: 'top left',
                }}>
                  <Link to="/car-rental/my-rentals" className="nb-drop-item">
                    <span>🚗</span> My Rentals
                  </Link>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '0 12px' }} />
                  <Link to="/house/my-bookings" className="nb-drop-item">
                    <span>🏠</span> My House Stays
                  </Link>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '0 12px' }} />
                  <div style={{ height: 1, background: '#f0f0f0', margin: '0 12px' }} />
                  <Link to="/agent/my-bookings" className="nb-drop-item">
                    <span>🧭</span> My Agent Bookings
                  </Link>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '0 12px' }} />
                  <Link to="/leasing/my-applications" className="nb-drop-item">
                    <span>🏡</span> My Leases
                  </Link>
                </div>
              </div>

              {/* Admin Panel (admin only) */}
              {user.role === 'admin' && (
                <Link to="/admin" style={{ color: '#F57C00', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  Admin Panel
                </Link>
              )}

              {/* Profile pill + dropdown */}
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: profileOpen ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
                    border: `1.5px solid ${profileOpen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 50,
                    padding: '5px 12px 5px 5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                  }}
                  onMouseLeave={e => {
                    if (!profileOpen) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    }
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#F57C00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <span style={{ color: 'white', fontSize: 14, fontWeight: 600, lineHeight: 1 }}>
                    {firstName}
                  </span>
                  <span style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.75)',
                    display: 'inline-block',
                    transition: 'transform 0.2s ease',
                    transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▼</span>
                </button>

                {/* Profile dropdown */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: '#ffffff', borderRadius: 12,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  minWidth: 170, zIndex: 9999,
                  overflow: 'hidden',
                  opacity: profileOpen ? 1 : 0,
                  transform: profileOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                  pointerEvents: profileOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  transformOrigin: 'top right',
                }}>
                  <Link to="/profile" className="nb-drop-item" onClick={() => setProfileOpen(false)}>
                    <span>👤</span> My Profile
                  </Link>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '0 12px' }} />
                  <button
                    className="nb-drop-item nb-logout"
                    style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#c62828' }}
                    onClick={() => { setProfileOpen(false); logout(); navigate('/'); }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            </>
          ) : isHomePage ? (
            <>
              <Link to="/login" style={{
                color: 'white', border: '1.5px solid rgba(255,255,255,0.55)',
                padding: '7px 18px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14,
              }}>Login</Link>
              <Link to="/register" style={{
                background: '#F57C00', color: 'white', padding: '7px 18px',
                borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14,
              }}>Sign Up</Link>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>Login</Link>
              <Link to="/register" style={{
                background: '#F57C00', color: 'white', padding: '7px 16px',
                borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14,
              }}>Register</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
