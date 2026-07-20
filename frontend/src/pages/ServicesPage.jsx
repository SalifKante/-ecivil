import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchServices } from '../features/services/servicesApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatXof, MODULE_META } from '../lib/format';

const MODULE_KEYS = ['identity', 'lifeEvents', 'mobility', 'land'];

function ServiceCard({ service, onStart, ctaLabel }) {
  const { t } = useTranslation();
  const meta = MODULE_META[service.moduleKey];
  const Icon = meta?.Icon;

  return (
    <li className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${meta?.accent}`}>
          {Icon && <Icon className="size-5.5" aria-hidden="true" />}
        </span>
        <span className="text-right">
          <span className="block font-semibold text-slate-900">
            {service.fee === 0 ? t('catalog.free') : formatXof(service.fee)}
          </span>
          <span className="text-xs text-slate-400">
            {t('catalog.processingDays', { count: service.processingDays })}
          </span>
        </span>
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">{service.label}</h3>
      {service.description && (
        <p className="mt-1.5 text-sm text-pretty text-slate-600">{service.description}</p>
      )}

      {service.requiredDocuments?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500">{t('catalog.requiredDocuments')}</p>
          <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
            {service.requiredDocuments.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => onStart(service)}
        className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        {ctaLabel}
      </button>
    </li>
  );
}

export default function ServicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeModule, setActiveModule] = useState(null);

  const { data: services = [], isPending, isError } = useQuery({
    queryKey: ['services', activeModule],
    queryFn: () => fetchServices(activeModule),
  });

  const handleStart = (service) => {
    if (!isAuthenticated) {
      navigate('/connexion', { state: { from: `/demarche/${service.code}` } });
      return;
    }
    navigate(`/demarche/${service.code}`);
  };

  const ctaLabel = isAuthenticated ? t('catalog.start') : t('catalog.loginToStart');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{t('catalog.title')}</h1>
      <p className="mt-2 text-slate-600">{t('catalog.subtitle')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip active={activeModule === null} onClick={() => setActiveModule(null)}>
          {t('catalog.allModules')}
        </FilterChip>
        {MODULE_KEYS.map((key) => {
          const Icon = MODULE_META[key]?.Icon;
          return (
            <FilterChip key={key} active={activeModule === key} onClick={() => setActiveModule(key)}>
              {Icon && <Icon className="size-4" aria-hidden="true" />}
              {t(`modules.${key}.name`)}
            </FilterChip>
          );
        })}
      </div>

      {isPending && <p className="mt-8 text-sm text-slate-500">…</p>}
      {isError && (
        <p role="alert" className="text-ecivil-red-600 mt-8 text-sm">
          {t('errors.UNKNOWN_ERROR')}
        </p>
      )}

      {!isPending && services.length === 0 && (
        <p className="mt-8 text-sm text-slate-500">{t('catalog.empty')}</p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service._id}
            service={service}
            onStart={handleStart}
            ctaLabel={ctaLabel}
          />
        ))}
      </ul>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-ecivil-green-600 text-white'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
