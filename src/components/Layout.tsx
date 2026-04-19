import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Users, Receipt, HandCoins } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Matches', path: '/matches', icon: Trophy },
    { name: 'Side Bets', path: '/misc-bets', icon: Receipt },
    { name: 'Participants', path: '/participants', icon: Users },
    { name: 'Settlement', path: '/settlement', icon: HandCoins },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-[62px] md:pb-0">
      {/* Desktop Sidebar */}
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
            {/* IPL Logo on white circle */}
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
            const Icon = item.icon;
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
        </nav>

        {/* Footer */}
        <div className="px-5 py-5 border-t hidden lg:block" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p
            className="text-[0.6875rem] font-semibold"
            style={{ color: '#2A3F55', letterSpacing: '0.08em', fontFamily: 'var(--font-heading)' }}
          >
            IPL 2026 SEASON
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 md:px-10 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-1"
        style={{
          background: 'rgba(8, 14, 26, 0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '0.625rem',
          paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 gap-1 relative py-0.5"
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full"
                  style={{ background: '#00D4C8', boxShadow: '0 0 8px rgba(0,212,200,0.6)' }}
                />
              )}
              <Icon
                className="w-[1.25rem] h-[1.25rem]"
                style={{ color: active ? '#00D4C8' : '#4A5F75' }}
              />
              <span
                className="text-[0.6875rem] font-bold"
                style={{
                  color: active ? '#00D4C8' : '#4A5F75',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '0.03em',
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
