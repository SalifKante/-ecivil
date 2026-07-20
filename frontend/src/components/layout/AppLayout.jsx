import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PrototypeBanner from './PrototypeBanner';
import DemoModeBanner from '../DemoModeBanner';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      {/*
        Hidden until focused. The header is sticky and carries a four-item nav, so
        without this a keyboard user tabs through the whole chrome on every page.
      */}
      <a
        href="#contenu"
        className="focus:bg-ecivil-green-600 sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-white"
      >
        {t('common.skipToContent')}
      </a>

      <PrototypeBanner />
      <DemoModeBanner />
      <Header />
      <main id="contenu" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
