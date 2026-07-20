import { REQUEST_STATUS } from '../../constants/index.js';

/**
 * Message bodies per status.
 *
 * These are French strings in the backend, which the error-message convention
 * forbids — deliberately. An SMS has no client to localise it: the text the
 * operator sends IS the text the citizen reads. i18n keys apply to API errors,
 * not to outbound messages.
 *
 * Statuses absent from this map produce no notification. DRAFT and SUBMITTED are
 * left out on purpose: the citizen just performed those actions and does not need
 * a message telling them what they did a second ago.
 */
export const TEMPLATES = {
  [REQUEST_STATUS.PENDING_PAYMENT]: {
    subject: 'Votre demande est enregistrée',
    body: ({ reference, amountDue, currency }) =>
      `eCivil : votre demande ${reference} est enregistrée. ` +
      `Montant à régler : ${amountDue} ${currency}. Connectez-vous pour payer.`,
  },
  [REQUEST_STATUS.PAID]: {
    subject: 'Paiement confirmé',
    body: ({ reference }) =>
      `eCivil : paiement confirmé pour la demande ${reference}. ` +
      `Elle est transmise au service instructeur.`,
  },
  [REQUEST_STATUS.UNDER_REVIEW]: {
    subject: 'Votre demande est en cours d’instruction',
    body: ({ reference }) =>
      `eCivil : votre demande ${reference} est en cours d’instruction par un agent.`,
  },
  [REQUEST_STATUS.NEEDS_INFO]: {
    subject: 'Complément d’information demandé',
    body: ({ reference, note }) =>
      `eCivil : un complément est nécessaire pour la demande ${reference}. ` +
      `${note ?? ''} Connectez-vous pour compléter votre dossier.`,
  },
  [REQUEST_STATUS.APPROVED]: {
    subject: 'Votre demande est approuvée',
    body: ({ reference }) =>
      `eCivil : votre demande ${reference} est approuvée. ` +
      `Votre document sera disponible sous peu.`,
  },
  [REQUEST_STATUS.REJECTED]: {
    subject: 'Votre demande a été rejetée',
    body: ({ reference, note }) =>
      `eCivil : votre demande ${reference} a été rejetée. Motif : ${note ?? 'non précisé'}.`,
  },
  [REQUEST_STATUS.ISSUED]: {
    subject: 'Votre document est disponible',
    body: ({ reference }) =>
      `eCivil : le document de votre demande ${reference} est disponible. ` +
      `Connectez-vous pour le télécharger. (Spécimen de démonstration, sans valeur légale.)`,
  },
  [REQUEST_STATUS.DELIVERED]: {
    subject: 'Votre document a été remis',
    body: ({ reference }) => `eCivil : le document de la demande ${reference} vous a été remis.`,
  },
};

export function templateFor(status) {
  return TEMPLATES[status] ?? null;
}
