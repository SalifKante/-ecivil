import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, Compass } from 'lucide-react';
import MaliFlag from '../components/MaliFlag';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <span className="bg-ecivil-green-50 text-ecivil-green-700 mx-auto grid size-16 place-items-center rounded-2xl">
        <Compass className="size-8" aria-hidden="true" />
      </span>

      <p className="text-ecivil-green-700 mt-6 text-5xl font-bold tabular-nums">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-pretty text-slate-600">{t('notFound.description')}</p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-medium text-white transition-colors"
        >
          <Home className="size-4" aria-hidden="true" />
          {t('notFound.back')}
        </Link>
        <Link
          to="/services"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          {t('nav.services')}
        </Link>
      </div>

      <MaliFlag className="mx-auto mt-10 h-3 w-4.5 opacity-60" />
    </div>
  );
}
