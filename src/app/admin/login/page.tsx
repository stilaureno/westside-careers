'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!data.success) {
      setError(data.error || 'Invalid password');
      setLoading(false);
      return;
    }

    // Cookie is now set server-side in the API response
    // Redirect to admin (landing page for the new SPA layout)
    router.push('/admin');
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f6f8fc', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '22px', padding: '40px', maxWidth: '400px',
        width: '100%', boxShadow: '0 10px 30px rgba(15,23,42,.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/WESTSIDE LOGO COLORED.png"
            alt="Logo"
            style={{ maxWidth: '100px', margin: '0 auto 12px', display: 'block' }}
          />
          <h1 style={{ fontSize: '22px', color: '#8b1e2d', marginBottom: '6px' }}>Admin Login</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Enter your admin password</p>
        </div>

        {error && (
          <div style={{
            padding: '14px', borderRadius: '12px', marginBottom: '16px',
            background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '14px',
          }}>{error}</div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: '#8b1e2d', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}