export function format(obj: any) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const keys = Object.keys(obj);

  if (!keys.length) return null;

  const formatted = {};

  keys.forEach((key) => {
    const inner = format(obj[key]);
    if (inner) {
      formatted[key] = inner;
    }
  });

  return formatted;
}

export function sortAlpha(obj: any) {
  if (typeof obj !== 'object') return obj;

  const sorted = {};

  const keys = Object.keys(obj)
    .map((k) => [k, k.toLowerCase()])
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([k]) => k);

  keys.forEach((key) => {
    sorted[key] = sortAlpha(obj[key]);
  });

  return sorted;
}
