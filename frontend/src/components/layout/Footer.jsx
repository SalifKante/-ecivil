import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark } from 'lucide-react';
import MaliFlag, { MaliStripe } from '../MaliFlag';

const modules = ['identity', 'lifeEvents', 'mobility', 'land'];

const links = [
  { to: '/services', key: 'nav.services' },
  { to: '/suivi', key: 'nav.tracking' },
  { to: '/verifier', key: 'nav.verify' },
  { to: '/admin/connexion', key: 'footer.staffAccess' },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <MaliStripe />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="from-ecivil-green-600 to-ecivil-green-500 grid size-9 place-items-center rounded-lg bg-gradient-to-br text-white"
            >
              <Landmark className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-white">{t('app.name')}</span>
              <span className="block text-xs text-slate-400">{t('app.tagline')}</span>
            </span>
          </div>

          <p className="mt-4 max-w-sm text-sm text-pretty text-slate-400">
            {t('footer.disclaimer')}
          </p>

          <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <MaliFlag className="h-3.5 w-5" />
            {t('home.motto.text')}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{t('footer.navigation')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors hover:text-white">
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{t('home.modulesTitle')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {modules.map((key) => (
              <li key={key}>{t(`modules.${key}.name`)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} {t('footer.rights')}
          </p>
          {/* Repeated at the very bottom on purpose: the last thing on the page
              should still say this is not a real government service. */}
          <p className="mt-1 text-slate-500">{t('prototype.banner')}</p>
        </div>
      </div>
    </footer>
  );
}
