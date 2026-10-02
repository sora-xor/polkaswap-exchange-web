/** Adds locale separators to a canonical decimal string without rounding or numeric conversion. */
export function formatDecimalDisplay(value: string, decimal = '.', thousand = ','): string {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match) return value;

  const [, sign, integer, fraction] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, () => thousand);
  return `${sign}${grouped}${fraction === undefined ? '' : `${decimal}${fraction}`}`;
}
