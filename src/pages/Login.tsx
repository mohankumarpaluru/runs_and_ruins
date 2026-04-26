import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Shake animation keyframe injected once ────────────────────
const SHAKE_STYLE = `
@keyframes rr-shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-7px); }
  30%       { transform: translateX(7px); }
  45%       { transform: translateX(-5px); }
  60%       { transform: translateX(5px); }
  75%       { transform: translateX(-2px); }
  90%       { transform: translateX(2px); }
}
@keyframes rr-form-enter {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes rr-brand-enter {
  from { opacity: 0; transform: translateY(-18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes rr-glow-pulse {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 0.85; }
}
`;

export function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [shake,      setShake]      = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // Inject shake keyframes once
  useEffect(() => {
    if (document.getElementById('rr-login-styles')) return;
    const style = document.createElement('style');
    style.id = 'rr-login-styles';
    style.textContent = SHAKE_STYLE;
    document.head.appendChild(style);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 650);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(username.trim(), password, rememberMe);
    setIsLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? 'Login failed.');
      triggerShake();
    }
  };

  return (
    <div
      className="min-h-screen flex items-stretch"
      style={{ background: '#080E1A', fontFamily: 'var(--font-sans)' }}
    >
      {/* ── LEFT panel: Branding ──────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #060C18 0%, #0A1525 50%, #070F1D 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Atmospheric glows */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '15%', left: '10%',
            width: '420px', height: '420px',
            borderRadius: '9999px',
            background: 'radial-gradient(ellipse, rgba(0,212,200,0.09) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'rr-glow-pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '20%', right: '5%',
            width: '360px', height: '360px',
            borderRadius: '9999px',
            background: 'radial-gradient(ellipse, rgba(245,165,36,0.07) 0%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'rr-glow-pulse 5s ease-in-out infinite 1.5s',
          }}
        />

        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,212,200,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,200,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Brand content */}
        <div
          className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 text-center"
          style={{ animation: 'rr-brand-enter 0.6s ease-out forwards' }}
        >
          {/* IPL Logo */}
          <div
            className="mb-8 relative"
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 0 40px rgba(0,212,200,0.25), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}img/IPL.png`}
              alt="IPL Logo"
              style={{ width: '78%', height: '78%', objectFit: 'contain' }}
            />
          </div>

          {/* App name */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '3.5rem',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: '#E8EDF5',
            }}
          >
            RUNS
          </h1>
          <div
            style={{
              width: '80px', height: '3px',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, transparent, #00D4C8, transparent)',
              margin: '0.5rem auto',
            }}
          />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '3.5rem',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: '#F5A524',
            }}
          >
            RUINS
          </h1>

          <p
            className="mt-6"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: '#4A5F75',
              textTransform: 'uppercase',
            }}
          >
            IPL 2026 Prediction Tracker
          </p>

          {/* Stat chips decoration */}
          <div className="mt-12 flex flex-col gap-3 w-full max-w-[280px]">
            {[
              { label: 'Total Matches', value: '70', color: '#00D4C8' },
              { label: 'Active Players', value: '3',  color: '#F5A524' },
              { label: 'Season', value: '2026', color: '#22C55E' },
            ].map((chip) => (
              <div
                key={chip.label}
                style={{
                  background: 'rgba(255,255,255,0.033)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '0.625rem',
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#7A90A8', fontSize: '0.8125rem', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {chip.label}
                </span>
                <span style={{ color: chip.color, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9375rem' }}>
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom caption */}
        <div className="relative z-10 px-10 pb-8 text-center">
          <p style={{ color: '#2A3F55', fontSize: '0.75rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em' }}>
            mohan.is-a.dev/runs_n_ruins
          </p>
        </div>
      </div>

      {/* ── RIGHT panel: Login form ──────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center w-full lg:w-[460px] xl:w-[500px] px-6 py-10 relative shrink-0"
        style={{ background: '#080E1A' }}
      >
        {/* Mobile logo (visible only < lg) */}
        <div className="lg:hidden flex flex-col items-center mb-10">
          <div
            style={{
              width: '64px', height: '64px', borderRadius: '9999px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(0,212,200,0.2), 0 4px 16px rgba(0,0,0,0.4)',
              marginBottom: '1rem',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}img/IPL.png`}
              alt="IPL Logo"
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem',
              color: '#E8EDF5', letterSpacing: '-0.02em',
            }}
          >
            RUNS &amp; <span style={{ color: '#F5A524' }}>RUINS</span>
          </h2>
          <p style={{ color: '#4A5F75', fontSize: '0.75rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.12em', marginTop: '0.25rem' }}>
            IPL 2026 TRACKER
          </p>
        </div>

        {/* Form card */}
        <div
          ref={formRef}
          style={{
            width: '100%',
            maxWidth: '400px',
            background: 'rgba(12, 20, 34, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,212,200,0.15)',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,212,200,0.04)',
            animation: shake
              ? 'rr-shake 0.6s ease-out'
              : 'rr-form-enter 0.45s ease-out forwards',
          }}
        >
          {/* Teal accent bar */}
          <div
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent 0%, #00D4C8 40%, #F5A524 70%, transparent 100%)',
            }}
          />

          <div style={{ padding: '2rem 2rem 2.25rem' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: '36px', height: '36px', borderRadius: '0.5rem',
                  background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Shield size={17} style={{ color: '#00D4C8' }} />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem',
                    color: '#E8EDF5', lineHeight: 1.2,
                  }}
                >
                  Sign In
                </h2>
                <p style={{ color: '#4A5F75', fontSize: '0.8125rem', lineHeight: 1.4 }}>
                  Access your dashboard
                </p>
              </div>
            </div>

            <div
              style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' }}
            />

            {/* Error message */}
            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.28)',
                  borderRadius: '0.625rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  color: '#EF4444',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="rr-username"
                  className="field-label"
                  style={{ display: 'block', marginBottom: '0.5rem' }}
                >
                  Username
                </label>
                <input
                  id="rr-username"
                  type="text"
                  className="input-dark"
                  placeholder="e.g. sahitya"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="rr-password"
                  className="field-label"
                  style={{ display: 'block', marginBottom: '0.5rem' }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="rr-password"
                    type={showPass ? 'text' : 'password'}
                    className="input-dark"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    autoComplete="current-password"
                    disabled={isLoading}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{
                      position: 'absolute', right: '0.875rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#4A5F75', lineHeight: 0, padding: '0.25rem',
                    }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label
                htmlFor="rr-remember"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  cursor: 'pointer', marginBottom: '1.5rem',
                  userSelect: 'none',
                }}
              >
                <div
                  onClick={() => setRememberMe((v) => !v)}
                  style={{
                    width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                    border: rememberMe ? '2px solid #00D4C8' : '2px solid rgba(255,255,255,0.15)',
                    background: rememberMe ? 'rgba(0,212,200,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: rememberMe ? '0 0 8px rgba(0,212,200,0.3)' : 'none',
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#00D4C8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  id="rr-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span style={{ color: '#7A90A8', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                  Remember me
                </span>
              </label>

              {/* Submit button */}
              <button
                id="rr-login-btn"
                type="submit"
                disabled={isLoading}
                className="action-btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: '16px', height: '16px', borderRadius: '9999px',
                        border: '2px solid rgba(0,19,18,0.3)',
                        borderTopColor: '#001312',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom note */}
        <p
          style={{
            marginTop: '2rem', color: '#2A3F55', fontSize: '0.75rem',
            fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', textAlign: 'center',
          }}
        >
          IPL 2026 · Private tracker · Contact admin for access
        </p>
      </div>
    </div>
  );
}
