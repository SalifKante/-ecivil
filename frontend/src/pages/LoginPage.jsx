import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Fingerprint, MessageSquare, ShieldCheck } from 'lucide-react';
import { requestOtp, verifyOtp } from '../features/auth/authApi';
import { useAuth } from '../features/auth/AuthContext';
import MaliFlag from '../components/MaliFlag';

const NINA_DIGITS = 14;

/** Displays 99990000000101 as 9999 0000 0000 01 without touching the stored value. */
function formatNina(digits) {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [step, setStep] = useState('nina');
  const [nina, setNina] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState(null);

  const translateError = (err) => {
    const key = `authErrors.${err.code}`;
    const translated = t(key, {
      remaining: err.details?.remainingAttempts ?? 0,
      defaultValue: '',
    });
    return translated || t(`errors.${err.code}`, { defaultValue: t('errors.UNKNOWN_ERROR') });
  };

  const requestMutation = useMutation({
    mutationFn: () => requestOtp(nina),
    onSuccess: (data) => {
      setChallenge(data);
      setCode('');
      setError(null);
      setStep('otp');
    },
    onError: (err) => setError(translateError(err)),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp({ nina, code }),
    onSuccess: (data) => {
      login(data);
      navigate(location.state?.from ?? '/espace', { replace: true });
    },
    onError: (err) => setError(translateError(err)),
  });

  const isNinaValid = nina.length === NINA_DIGITS;
  const isCodeValid = code.length === 6;

  return (
    <div className="bg-slate-50">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="bg-ecivil-green-50 text-ecivil-green-700 grid size-10 place-items-center rounded-xl">
              <Fingerprint className="size-5" aria-hidden="true" />
            </span>
            <MaliFlag className="h-4 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-balance text-slate-900">
            {t('login.title')}
          </h1>
          <p className="mt-2 text-sm text-pretty text-slate-600">{t('login.subtitle')}</p>

          {/* Two steps, and the citizen should be able to see which one they're on. */}
          <ol className="mt-6 flex gap-2" aria-label={t('login.stepsLabel')}>
            {['nina', 'otp'].map((s, i) => (
              <li key={s} className="flex-1" aria-current={step === s ? 'step' : undefined}>
                <div
                  className={`h-1.5 rounded-full ${
                    step === s || (step === 'otp' && i === 0)
                      ? 'bg-ecivil-green-600'
                      : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`mt-2 block text-xs ${
                    step === s ? 'font-medium text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {t(`login.steps.${s}`)}
                </span>
              </li>
            ))}
          </ol>

          {error && (
            <p
              role="alert"
              className="bg-ecivil-red-100 text-ecivil-red-600 mt-6 rounded-lg px-4 py-3 text-sm"
            >
              {error}
            </p>
          )}

          {step === 'nina' ? (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            requestMutation.mutate();
          }}
        >
          <label htmlFor="nina" className="block text-sm font-medium text-slate-700">
            {t('login.ninaLabel')}
          </label>
          <input
            id="nina"
            name="nina"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-describedby="nina-help"
            value={formatNina(nina)}
            onChange={(e) => setNina(e.target.value.replace(/\D/g, '').slice(0, NINA_DIGITS))}
            placeholder={t('login.ninaPlaceholder')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-mono tracking-wider outline-none"
          />
          <p id="nina-help" className="mt-1.5 text-xs text-slate-500">
            {t('login.ninaHelp')}
          </p>

          <button
            type="submit"
            disabled={!isNinaValid || requestMutation.isPending}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-6 w-full rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {requestMutation.isPending ? t('login.sending') : t('login.continue')}
          </button>

          <p className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-center font-mono text-xs text-slate-500">
            {t('login.demoHint')}
          </p>
        </form>
      ) : (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            verifyMutation.mutate();
          }}
        >
          <h2 className="font-medium text-slate-900">{t('login.otpTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {challenge?.identity
              ? t('login.otpSentTo', { phone: challenge.identity.phoneMasked })
              : t('login.otpSentGeneric')}
          </p>

          {challenge?.identity && (
            <p className="text-ecivil-green-700 mt-1 text-sm font-medium">
              {t('login.greeting', { name: challenge.identity.firstName })}
            </p>
          )}

          {/* Dev-only: the API returns the code because the SMS gateway is mocked. */}
          {challenge?.devCode && (
            <p className="bg-ecivil-gold-100 text-ecivil-gold-700 mt-4 rounded-lg px-3 py-2 text-center text-sm">
              {t('login.devCodeNotice', { code: challenge.devCode })}
            </p>
          )}

          <label htmlFor="code" className="mt-6 block text-sm font-medium text-slate-700">
            {t('login.codeLabel')}
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none"
          />

          <button
            type="submit"
            disabled={!isCodeValid || verifyMutation.isPending}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-6 w-full rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {verifyMutation.isPending ? t('login.verifying') : t('login.verify')}
          </button>

          <div className="mt-4 flex justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('nina');
                setError(null);
              }}
              className="text-slate-500 hover:text-slate-800"
            >
              {t('login.changeNina')}
            </button>
            <button
              type="button"
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="text-ecivil-green-700 hover:underline disabled:text-slate-400"
            >
              {t('login.resend')}
            </button>
          </div>
        </form>
          )}
        </div>

        {/* Why we are asking for a national identifier at all. */}
        <aside className="space-y-4 lg:pt-4">
          {[
            { key: 'nina', Icon: Fingerprint },
            { key: 'sms', Icon: MessageSquare },
            { key: 'data', Icon: ShieldCheck },
          ].map(({ key, Icon }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="bg-ecivil-green-50 text-ecivil-green-700 grid size-9 place-items-center rounded-lg">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {t(`login.reassure.${key}.title`)}
              </h2>
              <p className="mt-1 text-xs text-pretty text-slate-600">
                {t(`login.reassure.${key}.description`)}
              </p>
            </div>
          ))}

          <Link
            to="/admin/connexion"
            className="block rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 transition-colors hover:bg-white"
          >
            {t('footer.staffAccess')}
          </Link>
        </aside>
      </div>
    </div>
  );
}
