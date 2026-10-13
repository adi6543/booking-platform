import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  CalendarDays, LayoutDashboard, BookOpen, LogOut, Home, Menu, X, BarChart3,
  Layers, UserPlus, LogIn, Sparkles
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) =>
    pathname === path
      ? 'text-blue-600 font-semibold border-b-2 border-blue-600 rounded-none'
      : 'text-zinc-600 hover:text-zinc-900 font-medium border-b-2 border-transparent';

  const navLinks = user
    ? [
        { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
        ...(user.role === 'customer'
          ? [
              { to: '/browse',      label: 'Browse Slots', icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/my-bookings', label: 'My Bookings',  icon: <BookOpen className="w-4 h-4" /> },
            ]
          : [
              { to: '/vendor/dashboard', label: 'Dashboard',    icon: <BarChart3 className="w-4 h-4" /> },
              { to: '/vendor/slots',     label: 'Manage Slots', icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/vendor/bookings',  label: 'Bookings',     icon: <LayoutDashboard className="w-4 h-4" /> },
            ]),
      ]
    : [
        { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
        { to: '/browse', label: 'Browse Slots', icon: <CalendarDays className="w-4 h-4" /> },
      ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-xs transition-shadow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={closeMobile}>
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-xs select-none">
              B
            </div>
            <span className="font-bold text-zinc-900 tracking-tight text-base flex items-center gap-1.5">
              BookEase
              <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Live
              </span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-6 h-full">
            {navLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 h-full px-1 text-sm transition-colors ${isActive(to)}`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold select-none">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-zinc-800 max-w-[120px] truncate">{user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize">
                    {user.role}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { logout(); closeMobile(); }}
                  className="hidden sm:inline-flex text-zinc-600 hover:text-zinc-900 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-zinc-900 text-xs sm:text-sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm shadow-xs">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}

            {/* Universal Mobile Hamburger Button */}
            <button
              className="sm:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-zinc-800" /> : <Menu className="w-5 h-5 text-zinc-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-white px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md">
          {user ? (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-2 bg-zinc-50 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-800 text-sm font-bold">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-zinc-900 font-semibold truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
              </div>
            </div>
          ) : null}

          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMobile}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === to ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}

          {!user ? (
            <div className="pt-2 border-t border-zinc-100 space-y-2">
              <Link
                to="/login"
                onClick={closeMobile}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200"
              >
                <LogIn className="w-4 h-4 text-zinc-500" />
                <span>Log in</span>
              </Link>
              <Link
                to="/signup"
                onClick={closeMobile}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account / Register Vendor</span>
              </Link>
            </div>
          ) : (
            <div className="pt-2 border-t border-zinc-100">
              <button
                onClick={() => { logout(); closeMobile(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
