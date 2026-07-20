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

/**
 * Hex equivalents of STATUS_META, for inline fills that cannot take a utility
 * class. Kept adjacent so the two never drift apart.
 */
export const STATUS_COLOR = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#0284c7',
  PENDING_PAYMENT: '#b45309',
  PAID: '#4f46e5',
  UNDER_REVIEW: '#0284c7',
  NEEDS_INFO: '#b45309',
  APPROVED: '#0f8449',
  REJECTED: '#a80d1e',
  ISSUED: '#0f8449',
  DELIVERED: '#0c6739',
};

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '—';
}

/**
 * Categorical series colours, one per module, assigned by entity and never by
 * rank — a filter that drops a module must not repaint the survivors.
 *
 * These are NOT the Mali brand colours, deliberately. Green/gold/red is a flag,
 * not a categorical scale: validated as chart series, the gold fell outside the
 * lightness band and under 3:1 contrast, slate read as grey, and red against gold
 * measured ΔE 1.0 under deuteranopia — indistinguishable. This set (Okabe–Ito)
 * passes the lightness band, chroma floor, CVD separation and normal-vision
 * checks. The brand palette keeps badges and chrome, where a label always sits
 * beside the hue.
 *
 * `#CC79A7` measures 2.98:1 against the surface, just under the 3:1 target, so
 * every chart using it carries direct labels rather than leaning on the fill.
 */
export const MODULE_SERIES_COLOR = {
  identity: '#0072B2',
  lifeEvents: '#009E73',
  mobility: '#D55E00',
  land: '#CC79A7',
};

/** Single-series charts use one hue; identity comes from the title, not colour. */
export const SERIES_HUE = '#0f8449';

/**
 * Brand marks per payment provider. Real logos rather than Lucide glyphs — a payer
 * recognises the wallet they use by its mark. CARD is fronted by the partner bank.
 */
export const PROVIDER_META = {
  ORANGE_MONEY: { logo: orangeMoneyLogo, alt: 'Orange Money' },
  WAVE: { logo: waveMoneyLogo, alt: 'Wave' },
  CARD: { logo: ecobankLogo, alt: 'Ecobank' },
};
