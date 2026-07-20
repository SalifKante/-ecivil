import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, ArrowRight, CheckCircle2 } from 'lucide-react';
import { fetchRequests } from '../features/requests/requestsApi';
import { formatDate, MODULE_META } from '../lib/format';
import StatusPill from '../components/StatusPill';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';

export default function TrackingPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const justSubmitted = location.state?.justSubmitted;

  const { data: requests, isPending, isError } = useQuery({
    queryKey: ['requests'],
    queryFn: fetchRequests,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow={t('nav.tracking')}
        icon={FileSearch}
        title={t('tracking.title')}
        subtitle={t('tracking.subtitle')}
      />

      {justSubmitted && (
        <p
          role="status"
          className="bg-ecivil-green-50 text-ecivil-green-700 mt-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {t('tracking.justSubmitted', { reference: justSubmitted })}
        </p>
      )}

      {isError && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-3 text-sm">
          {t('errors.UNKNOWN_ERROR')}
        </p>
      )}

      {isPending ? (
        <Loading className="mt-8" />
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <FileSearch className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">{t('tracking.empty')}</p>
          <Link
            to="/services"
            className="text-ecivil-green-700 mt-3 inline-block text-sm font-medium hover:underline"
          >
            {t('dashboard.startRequest')}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {requests.map((r) => {
            const Icon = MODULE_META[r.moduleKey]?.Icon;
            return (
              <li key={r._id}>
                <Link
                  to={`/suivi/${r._id}`}
                  className="hover:border-ecivil-green-600 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {Icon && (
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                          MODULE_META[r.moduleKey].accent
                        }`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {r.serviceId?.label}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{r.reference}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <StatusPill status={r.status} />
                      <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                    </div>
                    <ArrowRight className="size-4 text-slate-300" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
