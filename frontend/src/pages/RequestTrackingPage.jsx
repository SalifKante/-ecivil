import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Loader2,
  MessageSquareWarning,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { fetchRequest, fetchDocumentUrl } from '../features/requests/requestsApi';
import { formatXof, formatDate, formatDateTime, MODULE_META } from '../lib/format';
import StatusPill from '../components/StatusPill';
import Loading from '../components/Loading';

/** Statuses where an issued document exists and can be downloaded. */
const DOWNLOADABLE = ['ISSUED', 'DELIVERED'];

export default function RequestTrackingPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  const { data: request, isPending, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => fetchRequest(id),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Loading />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 rounded-lg px-4 py-3 text-sm">
          {t('tracking.notFound')}
        </p>
        <BackLink />
      </div>
    );
  }

  const service = request.serviceId;
  const meta = MODULE_META[request.moduleKey];
  const Icon = meta?.Icon;
  const lastEntry = request.timeline?.at(-1);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BackLink />

      <div className="mt-4 flex items-start gap-3">
        {Icon && (
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${meta.accent}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">{service?.label}</h1>
          <p className="mt-0.5 font-mono text-sm text-slate-500">{request.reference}</p>
        </div>
      </div>

      <div className="mt-4">
        <StatusPill status={request.status} />
      </div>

      {/* Whatever the citizen must do next, said plainly and near the top. */}
      <NextStep request={request} lastEntry={lastEntry} />

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">{t('tracking.summary')}</h2>
        <dl className="mt-3">
          <Row label={t('wizard.amountDue')} value={formatXof(request.amountDue)} />
          <Row
            label={t('wizard.deliveryLabel')}
            value={t(`wizard.delivery.${request.delivery?.mode ?? 'DIGITAL'}`)}
          />
          {request.formData?.motif && (
            <Row label={t('wizard.motifLabel')} value={request.formData.motif} />
          )}
          <Row label={t('tracking.submittedAt')} value={formatDate(request.submittedAt)} />
          {service?.processingDays != null && (
            <Row
              label={t('tracking.indicative')}
              value={t('catalog.processingDays', { count: service.processingDays })}
            />
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">{t('admin.detail.timeline')}</h2>
        <Timeline entries={request.timeline ?? []} />
      </section>

      <p className="mt-6 text-xs text-slate-400">{t('tracking.deliveryNote')}</p>
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link to="/suivi" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t('tracking.backToList')}
    </Link>
  );
}

/**
 * The one thing the citizen should do next. A tracking page that only shows a
 * status word makes people phone the administration to ask what it means.
 */
function NextStep({ request, lastEntry }) {
  const { t } = useTranslation();

  if (request.status === 'PENDING_PAYMENT') {
    return (
      <div className="bg-ecivil-gold-100 text-ecivil-gold-700 mt-6 rounded-lg px-4 py-4">
        <p className="text-sm font-medium">{t('tracking.next.pendingPayment')}</p>
        <Link
          to={`/paiement/${request._id}`}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          {t('tracking.next.payNow')}
        </Link>
      </div>
    );
  }

  if (request.status === 'NEEDS_INFO') {
    return (
      <div className="bg-ecivil-gold-100 text-ecivil-gold-700 mt-6 rounded-lg px-4 py-4">
        <p className="flex items-start gap-2 text-sm font-medium">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('tracking.next.needsInfo')}
        </p>
        {lastEntry?.note && <p className="mt-2 text-sm">« {lastEntry.note} »</p>}
        {/* No resubmit button: completing a NEEDS_INFO file is not built yet, and
            the submit endpoint would send an already-paid request back to
            payment. Better to say so than to offer a button that overcharges. */}
        <p className="mt-2 text-xs">{t('tracking.next.needsInfoHint')}</p>
      </div>
    );
  }

  if (request.status === 'REJECTED') {
    return (
      <div className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-4">
        <p className="text-sm font-medium">{t('tracking.next.rejected')}</p>
        {request.rejectionReason && <p className="mt-2 text-sm">« {request.rejectionReason} »</p>}
      </div>
    );
  }

  if (DOWNLOADABLE.includes(request.status)) {
    return <DocumentDownload requestId={request._id} />;
  }

  return (
    <p className="mt-6 rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-600">
      {t(`tracking.next.${request.status === 'APPROVED' ? 'approved' : 'inProgress'}`)}
    </p>
  );
}

/**
 * The link is fetched on click and opened immediately — it is short-lived and
 * must not be held in component state or in the page's markup.
 */
function DocumentDownload({ requestId }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await fetchDocumentUrl(requestId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(t([`documentErrors.${err.code}`, 'errors.UNKNOWN_ERROR']));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-ecivil-green-50 mt-6 rounded-lg px-4 py-4">
      <p className="text-ecivil-green-700 text-sm font-medium">{t('tracking.next.issued')}</p>

      {error && (
        <p role="alert" className="text-ecivil-red-600 mt-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {t('tracking.next.download')}
      </button>

      <p className="text-ecivil-green-700 mt-3 flex items-start gap-1.5 text-xs">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t('tracking.specimenNotice')}
      </p>
    </div>
  );
}

function Timeline({ entries }) {
  return (
    <ol className="mt-3 space-y-4">
      {[...entries].reverse().map((entry, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`mt-1 size-2.5 rounded-full ${i === 0 ? 'bg-ecivil-green-600' : 'bg-slate-300'}`}
              aria-hidden="true"
            />
            {i < entries.length - 1 && <span className="w-px flex-1 bg-slate-200" aria-hidden="true" />}
          </div>
          <div className="pb-1">
            <StatusPill status={entry.to} />
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.at)}</p>
            {entry.note && <p className="mt-0.5 text-xs text-slate-600">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}
