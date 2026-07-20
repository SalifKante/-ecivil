import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, X, KeyRound } from 'lucide-react';
import { DEMO_MODE } from '../demo/demoAdapter';

/**
 * Shown only in the hosted build, where there is no backend at all.
 *
 * The prototype banner already says the data is fictional; this says something
 * further and more specific — that nothing here is being enforced. In the real
 * stack the state machine, RBAC and payment rules run server-side, and those are
 * the parts that matter. A visitor clicking through a static demo should not come
 * away believing they saw them work.
 *
 * It also carries the demo credentials, because a hosted demo nobody can log into
 * is a screenshot.
 */
export default function DemoModeBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (!DEMO_MODE || !open) return null;

  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sky-900">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />

        <div className="min-w-0 flex-1 text-xs">
          <p className="font-semibold">{t('demo.title')}</p>
          <p className="mt-0.5 text-sky-800">{t('demo.description')}</p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sky-800">
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="size-3.5" aria-hidden="true" />
              {t('demo.citizen')} <code className="font-mono">99990000000101</code>
            </span>
            <span className="inline-flex items-center gap-1.5">
              {t('demo.staff')} <code className="font-mono">agent.etatcivil@ecivil.demo</code> /{' '}
              <code className="font-mono">Demo!Agent2</code>
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded p-1.5 hover:bg-sky-100"
          aria-label={t('demo.dismiss')}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
