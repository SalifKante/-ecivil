import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Landmark, Loader2, ArrowLeft } from 'lucide-react';
import { staffLogin } from '../features/auth/staffAuthApi';
import { useAuth } from '../features/auth/AuthContext';
import MaliFlag from '../components/MaliFlag';

export default function StaffLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginStaff } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => staffLogin({ email, password }),
    onSuccess: (data) => {
      loginStaff(data);
      navigate(location.state?.from ?? '/admin', { replace: true });
    },
    onError: (err) =>
      setError(t([`adminErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR'])),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    // A standalone route outside AdminLayout, so it carries its own landmark.
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-900 px-4 py-10">
      {/* A dark, deliberately un-citizen-like surface: staff should never be in
          any doubt about which side of the platform they are on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,132,73,0.35),transparent_60%)]"
      />

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 text-white">
          <span
            aria-hidden="true"
            className="from-ecivil-green-600 to-ecivil-green-500 grid size-11 place-items-center rounded-xl bg-gradient-to-br"
          >
            <Landmark className="size-5.5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold">{t('admin.title')}</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <MaliFlag className="h-2.5 w-4" />
              {t('app.republic')}
            </span>
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-8 rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{t('admin.login.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('admin.login.subtitle')}</p>

          {error && (
            <p
              role="alert"
              className="bg-ecivil-red-100 text-ecivil-red-600 mt-4 rounded-lg px-4 py-3 text-sm"
            >
              {error}
            </p>
          )}

          <label htmlFor="email" className="mt-5 block text-sm font-medium text-slate-700">
            {t('admin.login.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent.etatcivil@ecivil.demo"
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />

          <label htmlFor="password" className="mt-4 block text-sm font-medium text-slate-700">
            {t('admin.login.password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />

          <button
            type="submit"
            disabled={mutation.isPending || !email || !password}
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-medium text-white transition-colors disabled:bg-slate-300"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t('admin.login.submit')}
          </button>

          <p className="mt-4 text-xs text-slate-400">{t('admin.login.demoHint')}</p>
        </form>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('admin.login.backToSite')}
        </Link>
      </div>
    </main>
  );
}
