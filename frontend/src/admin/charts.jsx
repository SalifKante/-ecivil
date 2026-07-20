import { useTranslation } from 'react-i18next';
import { SERIES_HUE } from '../lib/format';

/**
 * Chart primitives, built in plain HTML/SVG rather than pulling in a charting
 * library — the stack in CLAUDE.md §3 has none, and a bar chart does not justify
 * adding one.
 *
 * Shared marks: thin bars, 4px rounded data-ends anchored to the baseline, a 2px
 * gap between adjacent fills, recessive axes, and a hover layer on every mark.
 */

/** A single headline figure. Not a chart — a number does not need a plot. */
export function StatTile({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-slate-900',
    good: 'text-ecivil-green-700',
    warn: 'text-ecivil-gold-700',
    bad: 'text-ecivil-red-600',
  };

  const accents = {
    default: 'before:bg-slate-300',
    good: 'before:bg-ecivil-green-600',
    warn: 'before:bg-ecivil-gold-400',
    bad: 'before:bg-ecivil-red-500',
  };

  return (
    // The accent rule is a top border drawn with a pseudo-element, so the tile
    // keeps one consistent shape whatever tone it carries.
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] ${accents[tone]}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-pretty text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Requests per day. One series, so one hue and no legend — the title names it.
 *
 * The visually-hidden table is the accessible equivalent: a screen reader gets the
 * numbers, not a wall of unlabelled rectangles.
 */
export function DailyBars({ data, title }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{t('admin.dash.lastDays', { count: data.length })}</p>

      <div className="mt-4 flex h-40 items-end gap-[2px]" role="presentation">
        {data.map((d) => {
          const height = (d.count / max) * 100;
          const label = new Date(d.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          });

          return (
            <div key={d.date} className="group relative flex flex-1 flex-col justify-end">
              {/* Hover target spans the full column, not just the drawn bar. */}
              <div
                className="w-full rounded-t transition-opacity group-hover:opacity-80"
                style={{
                  height: `${Math.max(height, d.count > 0 ? 3 : 0)}%`,
                  minHeight: d.count > 0 ? '3px' : '0',
                  backgroundColor: SERIES_HUE,
                }}
              />
              {d.count === 0 && <div className="h-px w-full bg-slate-200" />}

              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                {label} · {t('admin.count', { count: d.count })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{new Date(data[0]?.date ?? Date.now()).toLocaleDateString('fr-FR')}</span>
        <span>{new Date(data.at(-1)?.date ?? Date.now()).toLocaleDateString('fr-FR')}</span>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.dash.date')}</th>
            <th scope="col">{t('admin.dash.requests')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{new Date(d.date).toLocaleDateString('fr-FR')}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Horizontal breakdown. Every row is directly labelled, so identity never rests
 * on colour alone — which is also what licenses the one series colour sitting
 * fractionally under 3:1 contrast.
 */
export function BreakdownBars({ title, rows, emptyLabel }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-slate-700">{row.label}</span>
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {row.count}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.count / max) * 100}%`,
                    backgroundColor: row.color ?? SERIES_HUE,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
