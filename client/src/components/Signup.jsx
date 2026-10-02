import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Loader2 } from 'lucide-react';

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
    <div className="flex justify-center items-center min-h-[calc(100vh-8rem)] px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="rounded-xl border border-border bg-white p-7 shadow-xs space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                B
              </div>
              <span className="font-bold text-zinc-900 tracking-tight text-lg">BookEase</span>
            </Link>
            <h1 className="text-xl font-bold text-zinc-900">Create an account</h1>
            <p className="text-xs text-zinc-500">Join BookEase to book or offer local services</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-zinc-700 text-xs font-semibold">Full name</Label>
              <Input
                id="name" name="name" required
                value={formData.name} onChange={handleChange}
                placeholder="Rahul Sharma"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-zinc-700 text-xs font-semibold">Email address</Label>
              <Input
                id="email" type="email" name="email" required
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-zinc-700 text-xs font-semibold">Password</Label>
              <Input
                id="password" type="password" name="password" required
                value={formData.password} onChange={handleChange}
                placeholder="Minimum 6 characters"
              />
            </div>

            {/* Role selector */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-zinc-700 text-xs font-semibold">I want to…</Label>
              <RadioGroup
                defaultValue="customer"
                onValueChange={(val) => setFormData({ ...formData, role: val })}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { val: 'customer', label: 'Book Services', desc: 'I am a customer' },
                  { val: 'vendor',   label: 'Offer Services', desc: 'I am a vendor' },
                ].map(({ val, label, desc }) => (
                  <label
                    key={val}
                    htmlFor={`role-${val}`}
                    className={`relative flex flex-col gap-0.5 cursor-pointer rounded-lg border p-3 transition-all ${
                      formData.role === val
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-border bg-white hover:border-zinc-300'
                    }`}
                  >
                    <RadioGroupItem value={val} id={`role-${val}`} className="sr-only" />
                    <span className={`text-xs font-bold ${formData.role === val ? 'text-blue-700' : 'text-zinc-900'}`}>
                      {label}
                    </span>
                    <span className="text-[11px] text-zinc-500">{desc}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-1"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</> : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-500 pt-2 border-t border-border">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
