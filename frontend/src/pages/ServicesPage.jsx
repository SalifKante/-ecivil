import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, FileText, Lock, LayoutGrid, SearchX } from 'lucide-react';
import { fetchServices } from '../features/services/servicesApi';
import { useAuth } from '../features/auth/AuthContext';
import { formatXof, MODULE_META } from '../lib/format';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';

const MODULE_KEYS = ['identity', 'lifeEvents', 'mobility', 'land'];

function ServiceCard({ service, onStart, ctaLabel, isAuthenticated }) {
  const { t } = useTranslation();
  const meta = MODULE_META[service.moduleKey];
  const Icon = meta?.Icon;
  const isFree = service.fee === 0;

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${meta?.accent}`}>
            {Icon && <Icon className="size-5.5" aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-slate-400">
              {t(`modules.${service.moduleKey}.name`)}
            </span>
            <span className="block truncate font-mono text-xs text-slate-400">{service.code}</span>
          </span>
        </div>

        {/* The tariff is the thing citizens most want to find, so it gets the
            strongest treatment on the card. */}
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-right ${
            isFree ? 'bg-ecivil-green-50 text-ecivil-green-700' : 'bg-slate-50 text-slate-900'
          }`}
        >
          <span className="block text-sm font-bold tabular-nums">
            {isFree ? t('catalog.free') : formatXof(service.fee)}
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-balance text-slate-900">{service.label}</h3>
        {service.description && (
          <p className="mt-1.5 text-sm text-pretty text-slate-600">{service.description}</p>
        )}

        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" aria-hidden="true" />
          {t('catalog.processingDays', { count: service.processingDays })}
        </p>

        {service.requiredDocuments?.length > 0 && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <FileText className="size-3.5" aria-hidden="true" />
              {t('catalog.requiredDocuments')}
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
              {service.requiredDocuments.map((doc) => (
                <li key={doc} className="flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span className="text-pretty">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => onStart(service)}
          className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          {!isAuthenticated && <Lock className="size-3.5" aria-hidden="true" />}
          {ctaLabel}
          {isAuthenticated && (
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
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
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <PageHeader
            eyebrow={t('catalog.eyebrow')}
            icon={LayoutGrid}
            title={t('catalog.title')}
            subtitle={t('catalog.subtitle')}
          />

          <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label={t('catalog.filterLabel')}>
            <FilterChip active={activeModule === null} onClick={() => setActiveModule(null)}>
              {t('catalog.allModules')}
            </FilterChip>

            {MODULE_KEYS.map((key) => {
              const Icon = MODULE_META[key]?.Icon;
              return (
                <FilterChip
                  key={key}
                  active={activeModule === key}
                  onClick={() => setActiveModule(key)}
                >
                  {Icon && <Icon className="size-4" aria-hidden="true" />}
                  {t(`modules.${key}.name`)}
                </FilterChip>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {isPending && <Loading />}

        {isError && (
          <p role="alert" className="bg-ecivil-red-100 text-ecivil-red-600 rounded-lg px-4 py-3 text-sm">
            {t('errors.UNKNOWN_ERROR')}
          </p>
        )}

        {!isPending && !isError && services.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <SearchX className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">{t('catalog.empty')}</p>
          </div>
        )}

        {services.length > 0 && (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {t('catalog.count', { count: services.length })}
            </p>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  onStart={handleStart}
                  ctaLabel={ctaLabel}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </ul>
          </>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">{t('catalog.tariffNote')}</p>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Without aria-pressed the selected filter is signalled by colour alone.
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-ecivil-green-600 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
