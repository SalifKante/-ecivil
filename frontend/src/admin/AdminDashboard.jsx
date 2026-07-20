import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../features/admin/adminApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatXof, MODULE_SERIES_COLOR, STATUS_COLOR } from '../lib/format';
import { StatTile, DailyBars, BreakdownBars } from './charts';

/**
 * One dashboard, two readings. A module ADMIN gets its own module; a SUPER_ADMIN
 * gets the platform and the extra per-module breakdown that only makes sense when
 * there is more than one module to compare.
 *
 * The scoping is the server's: this component renders whatever it is given and
 * never filters, so the UI cannot accidentally widen what a role may see.
 */
export default function AdminDashboard() {
  const { t } = useTranslation();
  const { staff } = useAuth();

  const { data: stats, isPending, isError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchStats,
  });

  if (isPending) return <p className="text-sm text-slate-500">…</p>;

  if (isError || !stats) {
    return (
      <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 rounded-lg px-4 py-3 text-sm">
        {t('errors.UNKNOWN_ERROR')}
      </p>
    );
  }

  const isGlobal = stats.scope === 'GLOBAL';

  const statusRows = Object.entries(stats.byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      key: status,
      label: t(`status.${status}`),
      count,
      // Reuse the status palette the rest of the app already speaks.
      color: STATUS_COLOR[status] ?? '#64748b',
    }));

  const moduleRows = Object.entries(stats.byModule)
    .sort((a, b) => b[1] - a[1])
    .map(([moduleKey, count]) => ({
      key: moduleKey,
      label: t(`modules.${moduleKey}.name`),
      count,
      color: MODULE_SERIES_COLOR[moduleKey],
    }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t('admin.dash.title')}</h1>
      <p className="mt-1 text-slate-600">
        {isGlobal
          ? t('admin.dash.subtitleGlobal')
          : t('admin.dash.subtitleModule', {
              modules: (stats.scope ?? []).map((k) => t(`modules.${k}.name`)).join(', '),
            })}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label={t('admin.dash.totalRequests')} value={stats.totals.requests} />
        <StatTile
          label={t('admin.dash.open')}
          value={stats.totals.open}
          tone={stats.totals.open > 0 ? 'warn' : 'default'}
          hint={t('admin.dash.openHint')}
        />
        <StatTile label={t('admin.dash.issued')} value={stats.totals.issued} tone="good" />
        <StatTile label={t('admin.dash.rejected')} value={stats.totals.rejected} tone="bad" />
        <StatTile
          label={t('admin.dash.staff')}
          value={stats.totals.staff}
          hint={isGlobal ? t('admin.dash.staffAll') : t('admin.dash.staffAgents')}
        />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">{t('admin.dash.revenue')}</p>
        <p className="text-ecivil-green-700 mt-1 text-3xl font-semibold tabular-nums">
          {formatXof(stats.revenue.total)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {t('admin.dash.revenueHint', { count: stats.revenue.payments })}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DailyBars data={stats.perDay} title={t('admin.dash.perDay')} />

        <BreakdownBars
          title={t('admin.dash.byStatus')}
          rows={statusRows}
          emptyLabel={t('admin.empty')}
        />
      </div>

      {/* Only meaningful when there is more than one module to compare. */}
      {isGlobal && (
        <div className="mt-6">
          <BreakdownBars
            title={t('admin.dash.byModule')}
            rows={moduleRows}
            emptyLabel={t('admin.empty')}
          />
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        {t('admin.dash.footnote', { role: t(`admin.roles.${staff?.role}`) })}
      </p>
    </div>
  );
}

