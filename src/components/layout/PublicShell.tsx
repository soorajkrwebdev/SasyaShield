import React from 'react';
import { Leaf, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import sasyashieldLogo from '../../assets/sasyashield-logo.png';
import { Link, useRouter } from '../../lib/router';
import { AUTH_PATHS, PUBLIC_PATHS } from '../../lib/routes';
import { useAuth } from '../../contexts/AuthContext';

interface PublicShellProps {
  children: React.ReactNode;
}

/**
 * Shell for pages that must work without a farmer account:
 * landing page, public farm work board, job detail and (where appropriate)
 * the knowledge hub. It never renders private farmer navigation.
 */
export const PublicShell: React.FC<PublicShellProps> = ({ children }) => {
  const { path } = useRouter();
  const { user } = useAuth();

  const links = [
    { to: PUBLIC_PATHS.landing, label: 'Home' },
    { to: PUBLIC_PATHS.farmWork, label: 'Farm Work Board' },
    { to: PUBLIC_PATHS.knowledge, label: 'Knowledge Hub' },
  ];

  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to={PUBLIC_PATHS.landing} className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            <img src={sasyashieldLogo} alt="Sasyashield" className="h-8 sm:h-9 w-auto rounded-xl shrink-0" />
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base font-heading truncate">Sasyashield</span>
            </span>
          </Link>

          <nav aria-label="Public navigation" className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive(link.to)
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden min-[380px]:inline">Farmer Dashboard</span>
                <span className="min-[380px]:hidden">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to={AUTH_PATHS.login}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Login
                </Link>
                <Link
                  to={AUTH_PATHS.register}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden min-[420px]:inline">Register</span>
                  <span className="min-[420px]:hidden">Join</span>
                </Link>
              </>
            )}
          </div>
        </div>

        <nav aria-label="Public navigation mobile" className="sm:hidden border-t border-slate-100 px-2 py-1 flex items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                isActive(link.to) ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
            Sasyashield is a farm management and sustainable-agriculture intelligence platform. Agricultural
            information shown here is attributed to its published source. The platform does not certify farms and does
            not replace official certification under NPOP (APEDA) or PGS-India, nor does it replace local extension or
            professional agronomic advice.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <Link to="/farm-work" className="hover:text-emerald-700">
              Farm Work Board
            </Link>
            <Link to="/knowledge" className="hover:text-emerald-700">
              Knowledge Hub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
