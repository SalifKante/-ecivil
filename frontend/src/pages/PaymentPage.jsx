import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { fetchRequest } from '../features/requests/requestsApi';
import {
  fetchProviders,
  fetchPayment,
  initiatePayment,
  settlePayment,
} from '../features/payments/paymentsApi';
import { formatXof, PROVIDER_META } from '../lib/format';
import Loading from '../components/Loading';

/** Provider order in the picker — mobile money first, it is how most citizens pay. */
const PROVIDER_ORDER = ['ORANGE_MONEY', 'WAVE', 'CARD'];

export default function PaymentPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState(null);
  const [payerPhone, setPayerPhone] = useState('');
  // `undefined` — untouched, follow the server's latest attempt.
  // `null` — the citizen deliberately went back to the provider picker.
  const [localAttempt, setLocalAttempt] = useState(undefined);
  const [error, setError] = useState(null);

  const { data: request, isPending, isError } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => fetchRequest(requestId),
  });

  const { data: providers } = useQuery({ queryKey: ['paymentProviders'], queryFn: fetchProviders });

  // Survives a page reload mid-flow: without this, refreshing on the receipt would
  // lose the provider reference and the paid-at stamp.
  const { data: storedPayment } = useQuery({
    queryKey: ['payment', requestId],
    queryFn: () => fetchPayment(requestId),
  });

  const attempt = localAttempt === undefined ? (storedPayment ?? null) : localAttempt;
  const setAttempt = setLocalAttempt;

  const showError = (err) =>
    setError(t([`paymentErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR']));

  const initiateMutation = useMutation({
    mutationFn: () => initiatePayment(requestId, { provider, payerPhone }),
    onSuccess: (payment) => {
      setError(null);
      setAttempt(payment);
    },
    onError: showError,
  });

  const settleMutation = useMutation({
    mutationFn: (outcome) =>
      settlePayment(requestId, { providerRef: attempt.providerRef, outcome }),
    onSuccess: ({ payment }) => {
      setAttempt(payment);
      if (payment.status === 'SUCCEEDED') {
        setError(null);
        queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      } else {
        setError(t('paymentErrors.DECLINED'));
      }
    },
    onError: showError,
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
          {t('paymentErrors.REQUEST_NOT_FOUND')}
        </p>
        <Link to="/espace" className="text-ecivil-green-700 mt-4 inline-block text-sm hover:underline">
          {t('payment.backToDashboard')}
        </Link>
      </div>
    );
  }

  // Paying is only meaningful from PENDING_PAYMENT; anything further along is done.
  if (request.status !== 'PENDING_PAYMENT') {
    return (
      <Receipt
        request={request}
        payment={attempt?.status === 'SUCCEEDED' ? attempt : null}
        onTrack={() => navigate('/suivi')}
      />
    );
  }

  const meta = providers?.find((p) => p.code === provider);
  const needsPhone = meta?.requiresPayerPhone ?? false;
  // Wait for the provider list: acting on a default-false `needsPhone` would send a
  // mobile money payment with no wallet number and earn a 400.
  const canPay = provider && meta && (!needsPhone || /^\+?\d{8,15}$/.test(payerPhone.trim()));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-ecivil-green-700 text-sm font-medium">{request.reference}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t('payment.title')}</h1>
      <p className="mt-1 text-slate-600">{t('payment.subtitle')}</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-slate-500">{t('payment.amountDue')}</span>
          <span className="text-2xl font-semibold text-slate-900">
            {formatXof(request.amountDue)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{t('payment.officialTariff')}</p>
      </section>

      {error && (
        <p
          role="alert"
          className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      {attempt && attempt.status === 'PENDING' ? (
        <PendingAttempt
          attempt={attempt}
          amount={request.amountDue}
          onSettle={(outcome) => settleMutation.mutate(outcome)}
          settling={settleMutation.isPending}
          onCancel={() => {
            setAttempt(null);
            setError(null);
          }}
        />
      ) : (
        <>
          <h2 className="mt-8 font-semibold text-slate-900">{t('payment.chooseProvider')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {PROVIDER_ORDER.map((code) => (
              <li key={code}>
                <ProviderCard
                  code={code}
                  label={providers?.find((p) => p.code === code)?.label ?? code}
                  selected={provider === code}
                  onSelect={() => {
                    setProvider(code);
                    setError(null);
                  }}
                />
              </li>
            ))}
          </ul>

          {needsPhone && (
            <div className="mt-5">
              <label htmlFor="payerPhone" className="block text-sm font-medium text-slate-700">
                {t('payment.phoneLabel')}
              </label>
              <input
                id="payerPhone"
                type="tel"
                inputMode="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+223 70 00 01 01"
                className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              />
              <p className="mt-1.5 text-xs text-slate-400">{t('payment.phoneHelp')}</p>
            </div>
          )}

          {provider === 'CARD' && (
            <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t('payment.cardNotice')}
            </p>
          )}

          <button
            type="button"
            onClick={() => initiateMutation.mutate()}
            disabled={!canPay || initiateMutation.isPending}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors disabled:bg-slate-300 sm:w-auto"
          >
            {initiateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-4" aria-hidden="true" />
            )}
            {t('payment.pay', { amount: formatXof(request.amountDue) })}
          </button>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400">{t('payment.mockNotice')}</p>
    </div>
  );
}

function ProviderCard({ code, label, selected, onSelect }) {
  const brand = PROVIDER_META[code];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 bg-white p-4 transition-colors ${
        selected
          ? 'border-ecivil-green-600 bg-ecivil-green-50'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <img src={brand.logo} alt={brand.alt} className="h-8 w-auto object-contain" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

/**
 * The simulated provider hand-off. In a real flow the citizen would validate on
 * their phone or at their bank and we would wait for the callback; here the demo
 * operator settles it either way so a refusal can be shown too.
 */
function PendingAttempt({ attempt, amount, onSettle, settling, onCancel }) {
  const { t } = useTranslation();
  const isCard = attempt.provider === 'CARD';
  const Icon = isCard ? CreditCard : Smartphone;

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="bg-ecivil-green-100 text-ecivil-green-700 rounded-lg p-2">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">
            {t(`payment.pending.${isCard ? 'card' : 'mobile'}Title`)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t(`payment.pending.${isCard ? 'card' : 'mobile'}Body`, {
              amount: formatXof(amount),
              phone: attempt.payerPhone,
            })}
          </p>
        </div>
      </div>

      <dl className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        <div className="flex justify-between gap-4">
          <dt className="text-xs text-slate-500">{t('payment.providerRef')}</dt>
          <dd className="font-mono text-xs text-slate-700">{attempt.providerRef}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-slate-400">{t('payment.simulationHint')}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onSettle('SUCCESS')}
          disabled={settling}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('payment.simulateSuccess')}
        </button>
        <button
          type="button"
          onClick={() => onSettle('FAILURE')}
          disabled={settling}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <XCircle className="size-4" aria-hidden="true" />
          {t('payment.simulateFailure')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={settling}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          {t('payment.changeProvider')}
        </button>
      </div>
    </section>
  );
}

function Receipt({ request, payment, onTrack }) {
  const { t } = useTranslation();
  const brand = payment ? PROVIDER_META[payment.provider] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="bg-ecivil-green-100 text-ecivil-green-700 rounded-full p-2">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('payment.receipt.title')}</h1>
          <p className="text-slate-600">{t('payment.receipt.subtitle')}</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-900">{t('payment.receipt.heading')}</h2>
          {brand && <img src={brand.logo} alt={brand.alt} className="h-7 w-auto object-contain" />}
        </div>

        <dl className="mt-4">
          <ReceiptRow label={t('payment.receipt.reference')} value={request.reference} mono />
          <ReceiptRow label={t('wizard.serviceLabel')} value={request.serviceId?.label} />
          <ReceiptRow label={t('payment.receipt.amount')} value={formatXof(request.amountDue)} />
          {payment && (
            <>
              <ReceiptRow label={t('payment.receipt.provider')} value={brand?.alt} />
              <ReceiptRow label={t('payment.providerRef')} value={payment.providerRef} mono />
              <ReceiptRow
                label={t('payment.receipt.paidAt')}
                value={new Date(payment.paidAt).toLocaleString('fr-FR')}
              />
            </>
          )}
        </dl>

        <p className="bg-ecivil-gold-100 text-ecivil-gold-700 mt-5 rounded-lg px-4 py-3 text-xs">
          {t('payment.receipt.disclaimer')}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onTrack}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-medium text-white"
        >
          {t('payment.receipt.track')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          <Printer className="size-4" aria-hidden="true" />
          {t('payment.receipt.print')}
        </button>
        <Link
          to="/services"
          className="inline-flex items-center justify-center rounded-lg px-5 py-3 font-medium text-slate-600 hover:bg-slate-100"
        >
          {t('payment.receipt.newRequest')}
        </Link>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}
