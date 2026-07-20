import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { requestOtp, verifyOtp } from '../features/auth/authApi';
import { useAuth } from '../features/auth/AuthContext';

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
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">{t('login.title')}</h1>
      <p className="mt-2 text-sm text-pretty text-slate-600">{t('login.subtitle')}</p>

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
  );
}
