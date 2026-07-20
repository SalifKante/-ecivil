import { useTranslation } from 'react-i18next';

/**
 * The app's only loading indicator.
 *
 * It replaced eleven copies of a bare `…`, which announced nothing to a screen
 * reader and read as three dots to anyone with low vision. `role="status"` plus
 * `aria-live="polite"` means the wait — and its end — are actually communicated.
 */
export default function Loading({ label, className = '' }) {
  const { t } = useTranslation();

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}
    >
      <span
        aria-hidden="true"
        className="border-ecivil-green-600 size-4 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
      />
      {label ?? t('common.loading')}
    </p>
  );
}
