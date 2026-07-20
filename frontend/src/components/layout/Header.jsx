import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, Menu, X } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

const navItems = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/services', key: 'nav.services' },
  { to: '/suivi', key: 'nav.tracking' },
  { to: '/verifier', key: 'nav.verify' },
];

function navLinkClass({ isActive }) {
  return [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-ecivil-green-50 text-ecivil-green-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function Header() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const account = isAuthenticated
    ? { to: '/espace', label: t('dashboard.title') }
    : { to: '/connexion', label: t('nav.login') };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
          <span
            aria-hidden="true"
            className="from-ecivil-green-600 to-ecivil-green-500 grid size-9 place-items-center rounded-lg bg-gradient-to-br text-white"
          >
            <Landmark className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold text-slate-900">{t('app.name')}</span>
            <span className="hidden text-xs text-slate-500 sm:block">{t('app.republic')}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.main')}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={account.to}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 hidden rounded-md px-4 py-2 text-sm font-medium text-white transition-colors sm:block"
          >
            {account.label}
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-mobile"
            aria-label={t(isMenuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="menu-mobile"
          className="border-t border-slate-200 px-4 py-2 md:hidden"
          aria-label={t('nav.mobile')}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) => `block ${navLinkClass({ isActive })}`}
            >
              {t(item.key)}
            </NavLink>
          ))}
          <NavLink
            to={account.to}
            onClick={() => setIsMenuOpen(false)}
            className="text-ecivil-green-700 block px-3 py-2 text-sm font-medium sm:hidden"
          >
            {account.label}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
