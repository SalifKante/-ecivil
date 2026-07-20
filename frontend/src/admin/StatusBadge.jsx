import { useTranslation } from 'react-i18next';
import { STATUS_META } from '../lib/format';

export default function StatusBadge({ status }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_META[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
