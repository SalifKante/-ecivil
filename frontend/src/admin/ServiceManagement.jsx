import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Check, X } from 'lucide-react';
import {
  fetchAdminServices,
  createAdminService,
  updateAdminService,
} from '../features/admin/adminApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatXof } from '../lib/format';
import { ModuleBadge } from './AdminLayout';
import Loading from '../components/Loading';

const ALL_MODULES = ['identity', 'lifeEvents', 'mobility', 'land'];

export default function ServiceManagement() {
  const { t } = useTranslation();
  const { staff } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const isSuper = staff?.role === 'SUPER_ADMIN';
  const ownModules = isSuper ? ALL_MODULES : (staff?.moduleScope ?? []);

  // See StaffManagement: without `isError` a failed fetch throws in the .map().
  const { data: services, isPending, isError } = useQuery({
    queryKey: ['adminServices'],
    queryFn: fetchAdminServices,
  });

  const onError = (err) =>
    setError(t([`adminErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR']));

  const refresh = () => {
    setError(null);
    setEditing(null);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['adminServices'] });
  };

  const create = useMutation({ mutationFn: createAdminService, onSuccess: refresh, onError });
  const update = useMutation({
    mutationFn: ({ id, patch }) => updateAdminService(id, patch),
    onSuccess: refresh,
    onError,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('admin.services.title')}</h1>
          <p className="mt-1 text-slate-600">{t('admin.services.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('admin.services.add')}
        </button>
      </div>

      {error && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-4 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {open && (
        <CreateServiceForm
          modules={ownModules}
          pending={create.isPending}
          onSubmit={(payload) => create.mutate(payload)}
          onCancel={() => setOpen(false)}
        />
      )}

      {isPending ? (
        <Loading className="mt-8" />
      ) : isError ? (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-8 rounded-lg px-4 py-3 text-sm">
          {t('errors.UNKNOWN_ERROR')}
        </p>
      ) : services.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
          {t('admin.services.empty')}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {services.map((s) => (
            <li key={s._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {s.label}
                    <ModuleBadge moduleKey={s.moduleKey} />
                    {!s.isActive && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        {t('admin.services.inactive')}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{s.code}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t('catalog.processingDays', { count: s.processingDays })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {s.fee === 0 ? t('catalog.free') : formatXof(s.fee)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(editing === s._id ? null : s._id)}
                    className="text-ecivil-green-700 text-xs font-medium hover:underline"
                  >
                    {t('admin.services.edit')}
                  </button>
                </div>
              </div>

              {editing === s._id && (
                <EditServiceRow
                  service={s}
                  pending={update.isPending}
                  onSubmit={(patch) => update.mutate({ id: s._id, patch })}
                  onCancel={() => setEditing(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-400">{t('admin.services.tariffNote')}</p>
    </div>
  );
}

/** Tariff edits are the sensitive ones, so the old value stays visible while typing. */
function EditServiceRow({ service, pending, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [fee, setFee] = useState(String(service.fee));
  const [processingDays, setProcessingDays] = useState(String(service.processingDays));
  const [isActive, setIsActive] = useState(service.isActive);

  const feeValue = Number(fee);
  const daysValue = Number(processingDays);
  const valid =
    Number.isInteger(feeValue) && feeValue >= 0 && Number.isInteger(daysValue) && daysValue >= 1;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="block text-xs font-medium text-slate-700">
            {t('admin.services.fee')}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="focus:border-ecivil-green-600 mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
          <span className="mt-1 block text-xs text-slate-400">
            {t('admin.services.currentFee', { fee: formatXof(service.fee) })}
          </span>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700">
            {t('admin.services.processingDays')}
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={processingDays}
            onChange={(e) => setProcessingDays(e.target.value)}
            className="focus:border-ecivil-green-600 mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">{t('admin.services.active')}</span>
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!valid || pending}
          onClick={() => onSubmit({ fee: feeValue, processingDays: daysValue, isActive })}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {t('admin.detail.confirm')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <X className="size-4" aria-hidden="true" />
          {t('admin.detail.cancel')}
        </button>
      </div>
    </div>
  );
}

function CreateServiceForm({ modules, pending, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: '',
    moduleKey: modules[0] ?? 'lifeEvents',
    label: '',
    fee: '0',
    processingDays: '3',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const feeValue = Number(form.fee);
  const daysValue = Number(form.processingDays);
  const valid =
    /^[A-Za-z0-9-]{3,40}$/.test(form.code) &&
    form.label.trim().length >= 3 &&
    Number.isInteger(feeValue) &&
    feeValue >= 0 &&
    Number.isInteger(daysValue) &&
    daysValue >= 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          code: form.code.toUpperCase(),
          moduleKey: form.moduleKey,
          label: form.label.trim(),
          fee: feeValue,
          processingDays: daysValue,
        });
      }}
      className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700">
            {t('admin.services.code')}
          </span>
          <input
            type="text"
            required
            value={form.code}
            onChange={set('code')}
            placeholder="LE-BIRTH-EXTRACT"
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-700">
            {t('admin.services.module')}
          </span>
          <select
            value={form.moduleKey}
            onChange={set('moduleKey')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            {modules.map((k) => (
              <option key={k} value={k}>
                {t(`modules.${k}.name`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium text-slate-700">
            {t('admin.services.label')}
          </span>
          <input
            type="text"
            required
            value={form.label}
            onChange={set('label')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-700">
            {t('admin.services.fee')}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.fee}
            onChange={set('fee')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
          <span className="mt-1 block text-xs text-slate-400">{t('admin.services.feeHint')}</span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-700">
            {t('admin.services.processingDays')}
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={form.processingDays}
            onChange={set('processingDays')}
            className="focus:border-ecivil-green-600 mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={!valid || pending}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t('admin.services.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          {t('admin.detail.cancel')}
        </button>
      </div>
    </form>
  );
}
