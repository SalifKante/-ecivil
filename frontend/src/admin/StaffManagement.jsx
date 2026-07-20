import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserX, UserCheck, Loader2 } from 'lucide-react';
import {
  fetchStaffUsers,
  createStaffUser,
  updateStaffUser,
} from '../features/admin/adminApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatDate } from '../lib/format';

const ALL_MODULES = ['identity', 'lifeEvents', 'mobility', 'land'];

export default function StaffManagement() {
  const { t } = useTranslation();
  const { staff } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  const isSuper = staff?.role === 'SUPER_ADMIN';
  // A module admin can only ever grant its own modules, so those are the only
  // options offered. The server enforces this regardless of what the form sends.
  const grantable = isSuper ? ALL_MODULES : (staff?.moduleScope ?? []);

  const { data: users, isPending } = useQuery({
    queryKey: ['staffUsers'],
    queryFn: () => fetchStaffUsers(),
  });

  const onError = (err) =>
    setError(t([`adminErrors.${err.code}`, `errors.${err.code}`, 'errors.UNKNOWN_ERROR']));

  const refresh = () => {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['staffUsers'] });
  };

  const create = useMutation({
    mutationFn: createStaffUser,
    onSuccess: () => {
      setOpen(false);
      refresh();
    },
    onError,
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => updateStaffUser(id, { isActive }),
    onSuccess: refresh,
    onError,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('admin.staff.title')}</h1>
          <p className="mt-1 text-slate-600">
            {isSuper ? t('admin.staff.subtitleGlobal') : t('admin.staff.subtitleModule')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {t('admin.staff.add')}
        </button>
      </div>

      {error && (
        <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 mt-4 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {open && (
        <CreateForm
          grantable={grantable}
          canCreateAdmin={isSuper}
          pending={create.isPending}
          onSubmit={(payload) => create.mutate(payload)}
          onCancel={() => setOpen(false)}
        />
      )}

      {isPending ? (
        <p className="mt-8 text-sm text-slate-500">…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                  {u.fullName}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                    {t(`admin.roles.${u.role}`)}
                  </span>
                  {!u.isActive && (
                    <span className="bg-ecivil-red-100 text-ecivil-red-600 rounded-full px-2 py-0.5 text-xs">
                      {t('admin.staff.inactive')}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{u.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {u.moduleScope?.length
                    ? u.moduleScope.map((k) => t(`modules.${k}.name`)).join(', ')
                    : t('admin.allModules')}
                  {u.lastLoginAt && ` · ${t('admin.staff.lastLogin', { date: formatDate(u.lastLoginAt) })}`}
                </p>
              </div>

              {/* Your own row has no switch: the server refuses self-edits, and an
                  admin locking themselves out is the mistake worth preventing. */}
              {u.id !== staff?.id && (
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })}
                  disabled={toggle.isPending}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {u.isActive ? (
                    <UserX className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheck className="size-4" aria-hidden="true" />
                  )}
                  {t(u.isActive ? 'admin.staff.deactivate' : 'admin.staff.reactivate')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateForm({ grantable, canCreateAdmin, pending, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'AGENT',
    moduleScope: grantable.slice(0, 1),
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleModule = (key) =>
    setForm((f) => ({
      ...f,
      moduleScope: f.moduleScope.includes(key)
        ? f.moduleScope.filter((k) => k !== key)
        : [...f.moduleScope, key],
    }));

  const valid =
    form.email.includes('@') &&
    form.fullName.trim().length >= 2 &&
    form.password.length >= 10 &&
    form.moduleScope.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.staff.fullName')}>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={set('fullName')}
            className="focus:border-ecivil-green-600 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </Field>

        <Field label={t('admin.login.email')}>
          <input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="prenom.nom@ecivil.demo"
            className="focus:border-ecivil-green-600 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </Field>

        <Field label={t('admin.staff.password')} hint={t('admin.staff.passwordHint')}>
          <input
            type="text"
            required
            minLength={10}
            value={form.password}
            onChange={set('password')}
            className="focus:border-ecivil-green-600 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none"
          />
        </Field>

        <Field label={t('admin.staff.role')}>
          <select
            value={form.role}
            onChange={set('role')}
            className="focus:border-ecivil-green-600 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="AGENT">{t('admin.roles.AGENT')}</option>
            {/* Only a super-admin may create an admin; the server checks too. */}
            {canCreateAdmin && <option value="ADMIN">{t('admin.roles.ADMIN')}</option>}
          </select>
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">{t('admin.staff.scope')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {grantable.map((key) => (
            <label
              key={key}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                form.moduleScope.includes(key)
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.moduleScope.includes(key)}
                onChange={() => toggleModule(key)}
              />
              {t(`modules.${key}.name`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={!valid || pending}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t('admin.staff.create')}
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

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
