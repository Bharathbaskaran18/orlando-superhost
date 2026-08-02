import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CityPage from './pages/CityPage';
import CarBooking from './pages/CarBooking';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import BookingSuccess from './pages/BookingSuccess';
import Profile from './pages/Profile';
import ManageAccount from './pages/ManageAccount';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCars from './pages/admin/AdminCars';
import AdminHouses from './pages/admin/AdminHouses';
import AdminAgents from './pages/admin/AdminAgents';
import AdminLocations from './pages/admin/AdminLocations';
import AdminBookings from './pages/admin/AdminBookings';
import AdminLeasing from './pages/admin/AdminLeasing';
import AdminLeaseApplications from './pages/admin/AdminLeaseApplications';
import AdminCarRentals from './pages/admin/AdminCarRentals';
import AdminCarRentalDetail from './pages/admin/AdminCarRentalDetail';

import CarRentalDatePicker from './pages/car-rental/CarRentalDatePicker';
import CarRentalCustomerDetails from './pages/car-rental/CarRentalCustomerDetails';
import CarRentalPayment from './pages/car-rental/CarRentalPayment';
import MyCarRentals from './pages/car-rental/MyCarRentals';
import CarRentalDetail from './pages/car-rental/CarRentalDetail';

import HouseDatePicker from './pages/house/HouseDatePicker';
import HouseCustomerDetails from './pages/house/HouseCustomerDetails';
import HousePayment from './pages/house/HousePayment';
import MyHouseBookings from './pages/house/MyHouseBookings';
import HouseBookingDetail from './pages/house/HouseBookingDetail';
import AdminHouseBookings from './pages/admin/AdminHouseBookings';
import AdminHouseBookingDetail from './pages/admin/AdminHouseBookingDetail';
import AdminAgentBookings from './pages/admin/AdminAgentBookings';
import AdminAgentBookingDetail from './pages/admin/AdminAgentBookingDetail';

import AgentDatePicker from './pages/agent/AgentDatePicker';
import AgentCustomerDetails from './pages/agent/AgentCustomerDetails';
import AgentPayment from './pages/agent/AgentPayment';
import AgentBookingDetail from './pages/agent/AgentBookingDetail';
import MyAgentBookings from './pages/agent/MyAgentBookings';

import AboutCars from './pages/about/AboutCars';
import AboutHouses from './pages/about/AboutHouses';
import AboutAgents from './pages/about/AboutAgents';
import AboutStates from './pages/about/AboutStates';

import LeaseProperties from './pages/leasing/LeaseProperties';
import LeaseApply from './pages/leasing/LeaseApply';
import MyLeaseApplications from './pages/leasing/MyLeaseApplications';
import LeaseApplicationDetail from './pages/leasing/LeaseApplicationDetail';
import LeaseStep2 from './pages/leasing/LeaseStep2';
import LeaseAppointment from './pages/leasing/LeaseAppointment';

