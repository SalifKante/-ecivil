import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Inbox as InboxIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchStaffRequests } from '../features/staffRequests/staffRequestsApi';
import { formatXof, formatDate } from '../lib/format';
import { ModuleBadge } from './AdminLayout';
import StatusBadge from './StatusBadge';
import Loading from '../components/Loading';

/** Statuses an agent can act on, in the order a file moves through them. */
const STATUS_FILTERS = ['PAID', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED'];
const ASSIGNMENT_FILTERS = ['me', 'unassigned'];

export default function AgentInbox() {
  const { t } = useTranslation();

  const [status, setStatus] = useState('');
  const [assigned, setAssigned] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const filters = { status, assigned, q, page, limit: 20 };

  const { data, isPending, isError } = useQuery({
    queryKey: ['staffRequests', filters],
    queryFn: () => fetchStaffRequests(filters),
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing the table to a spinner on every filter change.
    placeholderData: keepPreviousData,
  });

  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t('admin.inbox')}</h1>
      <p className="mt-1 text-slate-600">{t('admin.inboxSubtitle')}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <FilterChip active={!status && !assigned} onClick={() => { setStatus(''); setAssigned(''); setPage(1); }}>
          {t('admin.filters.all')}
        </FilterChip>

        {ASSIGNMENT_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={assigned === value}
            onClick={() => reset(setAssigned)(assigned === value ? '' : value)}
          >
            {t(`admin.filters.${value}`)}
          </FilterChip>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-slate-300 sm:block" aria-hidden="true" />

        {STATUS_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={status === value}
            onClick={() => reset(setStatus)(status === value ? '' : value)}
          >
            {t(`status.${value}`)}
          </FilterChip>
        ))}
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="reference-search" className="sr-only">
          {t('admin.searchLabel')}
        </label>
        <input
          id="reference-search"
          type="search"
          value={q}
          onChange={(e) => reset(setQ)(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          className="focus:border-ecivil-green-600 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none"
        />
      </div>

      {isError && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-3 text-sm">
          {t('errors.UNKNOWN_ERROR')}
        </p>
      )}

      {isPending ? (
        <Loading className="mt-8" />
      ) : data?.requests.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {data.requests.map((r) => (
              <li key={r._id}>
                <RequestRow request={r} />
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(data.pages, p + 1))}
          />
        </>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white'
          : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function RequestRow({ request }) {
  const { t } = useTranslation();
  const citizen = request.citizenId;
  const service = request.serviceId;

  return (
    <Link
      to={`/admin/demandes/${request._id}`}
      className="hover:border-ecivil-green-600 block rounded-xl border border-slate-200 bg-white p-4 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-900">
              {request.reference}
            </span>
            <StatusBadge status={request.status} />
            <ModuleBadge moduleKey={request.moduleKey} />
          </div>

          <p className="mt-1.5 truncate text-sm text-slate-700">{service?.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {citizen ? `${citizen.firstName} ${citizen.lastName} · ${citizen.nina}` : '—'}
          </p>
        </div>

        <div className="text-right text-xs text-slate-500">
          <p className="text-sm font-medium text-slate-900">{formatXof(request.amountDue)}</p>
          <p className="mt-0.5">{formatDate(request.createdAt)}</p>
          <p className="mt-0.5">
            {request.assignedAgentId
              ? request.assignedAgentId.fullName
              : t('admin.filters.unassigned')}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <InboxIcon className="mx-auto size-8 text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-sm text-slate-500">{t('admin.empty')}</p>
    </div>
  );
}

function Pagination({ page, pages, total, onPrev, onNext }) {
  const { t } = useTranslation();
  if (pages <= 1) return <p className="mt-4 text-xs text-slate-400">{t('admin.count', { count: total })}</p>;

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-xs text-slate-400">{t('admin.count', { count: total })}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('admin.previous')}
        </button>
        <span className="text-sm text-slate-500">{t('admin.pageOf', { page, pages })}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 disabled:opacity-40"
        >
          {t('admin.next')}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
