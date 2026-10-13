import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../context/ActorContext.jsx';
import { ClientSearch } from './pickers.jsx';

const NAV = [
  { to: '/browse', label: 'Browse', db: 'pg' },
  { to: '/fund', label: 'Fund gig', db: 'pg' },
  { to: '/escrow', label: 'Escrow', db: 'pg' },
  { to: '/analytics', label: 'Analytics', db: 'pg' },
  { to: '/workers', label: 'Workers map', db: 'mongo' },
  { to: '/reviews', label: 'Reviews', db: 'mongo' },
];

function HealthDots() {
  // Raw fetch on purpose: a 503 still carries per-database status in its body.
  const q = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/health');
        if (res.status === 502 || res.status === 504) return { api: false }; // Vite proxy: API down
        return { api: true, ...(await res.json()) };
      } catch {
        return { api: false };
      }
    },
    refetchInterval: 15_000,
    retry: false,
  });
  const d = q.data;
  const dot = (ok, label) => (
    <span className={`health-dot ${ok === undefined ? '' : ok ? 'ok' : 'down'}`} title={`${label}: ${ok ? 'up' : 'down'}`}>
      {label}
    </span>
  );
  if (!d) return <span className="health">{dot(undefined, 'API')}</span>;
  if (d.api === false) return <span className="health">{dot(false, 'API')}</span>;
  return (
    <span className="health" aria-label="Database status">
      {dot(d.postgres?.ok, 'PostgreSQL')}
      {dot(d.mongo?.ok, 'MongoDB')}
    </span>
  );
}

export function Layout() {
  const { actor, setActor } = useActor();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/browse" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              G
            </span>
            GigTask
          </NavLink>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          <nav id="main-nav" className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {n.label}
                <span className={`db-tag db-${n.db}`}>{n.db === 'pg' ? 'PG' : 'Mongo'}</span>
              </NavLink>
            ))}
          </nav>

          <div className="topbar-right">
            <HealthDots />
            <div className="acting-as">
              <span className="acting-label">Acting as client</span>
              <ClientSearch value={actor} onSelect={setActor} compact />
            </div>
          </div>
        </div>
      </header>

      <main className="main" key={location.pathname}>
        <Outlet />
      </main>

      <footer className="footer">GigTask · CS6.302 Assignment 2 · PostgreSQL + MongoDB · demo mode (no real login)</footer>
    </div>
  );
}
