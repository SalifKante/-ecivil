import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, Inbox, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { MODULE_META } from '../lib/format';

/** Visually distinct from the citizen site, so staff always know where they are. */
export default function AdminLayout() {
  const { t } = useTranslation();
  const { staff, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/admin/connexion', { replace: true });
  };

  const scope = staff?.moduleScope ?? [];
  const isGlobal = staff?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-white/10 text-white"
            >
              <Landmark className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold">{t('admin.title')}</span>
              <span className="block text-xs text-slate-300">{t('app.republic')}</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {staff && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{staff.fullName}</p>
                <p className="text-xs text-slate-300">
                  {t(`admin.roles.${staff.role}`)}
                  {' · '}
                  {isGlobal
                    ? t('admin.allModules')
                    : scope.map((k) => t(`modules.${k}.name`)).join(', ')}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
            </button>
          </div>
        </div>

        <nav className="border-t border-white/10" aria-label={t('admin.title')}>
          <div className="mx-auto flex max-w-6xl gap-1 px-4">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-ecivil-green-400 text-white'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`
              }
            >
              <Inbox className="size-4" aria-hidden="true" />
              {t('admin.inbox')}
            </NavLink>
          </div>
        </nav>
      </header>

      <p className="bg-ecivil-gold-100 text-ecivil-gold-700 px-4 py-2 text-center text-xs">
        <ShieldCheck className="mr-1 inline size-3.5" aria-hidden="true" />
        {t('admin.prototypeNotice')}
      </p>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

/** Small module badge reused by the inbox and the detail view. */
export function ModuleBadge({ moduleKey }) {
  const { t } = useTranslation();
  const meta = MODULE_META[moduleKey];
  const Icon = meta?.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        meta?.accent ?? 'bg-slate-200 text-slate-700'
      }`}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {t(`modules.${moduleKey}.name`)}
    </span>
  );
}
