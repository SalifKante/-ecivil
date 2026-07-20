import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Clock,
  ScanLine,
  Landmark,
} from 'lucide-react';
import { MODULE_META } from '../lib/format';
import MaliFlag, { MaliStripe } from '../components/MaliFlag';
import { photo } from '../assets/photos';

const moduleKeys = ['identity', 'lifeEvents', 'mobility', 'land'];

const benefits = [
  { key: 'zeroTravel', Icon: Globe },
  { key: 'transparency', Icon: BadgeCheck },
  { key: 'security', Icon: ShieldCheck },
];

const steps = [
  { key: 'identify', Icon: Smartphone },
  { key: 'pay', Icon: BadgeCheck },
  { key: 'track', Icon: Clock },
  { key: 'receive', Icon: ScanLine },
];

/**
 * Every photograph is optional. `photo()` returns undefined until a file is added
 * to src/assets/photos, and each block falls back to a gradient — so the page is
 * presentable before anyone has downloaded an image, and richer once they have.
 */
export default function HomePage() {
  const { t } = useTranslation();

  const hero = photo('djenne');
  const bamako = photo('bamako');
  const mobile = photo('citoyen-mobile');
  const monument = photo('independance');

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden">
        <div className="from-ecivil-green-900 via-ecivil-green-800 to-ecivil-green-700 absolute inset-0 -z-20 bg-gradient-to-br" />

        {hero && (
          <img
            src={hero}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover opacity-25"
          />
        )}
        {/* Keeps text contrast independent of whatever photograph is dropped in. */}
        <div className="from-ecivil-green-900/95 to-ecivil-green-800/70 absolute inset-0 -z-10 bg-gradient-to-r" />

        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-ecivil-gold-300 inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.18em] uppercase">
            <MaliFlag className="h-3.5 w-5" />
            {t('app.republic')}
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold text-balance text-white sm:text-6xl">
            {t('home.title')}
          </h1>

          <p className="text-ecivil-green-100 mt-5 max-w-2xl text-base text-pretty sm:text-lg">
            {t('home.subtitle')}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/services"
              className="text-ecivil-green-800 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 font-semibold shadow-lg transition-colors hover:bg-slate-100"
            >
              {t('home.cta')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/verifier"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-3.5 font-medium text-white transition-colors hover:bg-white/10"
            >
              <ScanLine className="size-4" aria-hidden="true" />
              {t('home.verifyCta')}
            </Link>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {['modules', 'services', 'availability', 'delay'].map((key) => (
              <div key={key}>
                <dt className="text-ecivil-gold-300 text-2xl font-bold sm:text-3xl">
                  {t(`home.figures.${key}.value`)}
                </dt>
                <dd className="text-ecivil-green-100 mt-1 text-xs">
                  {t(`home.figures.${key}.label`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <MaliStripe />
      </section>

      {/* ---------- The four modules ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-slate-900">{t('home.modulesTitle')}</h2>
          <p className="mt-2 text-slate-600">{t('home.modulesSubtitle')}</p>
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {moduleKeys.map((key) => {
            const { Icon, accent } = MODULE_META[key];
            return (
              <li key={key}>
                <Link
                  to="/services"
                  className="hover:border-ecivil-green-600 group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span className={`grid size-12 place-items-center rounded-xl ${accent}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-semibold text-slate-900">{t(`modules.${key}.name`)}</h3>
                  <p className="mt-2 flex-1 text-sm text-pretty text-slate-600">
                    {t(`modules.${key}.description`)}
                  </p>
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    {t(`modules.${key}.partner`)}
                  </p>
                  <span className="text-ecivil-green-700 mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    {t('home.discover')}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold text-slate-900">{t('home.stepsTitle')}</h2>
          <p className="mt-2 max-w-2xl text-slate-600">{t('home.stepsSubtitle')}</p>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ key, Icon }, index) => (
              <li key={key} className="relative">
                <span className="bg-ecivil-green-600 grid size-12 place-items-center rounded-xl text-white">
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <p className="text-ecivil-green-700 mt-4 text-xs font-semibold tracking-wider uppercase">
                  {t('home.stepLabel', { number: index + 1 })}
                </p>
                <h3 className="mt-1 font-semibold text-slate-900">{t(`home.steps.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-pretty text-slate-600">
                  {t(`home.steps.${key}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Diaspora / mobile ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-ecivil-green-700 text-xs font-semibold tracking-[0.18em] uppercase">
              {t('home.diaspora.eyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-balance text-slate-900">
              {t('home.diaspora.title')}
            </h2>
            <p className="mt-4 text-pretty text-slate-600">{t('home.diaspora.description')}</p>

            <ul className="mt-6 space-y-3">
              {['anywhere', 'consulate', 'sameTariff'].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <BadgeCheck
                    className="text-ecivil-green-600 mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-700">{t(`home.diaspora.points.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl">
            {mobile ? (
              <img
                src={mobile}
                alt={t('home.diaspora.imageAlt')}
                className="aspect-4/3 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="from-ecivil-green-700 to-ecivil-green-500 grid aspect-4/3 w-full place-items-center bg-gradient-to-br">
                <Smartphone className="size-16 text-white/40" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Benefits over a city image ---------- */}
      <section className="relative isolate overflow-hidden bg-slate-900">
        {bamako && (
          <img
            src={bamako}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover opacity-30"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-slate-900/70" />

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-3">
          {benefits.map(({ key, Icon }) => (
            <div key={key}>
              <span className="grid size-12 place-items-center rounded-xl bg-white/10 text-white backdrop-blur">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-white">{t(`home.benefits.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm text-pretty text-slate-300">
                {t(`home.benefits.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- National motto ---------- */}
      <section className="relative isolate overflow-hidden">
        {monument && (
          <img
            src={monument}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover opacity-15"
            loading="lazy"
          />
        )}
        <div className="from-ecivil-green-50 absolute inset-0 -z-20 bg-gradient-to-b to-white" />

        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <MaliFlag className="mx-auto h-8 w-12 shadow-sm" title={t('home.motto.flagAlt')} />

          <p className="mt-6 text-2xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
            {t('home.motto.text')}
          </p>
          <p className="mt-4 text-pretty text-slate-600">{t('home.motto.description')}</p>

          <Link
            to="/services"
            className="bg-ecivil-green-600 hover:bg-ecivil-green-700 mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 font-semibold text-white transition-colors"
          >
            <Landmark className="size-4" aria-hidden="true" />
            {t('home.cta')}
          </Link>
        </div>

        <MaliStripe />
      </section>
    </>
  );
}
