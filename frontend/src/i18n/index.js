import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import commonFr from '../locales/fr/common.json';

/**
 * French is the only locale for now. Bambara and other national languages are
 * candidates later — hence i18next from day one rather than hardcoded strings.
 */
i18n.use(initReactI18next).init({
  resources: { fr: { common: commonFr } },
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
