import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchService } from '../features/services/servicesApi';
import { fetchMe } from '../features/auth/authApi';
import {
  createRequest,
  updateRequest,
  submitRequest,
  uploadAttachment,
  deleteAttachment,
} from '../features/requests/requestsApi';
import { formatXof, formatDate } from '../lib/format';

const STEPS = ['info', 'documents', 'review'];
const DELIVERY_MODES = ['DIGITAL', 'HOME', 'PICKUP_POINT'];

export default function RequestWizardPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [stepIndex, setStepIndex] = useState(0);
  const [request, setRequest] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [motif, setMotif] = useState('');
  const [delivery, setDelivery] = useState({ mode: 'DIGITAL', address: '', pickupPoint: '' });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const draftRequested = useRef(false);

  const { data: service } = useQuery({ queryKey: ['service', code], queryFn: () => fetchService(code) });
  const { data: citizen } = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  // Create the draft as soon as we know the service, so uploads have somewhere to attach.
  const createMutation = useMutation({
    mutationFn: () => createRequest({ serviceId: service._id, formData: { motif } }),
    onSuccess: (created) => setRequest(created),
    onError: () => setError(t('wizard.createError')),
  });

  // Ref guard, not state: StrictMode runs this effect twice on mount, and a state
  // flag updates too late to stop the second run from creating a duplicate draft.
  useEffect(() => {
    if (service && !draftRequested.current) {
      draftRequested.current = true;
      createMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadAttachment(request._id, file),
    onSuccess: (attachment) => setAttachments((prev) => [...prev, attachment]),
    onError: (err) =>
      setError(t([`authErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR'])),
  });

  const removeMutation = useMutation({
    mutationFn: (attachmentId) => deleteAttachment(request._id, attachmentId),
    onSuccess: (_data, attachmentId) =>
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId)),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await updateRequest(request._id, { formData: { motif }, delivery });
      return submitRequest(request._id);
    },
    onSuccess: (submitted) => {
      // A free service is already settled server-side — skip straight to tracking.
      if (!submitted.amountDue) {
        navigate('/suivi', { state: { justSubmitted: submitted.reference } });
        return;
      }
      navigate(`/paiement/${submitted._id}`);
    },
    onError: (err) =>
      setError(t([`authErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR'])),
  });

  if (!service) return <div className="mx-auto max-w-2xl px-4 py-16 text-slate-500">…</div>;

  const step = STEPS[stepIndex];
  const applicantName = citizen ? `${citizen.firstName} ${citizen.lastName}` : '';

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-ecivil-green-700 text-sm font-medium">{service.label}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t('wizard.title')}</h1>

      <Stepper stepIndex={stepIndex} />

      {error && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {step === 'info' && (
          <InfoStep
            citizen={citizen}
            applicantName={applicantName}
            service={service}
            motif={motif}
            setMotif={setMotif}
            delivery={delivery}
            setDelivery={setDelivery}
          />
        )}

        {step === 'documents' && (
          <DocumentsStep
            service={service}
            attachments={attachments}
            onPick={() => fileInputRef.current?.click()}
            onRemove={(id) => removeMutation.mutate(id)}
            uploading={uploadMutation.isPending}
            fileInputRef={fileInputRef}
            onFileChange={onPickFile}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            applicantName={applicantName}
            service={service}
            motif={motif}
            delivery={delivery}
            attachments={attachments}
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:invisible"
        >
          {t('wizard.back')}
        </button>

        {stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i + 1)}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 rounded-lg px-6 py-2.5 text-sm font-medium text-white"
          >
            {t('wizard.next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!request || submitMutation.isPending}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
          >
            {submitMutation.isPending ? t('wizard.submitting') : t('wizard.submit')}
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({ stepIndex }) {
  const { t } = useTranslation();
  return (
    <ol className="mt-6 flex gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1">
          <div
            className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-ecivil-green-600' : 'bg-slate-200'}`}
          />
          <span className={`mt-2 block text-xs ${i === stepIndex ? 'text-slate-900' : 'text-slate-400'}`}>
            {t(`wizard.steps.${s}`)}
          </span>
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

function InfoStep({ citizen, applicantName, service, motif, setMotif, delivery, setDelivery }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="bg-ecivil-green-50 text-ecivil-green-700 rounded-lg px-4 py-3 text-sm">
        {t('wizard.prefillNotice')}
      </p>

      <dl className="mt-4">
        <Row label={t('wizard.applicant')} value={applicantName} />
        <Row label={t('dashboard.nina')} value={citizen?.nina} />
        <Row label={t('dashboard.birth')} value={formatDate(citizen?.birthDate)} />
        <Row label={t('wizard.serviceLabel')} value={service.label} />
        <Row
          label={t('wizard.amountDue')}
          value={service.fee === 0 ? t('catalog.free') : formatXof(service.fee)}
        />
      </dl>

      <label htmlFor="motif" className="mt-5 block text-sm font-medium text-slate-700">
        {t('wizard.motifLabel')}
      </label>
      <textarea
        id="motif"
        rows={2}
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder={t('wizard.motifPlaceholder')}
        className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
      />

      <label htmlFor="delivery" className="mt-5 block text-sm font-medium text-slate-700">
        {t('wizard.deliveryLabel')}
      </label>
      <select
        id="delivery"
        value={delivery.mode}
        onChange={(e) => setDelivery((d) => ({ ...d, mode: e.target.value }))}
        className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
      >
        {DELIVERY_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {t(`wizard.delivery.${mode}`)}
          </option>
        ))}
      </select>

      {delivery.mode === 'HOME' && (
        <input
          type="text"
          value={delivery.address}
          onChange={(e) => setDelivery((d) => ({ ...d, address: e.target.value }))}
          placeholder={t('wizard.deliveryAddress')}
          className="focus:border-ecivil-green-600 mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
        />
      )}
      {delivery.mode === 'PICKUP_POINT' && (
        <input
          type="text"
          value={delivery.pickupPoint}
          onChange={(e) => setDelivery((d) => ({ ...d, pickupPoint: e.target.value }))}
          placeholder={t('wizard.pickupPoint')}
          className="focus:border-ecivil-green-600 mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
        />
      )}
    </div>
  );
}

function DocumentsStep({ service, attachments, onPick, onRemove, uploading, fileInputRef, onFileChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="font-semibold text-slate-900">{t('wizard.uploadTitle')}</h2>

      {service.requiredDocuments?.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm text-slate-500">
          {service.requiredDocuments.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-400">{t('wizard.uploadHint')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={onFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {uploading ? t('wizard.uploading') : `+ ${t('wizard.uploadButton')}`}
      </button>

      {attachments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{t('wizard.noAttachments')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {attachments.map((a) => (
            <li
              key={a._id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="truncate text-slate-700">{a.originalName}</span>
              <button
                type="button"
                onClick={() => onRemove(a._id)}
                className="text-ecivil-red-600 ml-3 shrink-0 text-xs hover:underline"
              >
                {t('wizard.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewStep({ applicantName, service, motif, delivery, attachments }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="bg-ecivil-gold-100 text-ecivil-gold-700 rounded-lg px-4 py-3 text-sm">
        {t('wizard.reviewNotice')}
      </p>

      <dl className="mt-4">
        <Row label={t('wizard.applicant')} value={applicantName} />
        <Row label={t('wizard.serviceLabel')} value={service.label} />
        <Row label={t('wizard.motifLabel')} value={motif} />
        <Row label={t('wizard.deliveryLabel')} value={t(`wizard.delivery.${delivery.mode}`)} />
        <Row
          label={t('wizard.amountDue')}
          value={service.fee === 0 ? t('catalog.free') : formatXof(service.fee)}
        />
        <Row label={t('wizard.steps.documents')} value={`${attachments.length}`} />
      </dl>

      <p className="mt-4 text-xs text-slate-400">{t('wizard.specimenReminder')}</p>
    </div>
  );
}
