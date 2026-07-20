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
 * Colour per request status. Neutral while the file is in motion, green once the
 * decision is favourable, red when it is not — so a queue is readable at a glance.
 */
export const STATUS_META = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-sky-100 text-sky-700',
  PENDING_PAYMENT: 'bg-ecivil-gold-100 text-ecivil-gold-700',
  PAID: 'bg-indigo-100 text-indigo-700',
  UNDER_REVIEW: 'bg-sky-100 text-sky-700',
  NEEDS_INFO: 'bg-ecivil-gold-100 text-ecivil-gold-700',
  APPROVED: 'bg-ecivil-green-100 text-ecivil-green-700',
  REJECTED: 'bg-ecivil-red-100 text-ecivil-red-600',
  ISSUED: 'bg-ecivil-green-100 text-ecivil-green-700',
  DELIVERED: 'bg-ecivil-green-100 text-ecivil-green-700',
};

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '—';
}

/**
 * Brand marks per payment provider. Real logos rather than Lucide glyphs — a payer
 * recognises the wallet they use by its mark. CARD is fronted by the partner bank.
 */
export const PROVIDER_META = {
  ORANGE_MONEY: { logo: orangeMoneyLogo, alt: 'Orange Money' },
  WAVE: { logo: waveMoneyLogo, alt: 'Wave' },
  CARD: { logo: ecobankLogo, alt: 'Ecobank' },
};
