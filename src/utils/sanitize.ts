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

/**
 * Escape special HTML characters from untrusted text before injecting into HTML contexts.
 */
export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';

  return String(value).replace(htmlEscapeRegExp, (char) => htmlEscapeMap[char] ?? char);
}

const DropWithContentTags = new Set(['script', 'style', 'template', 'noscript']);

const getBaseUrlForParsing = (): string => {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return 'http://localhost/';
};

const isSafeUrlAttribute = (rawValue: string): boolean => {
  const normalized = rawValue.trim();
  if (!normalized) return false;

  try {
    const url = new URL(normalized, getBaseUrlForParsing());
    return AllowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
};

type AllowedAttributesMap = Record<string, Set<string>>;

const buildAllowedAttributesMap = (options: SanitizeOptions): AllowedAttributesMap => {
  const merged = { ...DefaultAllowedAttributes, ...(options.allowedAttributes ?? {}) };
  return Object.entries(merged).reduce((result, [key, attrs]) => {
    result[key.toLowerCase()] = new Set((attrs ?? []).map((attr) => attr.toLowerCase()));
    return result;
  }, {} as AllowedAttributesMap);
};

const getTagAllowedAttributes = (tag: string, allowedAttributes: AllowedAttributesMap): Set<string> => {
  return new Set([...(allowedAttributes['*'] ?? []), ...(allowedAttributes[tag] ?? [])]);
};

const normalizeRel = (value: string): string => {
  // Preserve existing tokens while enforcing the important security ones.
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set(tokens);
  set.add('noopener');
  set.add('noreferrer');
  return Array.from(set).join(' ');
};

function sanitizeNode(
  node: Node,
  safeDoc: Document,
  allowedTags: Set<string>,
  allowedAttributes: AllowedAttributesMap
): Node | null {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return safeDoc.createTextNode(node.textContent ?? '');
  }

  // Element node
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    if (!allowedTags.has(tag)) {
      if (DropWithContentTags.has(tag)) return null;

      // Unwrap unknown tags but keep their *sanitized* children.
      const fragment = safeDoc.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => {
        const sanitizedChild = sanitizeNode(child, safeDoc, allowedTags, allowedAttributes);
        if (sanitizedChild) fragment.appendChild(sanitizedChild);
      });
      return fragment;
    }

    const safeEl = safeDoc.createElement(tag);
    const tagAllowedAttrs = getTagAllowedAttributes(tag, allowedAttributes);

    const attrs = Array.from(element.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      if (!tagAllowedAttrs.has(name)) continue;
      if (name.startsWith('on')) continue;

      const value = attr.value;

      if (name === 'href' || name === 'src') {
        if (!isSafeUrlAttribute(value)) continue;
        safeEl.setAttribute(name, value);
        continue;
      }

      if (tag === 'a' && name === 'rel') {
        // We'll normalize rel at the end based on target, but keep the token set.
        safeEl.setAttribute(name, value);
        continue;
      }

      safeEl.setAttribute(name, value);
    }

    // Defense-in-depth: harden new-tab links even if the upstream content forgot.
    if (tag === 'a' && safeEl.getAttribute('target') === '_blank') {
      safeEl.setAttribute('rel', normalizeRel(safeEl.getAttribute('rel') ?? ''));
    }

    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child, safeDoc, allowedTags, allowedAttributes);
      if (sanitizedChild) safeEl.appendChild(sanitizedChild);
    });

    return safeEl;
  }

  // Drop comments and other node types.
  return null;
}

export function sanitizeHtml(value: unknown, options: SanitizeOptions = {}): string {
  const input = value === undefined || value === null ? '' : String(value);

  if (!input) return '';

  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    // No DOM environment available. Degrade to escaping, which is safe but loses formatting.
    return escapeHtml(input);
  }

  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(input, 'text/html');
  } catch {
    return escapeHtml(input);
  }

  const safeDoc = document.implementation.createHTMLDocument('');
  const container = safeDoc.createElement('div');

  const allowedTags = new Set((options.allowedTags ?? DefaultAllowedTags).map((tag) => tag.toLowerCase()));
  const allowedAttributes = buildAllowedAttributesMap(options);

  Array.from(parsed.body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, safeDoc, allowedTags, allowedAttributes);
    if (sanitizedChild) container.appendChild(sanitizedChild);
  });

  return container.innerHTML;
}

export default {
  escapeHtml,
  sanitizeHtml,
};
