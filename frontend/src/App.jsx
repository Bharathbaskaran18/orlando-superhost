import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CityPage from './pages/CityPage';
import CarBooking from './pages/CarBooking';
import HouseBooking from './pages/HouseBooking';
import AgentBooking from './pages/AgentBooking';
import Login from './pages/Login';
import Register from './pages/Register';
import BookingSuccess from './pages/BookingSuccess';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCars from './pages/admin/AdminCars';
import AdminHouses from './pages/admin/AdminHouses';
import AdminAgents from './pages/admin/AdminAgents';
import AdminLocations from './pages/admin/AdminLocations';
import AdminBookings from './pages/admin/AdminBookings';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function UserLayout({ children }) {
  return <><Navbar />{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<UserLayout><HomePage /></UserLayout>} />
      <Route path="/city/:cityId" element={<UserLayout><CityPage /></UserLayout>} />
      <Route path="/city/:cityId/cars" element={<UserLayout><CarBooking /></UserLayout>} />
      <Route path="/city/:cityId/houses" element={<UserLayout><HouseBooking /></UserLayout>} />
      <Route path="/city/:cityId/agents" element={<UserLayout><AgentBooking /></UserLayout>} />
      <Route path="/login" element={<UserLayout><Login /></UserLayout>} />
      <Route path="/register" element={<UserLayout><Register /></UserLayout>} />
      <Route path="/booking-success" element={<UserLayout><PrivateRoute><BookingSuccess /></PrivateRoute></UserLayout>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/cars" element={<AdminRoute><AdminCars /></AdminRoute>} />
      <Route path="/admin/houses" element={<AdminRoute><AdminHouses /></AdminRoute>} />
      <Route path="/admin/agents" element={<AdminRoute><AdminAgents /></AdminRoute>} />
      <Route path="/admin/locations" element={<AdminRoute><AdminLocations /></AdminRoute>} />
      <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
