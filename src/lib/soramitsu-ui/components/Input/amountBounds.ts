type DecimalParts = { negative: boolean; integer: string; fraction: string; natural: string };

/** Parses decimal bounds as digits, expanding scientific notation without floating-point token math. */
function decimalParts(value: string | number | undefined): DecimalParts | null {
  if (value === undefined) return null;
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(value).trim());
  if (!match || !(match[2] || match[3])) return null;
  const [, sign, whole, fractional = '', exponentText = '0'] = match;
  // The exponent is a string position, not an amount; cap expansion of malformed bounds.
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10_000) return null;
  const digits = whole + fractional;
  const point = whole.length + exponent;
  const integer = (point <= 0 ? '0' : digits.slice(0, point).padEnd(point, '0')).replace(/^0+(?=\d)/, '');
  const fraction = point < 0 ? '0'.repeat(-point) + digits : digits.slice(point);
  const negative = sign === '-' && /[1-9]/.test(integer + fraction);
  return {
    negative,
    integer,
    fraction: fraction.replace(/0+$/, ''),
    natural: `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`,
  };
}

/** Compares signed natural decimals using digit lengths and lexicographic order. */
function compareDecimals(first: DecimalParts, second: DecimalParts): number {
  if (first.negative !== second.negative) return first.negative ? -1 : 1;
  const sign = first.negative ? -1 : 1;
  if (first.integer.length !== second.integer.length) return sign * (first.integer.length - second.integer.length);
  if (first.integer !== second.integer) return sign * (first.integer < second.integer ? -1 : 1);
  const precision = Math.max(first.fraction.length, second.fraction.length);
  const a = first.fraction.padEnd(precision, '0');
  const b = second.fraction.padEnd(precision, '0');
  return a === b ? 0 : sign * (a < b ? -1 : 1);
}

/** Keeps an in-range edit verbatim and clamps only to an exact natural decimal bound. */
export function clampDecimalInput(value: string, min?: string | number, max?: string | number): string {
  const amount = decimalParts(value);
  if (!amount) return value;
  const lower = decimalParts(min);
  const upper = decimalParts(max);
  if (lower && compareDecimals(amount, lower) < 0) return lower.natural;
  if (upper && compareDecimals(amount, upper) > 0) return upper.natural;
  return value;
}
