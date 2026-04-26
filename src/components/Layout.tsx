import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Trophy, Users, Receipt, HandCoins, UserCog, LogOut, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// ─── Role badge chip ─────────────────────────────────────────
function RoleChip({ role }: { role: string }) {
  const cfg = {
    admin:       { label: 'Admin',       color: '#00D4C8', bg: 'rgba(0,212,200,0.12)' },
    participant: { label: 'Participant', color: '#F5A524', bg: 'rgba(245,165,36,0.12)' },
    readonly:    { label: 'Read Only',  color: '#7A90A8', bg: 'rgba(122,144,168,0.12)' },
  }[role] ?? { label: role, color: '#7A90A8', bg: 'rgba(122,144,168,0.12)' };

  return (
    <span
      style={{
        fontSize: '0.6rem',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: cfg.color,
        background: cfg.bg,
        borderRadius: '9999px',
        padding: '0.1rem 0.45rem',
        lineHeight: 1.6,
      }}
    >
      {cfg.label}
    </span>
  );
}

export function Layout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { currentUser, isAdmin, logout } = useAuth();

  const navItems = [
    { name: 'Overview',    path: '/',            icon: LayoutDashboard },
    { name: 'Matches',     path: '/matches',     icon: Trophy },
    { name: 'Side Bets',   path: '/misc-bets',   icon: Receipt },
    { name: 'Participants',path: '/participants', icon: Users },
    { name: 'Settlement',  path: '/settlement',  icon: HandCoins },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Avatar initials
  const initials = currentUser?.display_name?.slice(0, 2).toUpperCase() ?? 'U';

  const [showMobileHeader, setShowMobileHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    // Only apply scroll hiding on mobile widths
    if (window.innerWidth >= 768) return; 

    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      setShowMobileHeader(false);
    } else if (currentScrollY < lastScrollY) {
      setShowMobileHeader(true);
    }
    setLastScrollY(currentScrollY);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-[62px] md:pb-0">
      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside
        className="hidden md:flex w-20 lg:w-64 flex-col sticky top-0 h-screen border-r shrink-0 transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, #080E1A 0%, #0A1220 100%)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div
          className="px-5 pt-7 pb-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <Link to="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
            <div className="ipl-logo-circle transition-transform group-hover:scale-105">
              <img src={`${import.meta.env.BASE_URL}img/IPL.png`} alt="IPL Logo" />
            </div>
            <div className="hidden lg:block">
              <h1
                className="text-[1.0625rem] font-bold leading-tight tracking-tight"
                style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}
              >
                Runs <span style={{ color: '#4A5F75' }}>&</span> Ruins
              </h1>
              <p
                className="text-[0.6875rem] mt-0.5 font-semibold"
                style={{ color: '#4A5F75', letterSpacing: '0.1em', fontFamily: 'var(--font-heading)' }}
              >
                IPL 2026 TRACKER
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-5 space-y-2 lg:space-y-0.5">
          {navItems.map((item) => {
            const Icon   = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn('nav-item group', active && 'nav-item-active')}
              >
                <Icon
                  className={cn(
                    'w-[1.25rem] h-[1.25rem] lg:w-[1.125rem] lg:h-[1.125rem] shrink-0 transition-colors mx-auto lg:mx-0',
                    active ? 'text-primary' : 'text-subtle group-hover:text-muted-foreground'
                  )}
                />
                <span className="truncate hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}

          {/* Admin panel link — only for admins */}
          {isAdmin && (
            <Link
              to="/admin/users"
              className={cn('nav-item group', isActive('/admin') && 'nav-item-active')}
              style={ isActive('/admin') ? {} : { borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '0.875rem' }}
            >
              <UserCog
                className={cn(
                  'w-[1.25rem] h-[1.25rem] lg:w-[1.125rem] lg:h-[1.125rem] shrink-0 transition-colors mx-auto lg:mx-0',
                  isActive('/admin') ? 'text-primary' : 'text-subtle group-hover:text-muted-foreground'
                )}
              />
              <span className="truncate hidden lg:inline">Users</span>
            </Link>
          )}
        </nav>

        {/* User panel at bottom — click to go to profile */}
        <div
          className="px-3 py-4 border-t hidden lg:block"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <Link
            to="/profile"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              style={{
                background: isActive('/profile') ? 'rgba(0,212,200,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive('/profile') ? 'rgba(0,212,200,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '0.75rem',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/profile')) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,200,0.2)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,200,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/profile')) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }
              }}
            >
            {/* Avatar */}
            <div
              style={{
                width: '34px', height: '34px', borderRadius: '9999px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(0,212,200,0.25), rgba(0,212,200,0.1))',
                border: '1px solid rgba(0,212,200,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: '0.75rem', color: '#00D4C8',
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: '#E8EDF5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.display_name}
              </p>
              <RoleChip role={currentUser?.role ?? ''} />
            </div>
            {/* Sign out */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem',
                color: '#4A5F75', lineHeight: 0, flexShrink: 0,
                borderRadius: '0.375rem', transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#4A5F75'; e.currentTarget.style.background = 'none'; }}
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
            </div>
          </Link>
        </div>

        {/* Footer (mobile-collapsed sidebar) */}
        <div className="px-5 py-5 border-t hidden md:block lg:hidden" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center justify-center w-full"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75' }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-screen" onScroll={handleScroll}>
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-6 sm:px-6 md:px-10 md:pt-10 md:pb-10">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar px-3"
        style={{
          background: 'rgba(8, 14, 26, 0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '0.625rem',
          paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center min-w-[4.5rem] shrink-0 gap-1 relative py-0.5"
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full"
                  style={{ background: '#00D4C8', boxShadow: '0 0 8px rgba(0,212,200,0.6)' }}
                />
              )}
              <Icon className="w-[1.25rem] h-[1.25rem]" style={{ color: active ? '#00D4C8' : '#4A5F75' }} />
              <span
                className="text-[0.6875rem] font-bold"
                style={{ color: active ? '#00D4C8' : '#4A5F75', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Admin link in mobile nav (admin only) */}
        {isAdmin && (
          <Link
            to="/admin/users"
            className="flex flex-col items-center justify-center min-w-[4.5rem] shrink-0 gap-1 relative py-0.5"
          >
            {isActive('/admin') && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full"
                style={{ background: '#00D4C8', boxShadow: '0 0 8px rgba(0,212,200,0.6)' }}
              />
            )}
            <UserCog className="w-[1.25rem] h-[1.25rem]" style={{ color: isActive('/admin') ? '#00D4C8' : '#4A5F75' }} />
            <span
              className="text-[0.6875rem] font-bold"
              style={{ color: isActive('/admin') ? '#00D4C8' : '#4A5F75', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}
            >
              Users
            </span>
          </Link>
        )}
      </nav>

      {/* ── Mobile Auto-Hiding Top Header ─────────────────── */}
      <header
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-transform duration-300",
          !showMobileHeader ? "-translate-y-full" : "translate-y-0"
        )}
        style={{
          background: 'rgba(8, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-white" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <img src={`${import.meta.env.BASE_URL}img/IPL.png`} alt="IPL" className="w-[75%] h-[75%] object-contain" />
          </div>
          <h1 className="text-base font-bold leading-none tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}>
            Runs <span style={{ color: '#4A5F75' }}>&</span> Ruins
          </h1>
        </Link>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={handleLogout} 
             title="Sign out"
             className="text-[#4A5F75] p-1.5 rounded-full transition-colors active:bg-white/5"
          >
            <LogOut size={18} />
          </button>
          <Link 
             to="/profile" 
             className="flex items-center justify-center w-[2.125rem] h-[2.125rem] rounded-full shadow-inner"
             style={{
               background: 'linear-gradient(135deg, rgba(0,212,200,0.25), rgba(0,212,200,0.1))',
               border: '1px solid rgba(0,212,200,0.3)',
               color: '#00D4C8',
               fontFamily: 'var(--font-heading)',
               fontWeight: 'bold',
               fontSize: '0.85rem'
             }}
          >
             {initials}
          </Link>
        </div>
      </header>
    </div>
  );
}
