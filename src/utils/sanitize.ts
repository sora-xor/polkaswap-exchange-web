const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const htmlEscapeRegExp = /[&<>"']/g;

type SanitizeOptions = {
  allowedTags?: Array<string>;
  allowedAttributes?: Record<string, Array<string>>;
};

const DefaultAllowedTags = ['a', 'span', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'div'];
const DefaultAllowedAttributes: Record<string, Array<string>> = {
  '*': ['class'],
  a: ['href', 'title', 'target', 'rel', 'class'],
  span: ['class'],
  div: ['class'],
};

const AllowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

const tagRegexp = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
const attrRegexp = /([a-zA-Z0-9-:]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
const htmlEntityRegexp = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

const NamedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  colon: ':',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(htmlEntityRegexp, (match, entity) => {
    if (!entity) return match;

    if (entity.startsWith('#')) {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const codePoint = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

      if (!Number.isNaN(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }

      return match;
    }

    const replacement = NamedEntities[entity.toLowerCase()];

    return replacement ?? match;
  });
}

/**
 * Escape special HTML characters from untrusted text before injecting into HTML contexts.
 */
export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';

  return String(value).replace(htmlEscapeRegExp, (char) => htmlEscapeMap[char] ?? char);
}

export function sanitizeHtml(value: unknown, options: SanitizeOptions = {}): string {
  const input = value === undefined || value === null ? '' : String(value);

  if (!input) return '';

  const allowedTags = new Set(options.allowedTags ?? DefaultAllowedTags);
  const allowedAttributes = { ...DefaultAllowedAttributes, ...(options.allowedAttributes ?? {}) };

  const sanitized = input.replace(tagRegexp, (match, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!allowedTags.has(tag)) {
      return '';
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    const tagAllowedAttrs = new Set([...(allowedAttributes['*'] ?? []), ...(allowedAttributes[tag] ?? [])]);

    if (tagAllowedAttrs.size === 0 || rawAttrs.trim() === '') {
      return `<${tag}>`;
    }

    let sanitizedAttrs = '';
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegexp.exec(rawAttrs))) {
      const attrName = attrMatch[1]?.toLowerCase();
      if (!attrName || !tagAllowedAttrs.has(attrName)) continue;

      const rawValue = attrMatch[2];
      if (rawValue === undefined) {
        sanitizedAttrs += ` ${attrName}`;
        continue;
      }

      const unquoted = rawValue.trim().replace(/^['"]|['"]$/g, '');
      const decodedValue = decodeHtmlEntities(unquoted);
      const escapedValue = escapeHtml(unquoted);

      if (attrName === 'href' || attrName === 'src') {
        try {
          const normalizedValue = decodedValue.trim();
          if (!normalizedValue) {
            continue;
          }

          const url = new URL(normalizedValue, 'http://localhost');
          if (!AllowedProtocols.includes(url.protocol)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      sanitizedAttrs += ` ${attrName}="${escapedValue}"`;
    }

    return `<${tag}${sanitizedAttrs}>`;
  });

  return sanitized;
}

export default {
  escapeHtml,
  sanitizeHtml,
};
