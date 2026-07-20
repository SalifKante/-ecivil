import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, BadgeCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { MODULE_META } from '../lib/format';

const moduleKeys = ['identity', 'lifeEvents', 'mobility', 'land'];

const benefits = [
  { key: 'zeroTravel', Icon: Globe },
  { key: 'transparency', Icon: BadgeCheck },
  { key: 'security', Icon: ShieldCheck },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <section className="from-ecivil-green-900 to-ecivil-green-700 bg-gradient-to-br">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-bold text-balance text-white sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="text-ecivil-green-100 mt-4 max-w-xl text-base text-pretty sm:text-lg">
            {t('home.subtitle')}
          </p>
          <Link
            to="/services"
            className="text-ecivil-green-800 mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium transition-colors hover:bg-slate-100"
          >
            {t('home.cta')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold text-slate-900">{t('home.modulesTitle')}</h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moduleKeys.map((key) => {
            const { Icon, accent } = MODULE_META[key];
            return (
              <li
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <span className={`grid size-11 place-items-center rounded-lg ${accent}`}>
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{t(`modules.${key}.name`)}</h3>
                <p className="mt-1.5 text-sm text-pretty text-slate-600">
                  {t(`modules.${key}.description`)}
                </p>
                <p className="mt-3 text-xs text-slate-400">{t(`modules.${key}.partner`)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
          {benefits.map(({ key, Icon }) => (
            <div key={key}>
              <span className="bg-ecivil-green-50 text-ecivil-green-600 grid size-11 place-items-center rounded-lg">
                <Icon className="size-5.5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{t(`home.benefits.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm text-pretty text-slate-600">
                {t(`home.benefits.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
