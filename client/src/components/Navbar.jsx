import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  CalendarDays, LayoutDashboard, BookOpen, LogOut, Home, Menu, X
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
              { to: '/browse',      label: 'Browse',      icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/my-bookings', label: 'My Bookings', icon: <BookOpen className="w-4 h-4" /> },
            ]
          : [
              { to: '/vendor/slots',    label: 'Manage Slots', icon: <CalendarDays className="w-4 h-4" /> },
              { to: '/vendor/bookings', label: 'Bookings',     icon: <LayoutDashboard className="w-4 h-4" /> },
            ]),
      ]
    : [
        { to: '/browse', label: 'Browse Services', icon: <CalendarDays className="w-4 h-4" /> },
      ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={closeMobile}>
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm select-none">
              B
            </div>
            <span className="font-bold text-zinc-900 tracking-tight text-base">BookEase</span>
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

          {/* Right side — desktop */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 text-xs font-semibold select-none">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-zinc-800 max-w-[130px] truncate">{user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize">
                    {user.role}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { logout(); closeMobile(); }}
                  className="text-zinc-600 hover:text-zinc-900 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
                {/* Mobile hamburger */}
                <button
                  className="sm:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  onClick={() => setMobileOpen(v => !v)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-zinc-900">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-white px-4 py-3 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-2 bg-zinc-50 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-800 text-sm font-bold">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-zinc-900 font-medium truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMobile}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {icon} {label}
            </Link>
          ))}
          {user && (
            <button
              onClick={() => { logout(); closeMobile(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
