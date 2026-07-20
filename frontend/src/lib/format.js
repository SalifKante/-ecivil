/** XOF is a non-decimal currency — amounts are whole francs. */
export function formatXof(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '—';
}

import { Fingerprint, ScrollText, CarFront, LandPlot } from 'lucide-react';
import orangeMoneyLogo from '../assets/orange_money_logo.png';
import waveMoneyLogo from '../assets/wave_money_logo.png';
import ecobankLogo from '../assets/ecobank_logo.png';

/** Icon + palette per module, keyed by moduleKey. `Icon` is a Lucide component. */
export const MODULE_META = {
  identity: { Icon: Fingerprint, accent: 'bg-ecivil-green-100 text-ecivil-green-700' },
  lifeEvents: { Icon: ScrollText, accent: 'bg-ecivil-gold-100 text-ecivil-gold-700' },
  mobility: { Icon: CarFront, accent: 'bg-slate-200 text-slate-700' },
  land: { Icon: LandPlot, accent: 'bg-ecivil-red-100 text-ecivil-red-600' },
};

/**
 * Brand marks per payment provider. Real logos rather than Lucide glyphs — a payer
 * recognises the wallet they use by its mark. CARD is fronted by the partner bank.
 */
export const PROVIDER_META = {
  ORANGE_MONEY: { logo: orangeMoneyLogo, alt: 'Orange Money' },
  WAVE: { logo: waveMoneyLogo, alt: 'Wave' },
  CARD: { logo: ecobankLogo, alt: 'Ecobank' },
};
