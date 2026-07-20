import { Citizen } from '../models/index.js';

/**
 * MOCK: national identity registry (RAVEC / registre national d'identité).
 *
 * The real system would call a government service over a secured channel. Here we
 * read the seeded `citizens` collection instead. Everything behind this interface
 * is fictional — see CLAUDE.md §2.
 *
 * Keep this module's shape stable: it is the seam a real integration slots into.
 */

/** Returns the registry record for a NINA, or null. */
export async function findByNina(nina) {
  const citizen = await Citizen.findOne({ nina }).lean();
  if (!citizen) return null;

  return {
    id: citizen._id,
    nina: citizen.nina,
    firstName: citizen.firstName,
    lastName: citizen.lastName,
    birthDate: citizen.birthDate,
    birthPlace: citizen.birthPlace,
    gender: citizen.gender,
    phone: citizen.phone,
    email: citizen.email,
    address: citizen.address,
    isDiaspora: citizen.isDiaspora,
    consulate: citizen.consulate,
  };
}

/**
 * Fields safe to expose before authentication, used to confirm "is this you?"
 * on the login screen. Deliberately minimal: an unauthenticated caller must not
 * be able to harvest a full identity record by guessing NINAs.
 */
export function toPublicIdentity(record) {
  return {
    nina: record.nina,
    firstName: record.firstName,
    lastName: record.lastName,
    phoneMasked: maskPhone(record.phone),
  };
}

/** +22370000101 -> +223 •• •• 01 01 */
export function maskPhone(phone) {
  if (!phone) return null;
  const visible = phone.slice(-4);
  return `${phone.slice(0, 4)} •• •• ${visible.slice(0, 2)} ${visible.slice(2)}`;
}
