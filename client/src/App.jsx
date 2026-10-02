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
import { Button } from './components/ui/button';

// ── Home ─────────────────────────────────────────────────────────────────────
function Home() {
  const { user } = useAuth();

  const categories = [
    { title: 'Plumbing', icon: '🔧', desc: 'Pipe repair, leakage, bathroom fittings' },
    { title: 'Salon & Grooming', icon: '💇', desc: 'Haircut, facial, styling, bridal' },
    { title: 'Home Cleaning', icon: '🧹', desc: 'Deep cleaning, kitchen, sofa, floor' },
    { title: 'Electrician', icon: '⚡', desc: 'Wiring, switches, fan, MCB repair' },
    { title: 'Home Tutor', icon: '📚', desc: 'Math, science, languages, test prep' },
    { title: 'Appliance Repair', icon: '🔨', desc: 'AC service, washing machine, fridge' },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 tracking-tight leading-[1.15] mb-6">
            Book a local service in your neighbourhood.
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Electricians, plumbers, salons, tutors, home cleaning — browse real-time availability and pay securely.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {user ? (
              user.role === 'customer' ? (
                <>
                  <Link to="/browse">
                    <Button size="lg" id="cta-browse" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Browse services
                    </Button>
                  </Link>
                  <Link to="/my-bookings">
                    <Button size="lg" variant="outline">
                      My Bookings
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/vendor/slots">
                    <Button size="lg" id="cta-manage-slots" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Manage Slots
                    </Button>
                  </Link>
                  <Link to="/vendor/bookings">
                    <Button size="lg" variant="outline">
                      Incoming Bookings
                    </Button>
                  </Link>
                </>
              )
            ) : (
              <>
                <Link to="/browse">
                  <Button size="lg" id="cta-browse-guest" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Browse services
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="lg" variant="outline" id="cta-vendor-signup">
                    I'm a vendor
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Real Category Grid ── */}
      <section className="max-w-5xl mx-auto px-4 py-14 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Popular Services</h2>
            <p className="text-sm text-zinc-500">Pick a category to check available slots</p>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-blue-600 hover:underline">
            View all slots →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              to="/browse"
              className="p-5 rounded-xl border border-border bg-white hover:border-zinc-300 hover:shadow-xs transition-all text-left group"
            >
              <div className="text-2xl mb-3 select-none">{cat.icon}</div>
              <h3 className="font-semibold text-zinc-900 text-base mb-1 group-hover:text-blue-600 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-normal line-clamp-2">
                {cat.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it Works (Inline steps) ── */}
      <section className="border-t border-b border-border bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-sm font-bold uppercase tracking-wider text-zinc-400 mb-8">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-blue-600 font-mono">01</span>
              <h3 className="text-base font-semibold text-zinc-900">Pick a service</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Filter by service provider or category across verified vendors.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-blue-600 font-mono">02</span>
              <h3 className="text-base font-semibold text-zinc-900">Choose a slot</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                See real-time calendar availability. No double bookings.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-blue-600 font-mono">03</span>
              <h3 className="text-base font-semibold text-zinc-900">Pay &amp; confirm</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Complete payment via UPI or cards with instant confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Statement ── */}
      <section className="py-10 text-center text-xs text-zinc-500">
        <div className="max-w-3xl mx-auto px-4">
          <p>Razorpay-secured payments · Verified local vendors · Instant confirmation</p>
        </div>
      </section>
    </div>
  );
}

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
                  <Route path="/"       element={<Home />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login"  element={<Login />} />
                  <Route path="/browse" element={<Browse />} />

                  {/* Customer-only */}
                  <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                    <Route path="/my-bookings" element={<MyBookings />} />
                  </Route>

                  {/* Vendor-only */}
                  <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
                    <Route path="/vendor/slots"    element={<VendorSlots />} />
                    <Route path="/vendor/bookings" element={<VendorBookings />} />
                  </Route>
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
