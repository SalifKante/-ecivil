/**
 * The standard head of a citizen page: an optional eyebrow, the h1, and a lead
 * line. Extracted because the same three-element stack was being rebuilt on every
 * page with slightly different spacing and type sizes each time.
 */
export default function PageHeader({ eyebrow, title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-ecivil-green-700 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold text-balance text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-pretty text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
