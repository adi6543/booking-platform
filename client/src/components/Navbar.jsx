import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  CalendarDays, LayoutDashboard, BookOpen, LogOut, Home, Sparkles, Menu, X
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) =>
    pathname === path
      ? 'text-violet-400 bg-violet-500/10'
      : 'text-zinc-400 hover:text-white hover:bg-white/5';

  const navLinks = user
    ? [
        { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
        ...(user.role === 'customer'
          ? [
              { to: '/browse',      label: 'Browse',      icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/my-bookings', label: 'My Bookings', icon: <BookOpen className="w-4 h-4" /> },
            ]
          : [
              { to: '/vendor/slots',    label: 'Manage Slots', icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/vendor/bookings', label: 'Bookings',     icon: <LayoutDashboard className="w-4 h-4" /> },
            ]),
      ]
    : [];

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0" onClick={closeMobile}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">BookEase</span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive(to)}`}
                >
                  {icon} {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side — desktop */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold select-none">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-zinc-300 max-w-[120px] truncate">{user.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/5 capitalize">
                    {user.role}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { logout(); closeMobile(); }}
                  className="text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
                {/* Mobile hamburger */}
                <button
                  className="sm:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(v => !v)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && user && (
        <div className="sm:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="h-px bg-white/[0.06] mb-2" />
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMobile}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive(to)}`}
            >
              {icon} {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
