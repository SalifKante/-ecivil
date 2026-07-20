import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, ScanLine, TriangleAlert } from 'lucide-react';
import { verifyDocument } from '../features/documents/documentsApi';
import { formatDateTime } from '../lib/format';
import Loading from '../components/Loading';

/**
 * Public QR verification. No session: anyone holding a document can check it,
 * which is the whole point of the code printed on it.
 */
export default function VerifyPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const { data, isPending, isError, error: queryError } = useQuery({
    queryKey: ['verify', token],
    queryFn: () => verifyDocument(token),
    enabled: Boolean(token),
    retry: false,
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const value = input.trim();
    if (value) navigate(`/verifier/${encodeURIComponent(value)}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="text-center">
        <span className="from-ecivil-green-600 to-ecivil-green-500 mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg">
          <ScanLine className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold text-balance text-slate-900">
          {t('verify.title')}
        </h1>
        <p className="mt-2 text-pretty text-slate-600">{t('verify.subtitle')}</p>
      </div>

      {!token && (
        <form onSubmit={onSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <label htmlFor="token" className="block text-sm font-medium text-slate-700">
            {t('verify.tokenLabel')}
          </label>
          <input
            id="token"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('verify.tokenPlaceholder')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none"
          />
          <p className="mt-1.5 text-xs text-slate-400">{t('verify.tokenHelp')}</p>

          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-4 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
          >
            {t('verify.submit')}
          </button>
        </form>
      )}

      {token && isPending && <Loading className="mt-8" label={t('verify.checking')} />}

      {/*
        This page is public — scanned from a QR code by someone with no account —
        so it is the screen where a wrong diagnosis is most likely to be believed.
        Map the actual error code instead of blaming the reader's network.
      */}
      {token && isError && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-8 rounded-lg px-4 py-3 text-sm">
          {t([`errors.${queryError?.code}`, 'errors.UNKNOWN_ERROR'])}
        </p>
      )}

      {data && <Result result={data} onReset={() => navigate('/verifier')} />}

      <p className="mt-8 text-xs text-slate-400">{t('verify.privacyNote')}</p>
    </div>
  );
}

function Result({ result, onReset }) {
  const { t } = useTranslation();
  const { valid, reason, document: doc, disclaimer } = result;

  return (
    <div className="mt-8">
      <div
        className={`rounded-xl border-2 p-6 ${
          valid ? 'border-ecivil-green-600 bg-ecivil-green-50' : 'border-ecivil-red-600 bg-ecivil-red-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {valid ? (
            <ShieldCheck className="text-ecivil-green-700 size-8 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldX className="text-ecivil-red-600 size-8 shrink-0" aria-hidden="true" />
          )}
          <div>
            {/* The verdict is the whole point of the page: a heading so it can be
                navigated to, and role="status" so it is actually announced. */}
            <h2
              role="status"
              className={`text-lg font-semibold ${
                valid ? 'text-ecivil-green-700' : 'text-ecivil-red-600'
              }`}
            >
              {t(valid ? 'verify.valid' : 'verify.invalid')}
            </h2>
            <p className={`text-sm ${valid ? 'text-ecivil-green-700' : 'text-ecivil-red-600'}`}>
              {t(`verify.reasons.${reason ?? 'VALID'}`)}
            </p>
          </div>
        </div>

        {doc && (
          <dl className="mt-5 border-t border-white/60 pt-4">
            <Row label={t('payment.receipt.reference')} value={doc.reference} mono />
            <Row
              label={t('verify.module')}
              value={doc.moduleKey ? t(`modules.${doc.moduleKey}.name`) : '—'}
            />
            <Row label={t('verify.holder')} value={doc.holder} />
            <Row label={t('verify.issuedAt')} value={formatDateTime(doc.issuedAt)} />
          </dl>
        )}
      </div>

      {/* The disclaimer comes from the API and is shown whatever the verdict, so a
          valid result can never be presented as an official confirmation. */}
      <p className="bg-ecivil-gold-100 text-ecivil-gold-700 mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {disclaimer}
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t('verify.checkAnother')}
      </button>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/60 py-2 last:border-0">
      <dt className="text-sm opacity-80">{label}</dt>
      <dd className={`text-right text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
