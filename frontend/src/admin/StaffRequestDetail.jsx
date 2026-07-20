import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  HandGrab,
  Paperclip,
  Loader2,
} from 'lucide-react';
import {
  fetchStaffRequest,
  assignStaffRequest,
  approveStaffRequest,
  rejectStaffRequest,
  requestMoreInfo,
  fetchStaffAttachmentUrl,
} from '../features/staffRequests/staffRequestsApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatXof, formatDate, formatDateTime } from '../lib/format';
import { ModuleBadge } from './AdminLayout';
import StatusBadge from './StatusBadge';
import Loading from '../components/Loading';

const SUPERVISOR_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function StaffRequestDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { staff } = useAuth();
  const queryClient = useQueryClient();

  const [decision, setDecision] = useState(null); // 'reject' | 'info'
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const { data: request, isPending, isError } = useQuery({
    queryKey: ['staffRequest', id],
    queryFn: () => fetchStaffRequest(id),
  });

  const showError = (err) =>
    setError(t([`adminErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR']));

  const onSettled = () => {
    setDecision(null);
    setMessage('');
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['staffRequest', id] });
    queryClient.invalidateQueries({ queryKey: ['staffRequests'] });
  };

  const assign = useMutation({
    mutationFn: () => assignStaffRequest(id),
    onSuccess: onSettled,
    onError: showError,
  });

  const approve = useMutation({
    mutationFn: () => approveStaffRequest(id),
    onSuccess: onSettled,
    onError: showError,
  });

  const reject = useMutation({
    mutationFn: () => rejectStaffRequest(id, message),
    onSuccess: onSettled,
    onError: showError,
  });

  const askInfo = useMutation({
    mutationFn: () => requestMoreInfo(id, message),
    onSuccess: onSettled,
    onError: showError,
  });

  if (isPending) return <Loading />;

  if (isError || !request) {
    return (
      <div>
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 rounded-lg px-4 py-3 text-sm">
          {t('adminErrors.REQUEST_NOT_FOUND')}
        </p>
        <BackLink />
      </div>
    );
  }

  const citizen = request.citizenId;
  const service = request.serviceId;
  const holder = request.assignedAgentId;

  const isHolder = holder && staff && String(holder._id) === String(staff.id);
  const isSupervisor = SUPERVISOR_ROLES.includes(staff?.role);
  const isOpen = request.status === 'UNDER_REVIEW';
  const canTake = request.status === 'PAID' || (holder && !isHolder && isSupervisor);
  const canDecide = isOpen && (isHolder || isSupervisor);

  const busy = assign.isPending || approve.isPending || reject.isPending || askInfo.isPending;

  return (
    <div>
      <BackLink />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-slate-900">{request.reference}</h1>
            <StatusBadge status={request.status} />
            <ModuleBadge moduleKey={request.moduleKey} />
          </div>
          <p className="mt-1.5 text-slate-700">{service?.label}</p>
        </div>

        <p className="text-sm text-slate-500">
          {holder
            ? t('admin.detail.assignedTo', { name: holder.fullName })
            : t('admin.filters.unassigned')}
        </p>
      </div>

      {error && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-4 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={t('admin.detail.applicant')}>
            <dl>
              <Row
                label={t('wizard.applicant')}
                value={citizen ? `${citizen.firstName} ${citizen.lastName}` : '—'}
              />
              <Row label={t('dashboard.nina')} value={citizen?.nina} mono />
              <Row label={t('dashboard.birth')} value={formatDate(citizen?.birthDate)} />
              <Row label={t('dashboard.phone')} value={citizen?.phone} />
              <Row label={t('dashboard.email')} value={citizen?.email} />
              {citizen?.isDiaspora && (
                <Row label={t('dashboard.consulate')} value={citizen.consulate} />
              )}
            </dl>
          </Card>

          <Card title={t('admin.detail.request')}>
            <dl>
              <Row label={t('wizard.serviceLabel')} value={service?.label} />
              <Row label={t('wizard.amountDue')} value={formatXof(request.amountDue)} />
              <Row
                label={t('wizard.deliveryLabel')}
                value={t(`wizard.delivery.${request.delivery?.mode ?? 'DIGITAL'}`)}
              />
              {request.formData?.motif && (
                <Row label={t('wizard.motifLabel')} value={request.formData.motif} />
              )}
              {request.rejectionReason && (
                <Row label={t('admin.detail.rejectionReason')} value={request.rejectionReason} />
              )}
            </dl>
          </Card>

          <Card title={t('admin.detail.attachments')}>
            <Attachments requestId={id} attachments={request.attachments} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t('admin.detail.decision')}>
            {!canDecide && !canTake && (
              <p className="text-sm text-slate-500">{t('admin.detail.noActions')}</p>
            )}

            {canTake && (
              <button
                type="button"
                onClick={() => assign.mutate()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
              >
                {assign.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <HandGrab className="size-4" aria-hidden="true" />
                )}
                {t('admin.detail.take')}
              </button>
            )}

            {canDecide && !decision && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => approve.mutate()}
                  disabled={busy}
                  className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {t('admin.detail.approve')}
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('info')}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <MessageSquareWarning className="size-4" aria-hidden="true" />
                  {t('admin.detail.askInfo')}
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  disabled={busy}
                  className="border-ecivil-red-600 text-ecivil-red-600 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-ecivil-red-100"
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  {t('admin.detail.reject')}
                </button>
              </div>
            )}

            {canDecide && decision && (
              <div>
                <label htmlFor="decision-message" className="block text-sm font-medium text-slate-700">
                  {t(`admin.detail.${decision === 'reject' ? 'rejectReason' : 'infoNote'}`)}
                </label>
                <textarea
                  id="decision-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('admin.detail.messagePlaceholder')}
                  className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">{t('admin.detail.messageHint')}</p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => (decision === 'reject' ? reject : askInfo).mutate()}
                    disabled={busy || message.trim().length < 10}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    {t('admin.detail.confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecision(null);
                      setMessage('');
                    }}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    {t('admin.detail.cancel')}
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card title={t('admin.detail.timeline')}>
            <ol className="space-y-3">
              {[...request.timeline].reverse().map((entry, i) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3">
                  <StatusBadge status={entry.to} />
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                  {entry.note && <p className="mt-0.5 text-xs text-slate-600">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t('admin.backToInbox')}
    </Link>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

/**
 * Documents open through a short-lived presigned URL fetched on click — the list
 * never holds a durable link, and each open is recorded server-side.
 */
function Attachments({ requestId, attachments }) {
  const { t } = useTranslation();
  const [opening, setOpening] = useState(null);
  const [openError, setOpenError] = useState(null);

  if (!attachments?.length) {
    return <p className="text-sm text-slate-500">{t('wizard.noAttachments')}</p>;
  }

  const open = async (attachmentId) => {
    setOpening(attachmentId);
    setOpenError(null);
    try {
      const url = await fetchStaffAttachmentUrl(requestId, attachmentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      // Previously try/finally with no catch: a failed link silently did nothing
      // and the button simply un-disabled, which reads as "the app ignored me".
      setOpenError(t([`adminErrors.${err.code}`, 'errors.UNKNOWN_ERROR']));
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      {openError && (
        <p role="alert" className="text-ecivil-red-600 mb-2 text-sm">
          {openError}
        </p>
      )}
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li
            key={a._id}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              <Paperclip className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{a.originalName}</span>
            </span>
            <button
              type="button"
              onClick={() => open(a._id)}
              disabled={opening === a._id}
              className="text-ecivil-green-700 shrink-0 rounded px-2 py-2 text-sm font-medium hover:underline disabled:opacity-50"
            >
              {opening === a._id ? t('admin.detail.opening') : t('admin.detail.open')}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
