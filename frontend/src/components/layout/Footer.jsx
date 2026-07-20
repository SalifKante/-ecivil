import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
        <p className="font-medium text-slate-700">
          {t('app.name')} — {t('app.tagline')}
        </p>
        <p className="mt-1">{t('footer.disclaimer')}</p>
        <p className="mt-3 text-xs">
          © {new Date().getFullYear()} {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
