import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Landmark, Loader2, ArrowLeft } from 'lucide-react';
import { staffLogin } from '../features/auth/staffAuthApi';
import { useAuth } from '../features/auth/AuthContext';

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
    <div className="grid min-h-screen place-items-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 text-white">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-lg bg-white/10"
          >
            <Landmark className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold">{t('admin.title')}</span>
            <span className="block text-xs text-slate-300">{t('app.republic')}</span>
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-8 rounded-xl bg-white p-6 shadow-lg">
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
    </div>
  );
}
