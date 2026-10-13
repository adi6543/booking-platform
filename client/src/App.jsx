import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Signup from './components/Signup';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Browse from './components/Browse';
import MyBookings from './components/MyBookings';
import VendorSlots from './components/VendorSlots';
import VendorBookings from './components/VendorBookings';
import Home from './components/Home';
import VendorDashboard from './components/VendorDashboard';
import VendorProfilePage from './components/VendorProfilePage';
import ChatBot from './components/ChatBot';
import { Button } from './components/ui/button';

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public */}
                  <Route path="/"            element={<Home />} />
                  <Route path="/signup"      element={<Signup />} />
                  <Route path="/login"       element={<Login />} />
                  <Route path="/browse"      element={<Browse />} />
                  <Route path="/vendor/:id"  element={<VendorProfilePage />} />

                  {/* Customer-only */}
                  <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                    <Route path="/my-bookings" element={<MyBookings />} />
                  </Route>

                  {/* Vendor-only */}
                  <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
                    <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                    <Route path="/vendor/slots"     element={<VendorSlots />} />
                    <Route path="/vendor/bookings"  element={<VendorBookings />} />
                  </Route>
                </Routes>
              </main>
              <Footer />
              <ChatBot />
            </div>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
