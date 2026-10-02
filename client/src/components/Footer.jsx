import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white mt-auto py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs select-none">
              B
            </div>
            <span className="text-sm font-semibold text-zinc-800">BookEase</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link to="/browse" className="hover:text-blue-600 transition-colors">Browse</Link>
            <Link to="/signup" className="hover:text-blue-600 transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Log In</Link>
          </div>

          {/* Copy */}
          <p className="text-xs text-zinc-500">
            © {year} BookEase. Local service marketplace.
          </p>
        </div>
      </div>
    </footer>
  );
}
