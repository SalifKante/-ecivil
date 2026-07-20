import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  ArrowRight,
  UserRound,
  Plane,
  FileSearch,
  ScanLine,
  IdCard,
} from 'lucide-react';
import { fetchMe } from '../features/auth/authApi';
import { fetchRequests } from '../features/requests/requestsApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatDate } from '../lib/format';
import Loading from '../components/Loading';
import StatusPill from '../components/StatusPill';
import MaliFlag from '../components/MaliFlag';

function Field({ label, value, mono = false }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { citizen: sessionCitizen, logout } = useAuth();

  const { data: citizen, isPending, isError } = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  // The dashboard is also the natural place to see what is in flight.
  const { data: requests = [] } = useQuery({ queryKey: ['requests'], queryFn: fetchRequests });

  const displayName = citizen
    ? `${citizen.firstName} ${citizen.lastName}`
    : `${sessionCitizen?.firstName ?? ''} ${sessionCitizen?.lastName ?? ''}`.trim();

  const address = citizen?.address
    ? [citizen.address.line, citizen.address.city, citizen.address.country].filter(Boolean).join(', ')
    : null;

  const recent = requests.slice(0, 3);

  return (
    <div className="bg-slate-50">
      {/* ---------- Identity banner ---------- */}
      <div className="from-ecivil-green-800 to-ecivil-green-600 bg-gradient-to-br">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <UserRound className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-ecivil-green-100 flex items-center gap-2 text-xs">
                <MaliFlag className="h-3 w-4.5" />
                {t('dashboard.title')}
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold text-white sm:text-3xl">
                {displayName || '—'}
              </h1>
              {citizen?.nina && (
                <p className="text-ecivil-green-100 mt-0.5 font-mono text-sm">{citizen.nina}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {citizen?.isDiaspora && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                <Plane className="size-3.5" aria-hidden="true" />
                {t('dashboard.diaspora')}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t('dashboard.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* ---------- Shortcuts ---------- */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ShortcutCard
            to="/services"
            Icon={IdCard}
            title={t('dashboard.startRequest')}
            description={t('dashboard.shortcuts.services')}
            primary
          />
          <ShortcutCard
            to="/suivi"
            Icon={FileSearch}
            title={t('nav.tracking')}
            description={t('dashboard.shortcuts.tracking', { count: requests.length })}
          />
          <ShortcutCard
            to="/verifier"
            Icon={ScanLine}
            title={t('nav.verify')}
            description={t('dashboard.shortcuts.verify')}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ---------- Identity record ---------- */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">{t('dashboard.identityTitle')}</h2>
            <p className="mt-1 text-sm text-pretty text-slate-600">
              {t('dashboard.identitySubtitle')}
            </p>

            {isPending && <Loading className="mt-6" />}
            {isError && (
              <p role="alert" className="text-ecivil-red-600 mt-6 text-sm">
                {t('errors.UNKNOWN_ERROR')}
              </p>
            )}

            {citizen && (
              <dl className="mt-4">
                <Field label={t('dashboard.nina')} value={citizen.nina} mono />
                <Field label={t('dashboard.birth')} value={formatDate(citizen.birthDate)} />
                <Field label={t('dashboard.birthPlace')} value={citizen.birthPlace} />
                <Field label={t('dashboard.phone')} value={citizen.phone} />
                <Field label={t('dashboard.email')} value={citizen.email} />
                <Field label={t('dashboard.address')} value={address} />
                {citizen.isDiaspora && (
                  <Field label={t('dashboard.consulate')} value={citizen.consulate} />
                )}
              </dl>
            )}
          </section>

          {/* ---------- Recent activity ---------- */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">{t('dashboard.recentTitle')}</h2>
              {requests.length > 0 && (
                <Link to="/suivi" className="text-ecivil-green-700 text-sm hover:underline">
                  {t('dashboard.seeAll')}
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 py-10 text-center">
                <FileSearch className="mx-auto size-7 text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm text-slate-500">{t('tracking.empty')}</p>
                <Link
                  to="/services"
                  className="text-ecivil-green-700 mt-2 inline-block text-sm font-medium hover:underline"
                >
                  {t('dashboard.startRequest')}
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {recent.map((r) => (
                  <li key={r._id}>
                    <Link
                      to={`/suivi/${r._id}`}
                      className="hover:border-ecivil-green-600 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {r.serviceId?.label}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs text-slate-500">
                          {r.reference}
                        </span>
                      </span>
                      <StatusPill status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ to, Icon, title, description, primary = false }) {
  return (
    <Link
      to={to}
      className={`group flex flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? 'border-ecivil-green-600 bg-ecivil-green-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`grid size-11 place-items-center rounded-xl ${
          primary ? 'bg-ecivil-green-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <Icon className="size-5.5" aria-hidden="true" />
      </span>
      <span className="mt-4 font-semibold text-slate-900">{title}</span>
      <span className="mt-1 flex-1 text-sm text-pretty text-slate-600">{description}</span>
      <span className="text-ecivil-green-700 mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
        {/* Decorative: the card itself is the link and already has an accessible name. */}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
