const DEVELOPMENT_LOOPBACK_SOURCES = new Set([
  'http://localhost:*',
  'http://127.0.0.1:*',
  'http://0.0.0.0:*',
  'ws://localhost:*',
  'ws://127.0.0.1:*',
  'ws://0.0.0.0:*',
]);
const COMPANION_SOURCE = 'http://127.0.0.1:39847';
const PRODUCTION_SOURCES = new Set(["'self'", 'https:', 'wss:', COMPANION_SOURCE, "'none'"]);

/** Read quoted attributes from the repository's static HTML metadata. */
function attributes(tag, name) {
  return [...tag.matchAll(new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'gi'))];
}

/**
 * Narrows development-only loopback permissions in a static document's CSP.
 * The optional companion is retained only when the input already permits its
 * exact origin or HTTP loopback wildcard. Stricter renderer policies are never
 * expanded. Missing/ambiguous policies and unexpected sources fail the build.
 *
 * @param {string} html The web or Electron renderer HTML entry.
 * @returns {string} HTML with only its connect-src directive rewritten.
 */
export function productionCspHtml(html) {
  // Ignore commented metadata without changing offsets into the original HTML.
  const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
  const policies = [...visibleHtml.matchAll(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)].filter((tag) =>
    attributes(tag[0], 'http-equiv').some((attribute) => attribute[2].toLowerCase() === 'content-security-policy')
  );
  if (policies.length !== 1) throw new Error('Production HTML requires exactly one CSP meta element.');

  const tag = policies[0];
  const contents = attributes(tag[0], 'content');
  if (attributes(tag[0], 'http-equiv').length !== 1 || contents.length !== 1) {
    throw new Error('Production CSP meta attributes must be unambiguous.');
  }
  const content = contents[0];
  const directives = content[2].split(';');
  const connectIndexes = directives.flatMap((directive, index) =>
    /^connect-src(?:\s|$)/i.test(directive.trim()) ? [index] : []
  );
  if (connectIndexes.length !== 1) throw new Error('Production CSP requires exactly one connect-src directive.');

  const index = connectIndexes[0];
  const sources = directives[index].trim().split(/\s+/).slice(1);
  if (!sources.length || (sources.includes("'none'") && sources.length !== 1)) {
    throw new Error('Production CSP connect-src must declare an unambiguous source list.');
  }
  if (sources.some((source) => !PRODUCTION_SOURCES.has(source) && !DEVELOPMENT_LOOPBACK_SOURCES.has(source))) {
    throw new Error('Production CSP connect-src contains an unreviewed source.');
  }
  const productionSources = sources.filter((source) => !DEVELOPMENT_LOOPBACK_SOURCES.has(source));
  if (sources.includes('http://127.0.0.1:*') && !productionSources.includes(COMPANION_SOURCE)) {
    productionSources.push(COMPANION_SOURCE);
  }
  const leadingSpace = directives[index].match(/^\s*/)[0];
  directives[index] = `${leadingSpace}connect-src ${productionSources.join(' ') || "'none'"}`;
  const nextContent = content[0].replace(content[2], directives.join(';'));
  const nextTag = tag[0].slice(0, content.index) + nextContent + tag[0].slice(content.index + content[0].length);
  return html.slice(0, tag.index) + nextTag + html.slice(tag.index + tag[0].length);
}

/**
 * Applies the production boundary to both Vite and Electron renderer builds.
 * Development HTML keeps the local indexer/HMR sources needed by `yarn serve`.
 * @returns {import('vite').Plugin}
 */
export function productionCspPlugin() {
  return {
    name: 'polkaswap:production-csp',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: productionCspHtml },
  };
}