// Lazy-load pages that import Stripe so the SDK only loads when those routes are visited
const HouseBooking = lazy(() => import('./pages/HouseBooking'));
const AgentBooking = lazy(() => import('./pages/AgentBooking'));

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
      <Route path="/city/:cityId/houses" element={<UserLayout><Suspense fallback={null}><HouseBooking /></Suspense></UserLayout>} />
      <Route path="/city/:cityId/agents" element={<UserLayout><Suspense fallback={null}><AgentBooking /></Suspense></UserLayout>} />
      <Route path="/about/cars"    element={<UserLayout><AboutCars /></UserLayout>} />
      <Route path="/about/houses"  element={<UserLayout><AboutHouses /></UserLayout>} />
      <Route path="/about/agents"  element={<UserLayout><AboutAgents /></UserLayout>} />
      <Route path="/about/states"  element={<UserLayout><AboutStates /></UserLayout>} />
      <Route path="/login" element={<UserLayout><Login /></UserLayout>} />
      <Route path="/register" element={<UserLayout><Register /></UserLayout>} />
      <Route path="/verify-otp" element={<UserLayout><VerifyOTP /></UserLayout>} />
      <Route path="/booking-success" element={<UserLayout><PrivateRoute><BookingSuccess /></PrivateRoute></UserLayout>} />
      <Route path="/profile" element={<UserLayout><PrivateRoute><Profile /></PrivateRoute></UserLayout>} />
      <Route path="/profile/manage" element={<UserLayout><PrivateRoute><ManageAccount /></PrivateRoute></UserLayout>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/cars" element={<AdminRoute><AdminCars /></AdminRoute>} />
      <Route path="/admin/houses" element={<AdminRoute><AdminHouses /></AdminRoute>} />
      <Route path="/admin/agents" element={<AdminRoute><AdminAgents /></AdminRoute>} />
      <Route path="/admin/locations" element={<AdminRoute><AdminLocations /></AdminRoute>} />
      <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
      <Route path="/admin/leasing" element={<AdminRoute><AdminLeasing /></AdminRoute>} />
      <Route path="/admin/leasing/applications" element={<AdminRoute><AdminLeaseApplications /></AdminRoute>} />
      <Route path="/admin/car-rentals" element={<AdminRoute><AdminCarRentals /></AdminRoute>} />
      <Route path="/admin/car-rentals/:id" element={<AdminRoute><AdminCarRentalDetail /></AdminRoute>} />
      <Route path="/admin/house-bookings" element={<AdminRoute><AdminHouseBookings /></AdminRoute>} />
      <Route path="/admin/house-bookings/:id" element={<AdminRoute><AdminHouseBookingDetail /></AdminRoute>} />
      <Route path="/admin/agent-bookings" element={<AdminRoute><AdminAgentBookings /></AdminRoute>} />
      <Route path="/admin/agent-bookings/:id" element={<AdminRoute><AdminAgentBookingDetail /></AdminRoute>} />
      <Route path="/car-rental/book/:carId" element={<UserLayout><PrivateRoute><CarRentalDatePicker /></PrivateRoute></UserLayout>} />
      <Route path="/car-rental/book/:carId/details" element={<UserLayout><PrivateRoute><CarRentalCustomerDetails /></PrivateRoute></UserLayout>} />
      <Route path="/car-rental/book/:carId/payment" element={<UserLayout><PrivateRoute><CarRentalPayment /></PrivateRoute></UserLayout>} />
      <Route path="/car-rental/my-rentals" element={<UserLayout><PrivateRoute><MyCarRentals /></PrivateRoute></UserLayout>} />
      <Route path="/car-rental/rental/:id" element={<UserLayout><PrivateRoute><CarRentalDetail /></PrivateRoute></UserLayout>} />
      <Route path="/house/book/:houseId" element={<UserLayout><PrivateRoute><HouseDatePicker /></PrivateRoute></UserLayout>} />
      <Route path="/house/book/:houseId/details" element={<UserLayout><PrivateRoute><HouseCustomerDetails /></PrivateRoute></UserLayout>} />
      <Route path="/house/book/:houseId/payment" element={<UserLayout><PrivateRoute><HousePayment /></PrivateRoute></UserLayout>} />
      <Route path="/house/my-bookings" element={<UserLayout><PrivateRoute><MyHouseBookings /></PrivateRoute></UserLayout>} />
      <Route path="/house/booking/:id" element={<UserLayout><PrivateRoute><HouseBookingDetail /></PrivateRoute></UserLayout>} />
      <Route path="/agent/book/:agentId" element={<UserLayout><PrivateRoute><AgentDatePicker /></PrivateRoute></UserLayout>} />
      <Route path="/agent/book/:agentId/details" element={<UserLayout><PrivateRoute><AgentCustomerDetails /></PrivateRoute></UserLayout>} />
      <Route path="/agent/book/:agentId/payment" element={<UserLayout><PrivateRoute><AgentPayment /></PrivateRoute></UserLayout>} />
      <Route path="/agent/booking/:id" element={<UserLayout><PrivateRoute><AgentBookingDetail /></PrivateRoute></UserLayout>} />
      <Route path="/agent/my-bookings" element={<UserLayout><PrivateRoute><MyAgentBookings /></PrivateRoute></UserLayout>} />
      <Route path="/city/:cityId/leasing" element={<UserLayout><LeaseProperties /></UserLayout>} />
      <Route path="/leasing/apply/:propertyId" element={<UserLayout><PrivateRoute><LeaseApply /></PrivateRoute></UserLayout>} />
      <Route path="/leasing/my-applications" element={<UserLayout><PrivateRoute><MyLeaseApplications /></PrivateRoute></UserLayout>} />
      <Route path="/leasing/application/:id" element={<UserLayout><PrivateRoute><LeaseApplicationDetail /></PrivateRoute></UserLayout>} />
      <Route path="/leasing/application/:id/step2" element={<UserLayout><PrivateRoute><LeaseStep2 /></PrivateRoute></UserLayout>} />
      <Route path="/leasing/application/:id/appointment" element={<UserLayout><PrivateRoute><LeaseAppointment /></PrivateRoute></UserLayout>} />
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
