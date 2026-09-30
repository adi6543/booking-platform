import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.errors?.[0]?.message || 'Login failed');
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl space-y-6 animate-fade-up">
          {/* Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 mx-auto">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500">Log in to your BookEase account</p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
              <Input
                id="email" type="email" name="email" required
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
              <Input
                id="password" type="password" name="password" required
                value={formData.password} onChange={handleChange}
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white border-0 font-medium mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in…</> : 'Log in'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
