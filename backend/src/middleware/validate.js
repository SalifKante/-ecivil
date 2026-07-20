/**
 * Validates and REPLACES the request part with the parsed result, so handlers
 * only ever see coerced, stripped data — never raw client input.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);

    if (source === 'body') req.body = result.data;
    else req.validated = { ...(req.validated ?? {}), [source]: result.data };

    next();
  };
}
