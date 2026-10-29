/**
 * Safe Array Helper to ensure any data source is reliably treated as an array.
 * Unwraps ASP.NET Core $values serialization format and safely falls back to empty array.
 */
export const ensureArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.$values)) return data.$values;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

/**
 * Safe filter that guarantees the source is an array.
 */
export const safeFilter = (data, predicate) => {
  return ensureArray(data).filter(predicate);
};

/**
 * Safe map that guarantees the source is an array.
 */
export const safeMap = (data, fn) => {
  return ensureArray(data).map(fn);
};
