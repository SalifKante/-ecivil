import { useTranslation } from 'react-i18next';

/** Temporary stand-in for routes delivered in later phases (see CLAUDE.md §6). */
export default function PlaceholderPage({ titleKey, phase }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{t(titleKey)}</h1>
      <p className="mt-2 text-slate-600">{t('placeholder.description')}</p>
      <p className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-500">
        {phase}
      </p>
    </div>
  );
}
