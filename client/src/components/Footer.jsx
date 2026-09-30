import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">BookEase</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            <Link to="/browse" className="hover:text-zinc-400 transition-colors">Browse</Link>
            <span>·</span>
            <Link to="/signup" className="hover:text-zinc-400 transition-colors">Sign Up</Link>
            <span>·</span>
            <Link to="/login" className="hover:text-zinc-400 transition-colors">Login</Link>
          </div>

          {/* Copy */}
          <p className="text-xs text-zinc-700 flex items-center gap-1">
            © {year} BookEase — Built with <Heart className="w-3 h-3 text-rose-500/70 mx-0.5" /> in India
          </p>
        </div>
      </div>
    </footer>
  );
}
