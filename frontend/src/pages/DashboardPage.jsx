import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LogOut, ArrowRight } from 'lucide-react';
import { fetchMe } from '../features/auth/authApi';
import { useAuth } from '../features/auth/AuthContext';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '—';
}

function Field({ label, value, mono = false }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { citizen: sessionCitizen, logout } = useAuth();

  const { data: citizen, isPending, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

  const displayName = citizen
    ? `${citizen.firstName} ${citizen.lastName}`
    : `${sessionCitizen?.firstName ?? ''} ${sessionCitizen?.lastName ?? ''}`.trim();

  const address = citizen?.address
    ? [citizen.address.line, citizen.address.city, citizen.address.country]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-slate-600">{t('dashboard.welcome', { name: displayName })}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('dashboard.logout')}
        </button>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">{t('dashboard.identityTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('dashboard.identitySubtitle')}</p>

        {isPending && <p className="mt-6 text-sm text-slate-500">…</p>}
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

      <Link
        to="/services"
        className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium text-white transition-colors"
      >
        {t('dashboard.startRequest')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
