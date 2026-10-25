/**
 * Finds known unsafe implementations in an emitted dependency module path.
 * Zod 4 still publishes a legacy /v3 entrypoint, so a clean version audit alone
 * does not establish that the browser uses its patched validator.
 *
 * @param {string} moduleId Rollup's resolved module identifier.
 * @returns {string | null} The unsafe implementation, if present.
 */
export function unsafeDependencyImplementation(moduleId) {
  const normalized = moduleId.replaceAll('\\', '/').replace(/[?#].*$/, '');
  const cryptoPackage = normalized.match(/\/(?:node_modules|vendor)\/(elliptic|crypto-browserify)(?:\/|$)/);
  if (cryptoPackage) return cryptoPackage[1];
  if (/\/(?:node_modules|vendor)\/zod\/(?:(?:src\/)?v3|lib)(?:\/|$)/.test(normalized)) return 'Zod legacy v3';
  return null;
}

/**
 * Rejects browser bundles that reintroduce the retired Elliptic crypto stack or
 * Zod's legacy implementation. Checks emitted chunks, including lazy chunks.
 * Registry audits separately validate the complete installed dependency graph.
 *
 * @returns {import('vite').Plugin}
 */
export function dependencySecurityPlugin() {
  return {
    name: 'polkaswap:dependency-security',
    apply: 'build',
    generateBundle(_options, bundle) {
      const findings = new Set();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const moduleId of Object.keys(output.modules)) {
          const implementation = unsafeDependencyImplementation(moduleId);
          if (implementation) findings.add(implementation);
        }
      }
      if (findings.size) {
        this.error(`Unsafe dependency implementation in browser bundle: ${[...findings].sort().join(', ')}`);
      }
    },
  };
}
