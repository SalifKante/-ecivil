import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-ecivil-green-600 text-5xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-slate-600">{t('notFound.description')}</p>
      <Link
        to="/"
        className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-8 inline-block rounded-lg px-5 py-2.5 font-medium text-white transition-colors"
      >
        {t('notFound.back')}
      </Link>
    </div>
  );
}
