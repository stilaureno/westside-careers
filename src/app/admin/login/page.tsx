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

    try {
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

      // Cookie is set server-side in the API response.
      router.replace('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f6f8fc 0%, #eef2f7 100%)', 
      display: 'flex',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      fontFamily: 'inherit'
    }}>
      <div style={{
        background: '#fff', 
        borderRadius: '24px', 
        padding: '48px 40px', 
        maxWidth: '440px',
        width: '100%', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(229, 231, 235, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ 
            background: '#fff', 
            width: '100px', 
            height: '100px', 
            borderRadius: '20px', 
            margin: '0 auto 20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '12px'
          }}>
            <img
              src="/WESTSIDE LOGO COLORED.png"
              alt="Logo"
              style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '800', 
            color: '#8b1e2d', 
            marginBottom: '8px',
            letterSpacing: '-0.025em' 
          }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', fontWeight: '500' }}>
            Welcome back! Please enter your password.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '16px', 
            borderRadius: '14px', 
            marginBottom: '24px',
            background: '#fef2f2', 
            border: '1px solid #fee2e2', 
            color: '#991b1b', 
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '8px',
              marginLeft: '4px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', 
                  padding: '14px 16px 14px 46px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '14px', 
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8b1e2d';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(139, 30, 45, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', 
              padding: '16px', 
              background: '#8b1e2d', 
              color: '#fff',
              border: 'none', 
              borderRadius: '14px', 
              fontSize: '16px', 
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', 
              opacity: loading ? 0.8 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(139, 30, 45, 0.2), 0 2px 4px -1px rgba(139, 30, 45, 0.1)'
            }}
            onMouseOver={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', 
                  borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' 
                }} />
                Signing in...
              </div>
            ) : 'Sign In'}
          </button>
        </form>

        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
