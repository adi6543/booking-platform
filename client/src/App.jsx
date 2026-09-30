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
import {
  Sparkles, CalendarDays, Store, ArrowRight, ShieldCheck, IndianRupee, Star
} from 'lucide-react';

// ── Home ─────────────────────────────────────────────────────────────────────
function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-fuchsia-600/8 blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-4 py-24 sm:py-32 text-center animate-fade-up">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            India's #1 local service booking platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.08]">
            Book Local Services{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Find trusted vendors near you, browse real-time availability, and secure your slot in one tap.
            No calls. No waiting. Just book.
          </p>

          {user ? (
            <div className="flex flex-wrap justify-center gap-4">
              {user.role === 'customer' ? (
                <>
                  <Link to="/browse">
                    <Button
                      size="lg"
                      id="cta-browse"
                      className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2 shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:-translate-y-0.5"
                    >
                      Browse Services <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/my-bookings">
                    <Button size="lg" variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 gap-2">
                      My Bookings <CalendarDays className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/vendor/slots">
                    <Button
                      size="lg"
                      id="cta-manage-slots"
                      className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2 shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:-translate-y-0.5"
                    >
                      Manage Slots <CalendarDays className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/vendor/bookings">
                    <Button size="lg" variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 gap-2">
                      View Bookings <Store className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  id="cta-get-started"
                  className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2 shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:-translate-y-0.5"
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
                  Log In
                </Button>
              </Link>
            </div>
          )}

          {/* Trust indicators */}
          {!user && (
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500/70" /> Verified vendors only</span>
              <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-violet-500/70" /> Razorpay-secured payments</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="max-w-5xl mx-auto px-4 pb-24 w-full">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: <Store className="w-5 h-5 text-violet-400" />,
              color: 'from-violet-500/20 to-violet-500/5 border-violet-500/20',
              title: 'Multi-vendor',
              desc: 'Hundreds of local service providers across categories — salons, cleaning, repair, and more.',
            },
            {
              icon: <CalendarDays className="w-5 h-5 text-fuchsia-400" />,
              color: 'from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/20',
              title: 'Real-time Slots',
              desc: 'See live availability as slots open up. Double-bookings are mathematically impossible.',
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
              color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
              title: 'Secure Payments',
              desc: 'Powered by Razorpay with HMAC SHA-256 server-side verification. Cancel anytime.',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className={`relative p-6 rounded-2xl border bg-gradient-to-b text-left hover:scale-[1.02] transition-transform duration-200 ${f.color}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      {!user && (
        <section className="max-w-5xl mx-auto px-4 pb-24 w-full">
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/15 via-fuchsia-600/10 to-transparent p-10 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.65_0.27_293_/_0.15),_transparent_70%)]" />
            <h2 className="relative text-3xl font-bold text-white mb-3">Ready to get started?</h2>
            <p className="relative text-zinc-400 mb-6 max-w-md mx-auto">
              Join thousands of customers and vendors already on BookEase.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Link to="/signup">
                <Button
                  size="lg"
                  id="cta-signup-banner"
                  className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2 shadow-lg shadow-violet-500/25"
                >
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/browse">
                <Button size="lg" variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
                  Browse without signing in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
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
            <div className="min-h-screen flex flex-col">
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
