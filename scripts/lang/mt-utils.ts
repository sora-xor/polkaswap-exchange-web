/**
 * Utilities to safely machine-translate i18n strings:
 * - Protects placeholders like {amount}, {Sora}, {tokenSymbol}
 * - Protects vue-i18n links like @:path.to.key and @:(path.to.key)
 * - Protects ICU-style selects/braces minimally (content within {...})
 */

export type MaskResult = {
  masked: string;
  table: Record<string, string>;
};

const TOKEN_PREFIX = '__PH__';

// Terms that must not be translated as stand-alone values
const DO_NOT_TRANSLATE = new Set(['SORA', 'Polkaswap', 'XOR', 'VAL', 'DOT', 'KSM', 'PSWAP', 'TBCD', 'XSTUSD', 'MAX']);

// Regexes to protect segments
const CURLY_PLACEHOLDER = /\{[^}]+\}/g; // {token}
const I18N_LINK_PARENS = /@:\([^)]+\)/g; // @:(path.to.key)
const I18N_LINK_PLAIN = /@:[A-Za-z0-9_.-]+/g; // @:path.to.key

export function maskPlaceholders(input: string): MaskResult {
  const table: Record<string, string> = {};
  let index = 0;

  const replacer = (match: string) => {
    const token = `${TOKEN_PREFIX}${index++}__`;
    table[token] = match;
    return token;
  };

  let masked = input.replace(CURLY_PLACEHOLDER, replacer);
  masked = masked.replace(I18N_LINK_PARENS, replacer);
  masked = masked.replace(I18N_LINK_PLAIN, replacer);

  return { masked, table };
}

export function restorePlaceholders(input: string, table: Record<string, string>): string {
  let restored = input;
  Object.keys(table).forEach((key) => {
    restored = restored.split(key).join(table[key]);
  });
  return restored;
}

export function shouldSkipTranslation(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (DO_NOT_TRANSLATE.has(trimmed)) return true;
  // Lines that are only placeholders/links/punct should be skipped
  const noLetters = trimmed
    .replace(CURLY_PLACEHOLDER, '')
    .replace(I18N_LINK_PARENS, '')
    .replace(I18N_LINK_PLAIN, '')
    .replace(/[\p{P}\p{S}\s]/gu, '');
  if (!noLetters) return true;
  return false;
}

export type WalkCallback = (path: string[], value: string) => Promise<string> | string;

export async function walkAndTranslate(
  obj: Record<string, any>,
  translate: WalkCallback,
  path: string[] = []
): Promise<Record<string, any>> {
  const out: Record<string, any> = Array.isArray(obj) ? [] : ({} as any);
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string') {
      out[key] = await translate([...path, key], val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = await walkAndTranslate(val, translate, [...path, key]);
    } else {
      out[key] = val;
    }
  }
  return out;
}
