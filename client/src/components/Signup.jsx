import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Sparkles, Loader2, User, Store } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer' });
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
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.errors?.[0]?.message || 'Signup failed');
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl space-y-6 animate-fade-up">
          {/* Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 mx-auto">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create an account</h1>
            <p className="text-sm text-zinc-500">Join BookEase to get started</p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300 text-sm">Full Name</Label>
              <Input
                id="name" name="name" required
                value={formData.name} onChange={handleChange}
                placeholder="Rahul Sharma"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
              />
            </div>
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
                placeholder="Min. 6 characters"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
              />
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">I am a…</Label>
              <RadioGroup
                defaultValue="customer"
                onValueChange={(val) => setFormData({ ...formData, role: val })}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { val: 'customer', label: 'Customer', icon: <User className="w-4 h-4" />, desc: 'Book services' },
                  { val: 'vendor',   label: 'Vendor',   icon: <Store className="w-4 h-4" />, desc: 'Offer services' },
                ].map(({ val, label, icon, desc }) => (
                  <label
                    key={val}
                    htmlFor={`role-${val}`}
                    className={`relative flex flex-col gap-1 cursor-pointer rounded-xl border p-3 transition-all
                      ${formData.role === val
                        ? 'border-violet-500/60 bg-violet-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                  >
                    <RadioGroupItem value={val} id={`role-${val}`} className="sr-only" />
                    <div className={`flex items-center gap-2 font-medium text-sm ${formData.role === val ? 'text-violet-300' : 'text-zinc-300'}`}>
                      {icon}{label}
                    </div>
                    <span className="text-xs text-zinc-600">{desc}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white border-0 font-medium mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</> : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-600">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
