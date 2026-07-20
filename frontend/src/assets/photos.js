/**
 * Photographs, resolved by base name from this folder.
 *
 * A glob rather than fixed imports, so a missing file is `undefined` instead of a
 * build error, and `djenne.jpg` or `djenne.webp` resolve the same way. Components
 * fall back to a gradient when a photo is absent, which means the app builds and
 * runs before anyone has downloaded anything.
 *
 * Expected base names (the rest of the folder — logos, the specimen PDF — is
 * matched too but simply never looked up):
 *
 *   djenne          Grande Mosquée de Djenné      — hero
 *   bamako          Bamako skyline / Tour BCEAO   — benefits band
 *   citoyen-mobile  citizen using a smartphone    — diaspora block
 *   independance    Monument de l'Indépendance    — motto band
 *
 * Use public-domain or CC sources (Wikimedia Commons, Unsplash, Pexels). This repo
 * is public; images lifted from a search results page are somebody's copyright.
 *
 * Keep files under ~400 KB and no wider than ~1920px. These are decorative
 * backgrounds behind an opacity layer, and the hosted demo is the whole point of
 * the build — a multi-megabyte hero costs every visitor on a slow connection.
 */
const files = import.meta.glob('./*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byName = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.replace(/^\.\//, '').replace(/\.[^.]+$/, ''),
    url,
  ]),
);

/** URL for a photo, or `undefined` when it has not been added yet. */
export function photo(name) {
  return byName[name];
}

export const PHOTO_NAMES = ['djenne', 'bamako', 'citoyen-mobile', 'independance'];
