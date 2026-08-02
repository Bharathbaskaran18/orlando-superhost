import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('pwu_token');
      const storedUser = localStorage.getItem('pwu_user');
      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsed);
      }
    } catch (e) {
      localStorage.removeItem('pwu_token');
      localStorage.removeItem('pwu_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('pwu_token', newToken);
    localStorage.setItem('pwu_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('pwu_token');
    localStorage.removeItem('pwu_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('pwu_user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
