/**
 * The flag of Mali, drawn rather than downloaded.
 *
 * Three equal vertical bands at the official 2:3 ratio, in the official colours.
 * Geometry this simple is not copyrightable, so there is no licence question and
 * nothing to keep in sync with an image file.
 *
 * Decorative by default (`aria-hidden`); pass a `title` where it carries meaning.
 */
export default function MaliFlag({ className = 'h-4 w-6', title, rounded = true }) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={`${className} ${rounded ? 'rounded-[2px]' : ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <rect width="300" height="600" x="0" fill="#14B53A" />
      <rect width="300" height="600" x="300" fill="#FCD116" />
      <rect width="300" height="600" x="600" fill="#CE1126" />
    </svg>
  );
}

/** The three bands as a thin rule — a quiet national marker for section edges. */
export function MaliStripe({ className = '' }) {
  return (
    <div aria-hidden="true" className={`flex h-1 w-full overflow-hidden ${className}`}>
      <span className="flex-1 bg-[#14B53A]" />
      <span className="flex-1 bg-[#FCD116]" />
      <span className="flex-1 bg-[#CE1126]" />
    </div>
  );
}
