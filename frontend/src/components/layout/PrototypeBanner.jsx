import { useTranslation } from 'react-i18next';

/**
 * Permanent, non-dismissible. Anyone seeing this UI must know it is not a real
 * government service — see CLAUDE.md §2.
 */
export default function PrototypeBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-ecivil-gold-300 text-ecivil-gold-700 px-4 py-1.5 text-center text-xs font-medium">
      {t('prototype.banner')}
    </div>
  );
}
