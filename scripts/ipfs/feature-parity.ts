import { readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

/**
 * Minimum combined release catalog from the 2026-09-28 verified production CID
 * bafybeidb3gmikyesy7f6gvs24zpqevf2n7pf2sxfbcjmvc6bbkhudvvl3a.
 * Provenance: output/go-history/bots-route-repair-20260928/feature-parity.json.
 * Additions are allowed; intentional removals require an explicit baseline review.
 */
export const REQUIRED_ROUTE_FRAGMENTS = [
  '',
  '/',
  '/:catchAll(.*)',
  '/bots/:pathMatch(.*)*',
  '/bots/:section(discover|lab|backtesting|my-bots)?',
  '/bridge',
  '/burn',
  '/buy-xor',
  '/dashboard',
  '/dashboard/owner',
  '/deposit',
  '/deposit/history',
  '/deposit/transfer-from-cex',
  '/explore',
  '/for-agents',
  '/get-ts',
  '/kensetsu',
  '/points',
  '/polkamarkt/:marketId?',
  '/pool',
  '/referral/:referrerAddress?',
  '/referral/bond',
  '/referral/unbond',
  '/rewards',
  '/staking',
  '/staking/sora',
  '/staking/sora/validators/select',
  '/staking/sora/validators/type',
  '/stats',
  '/store',
  '/swap/:first?/:second?',
  '/trade/:first?/:second?',
  '/wallet',
  ':asset',
  ':vault',
  'add/:first?/:second?',
  'books',
  'demeter',
  'farming',
  'history',
  'list',
  'pools',
  'staking',
  'tokens',
  'transaction',
] as const;

const REQUIRED_PAGES = {
  '/swap/:first?/:second?': 'SwapPage',
  '/bots/:section(discover|lab|backtesting|my-bots)?': 'BotsPage',
  '/store': 'StorePage',
  '/buy-xor': 'BuyXorPage',
  '/get-ts': 'GetTsPage',
} as const;

export interface StaticFeatureParity {
  entryModules: string[];
  reachableModules: number;
  relativeImportsChecked: number;
  routeFragments: string[];
  requiredPageChunks: Record<string, string>;
}

/** Reject missing files and references escaping the frozen build, including symlinks. */
function localFile(root: string, importer: string, specifier: string): string {
  let pathname: string;
  try {
    pathname = decodeURIComponent(specifier.split(/[?#]/, 1)[0]);
  } catch {
    throw new Error(`Invalid encoded build reference from ${relative(root, importer)}.`);
  }
  if (!pathname || /[\0\\]/.test(pathname)) throw new Error('Invalid local build reference.');
  const candidate = resolve(pathname.startsWith('/') ? root : dirname(importer), pathname.replace(/^\//, ''));
  const isInside = (path: string): boolean => path.startsWith(`${root}${sep}`);
  if (!isInside(candidate)) throw new Error(`Build reference escapes dist: ${specifier}`);
  try {
    const canonical = realpathSync(candidate);
    if (!isInside(canonical)) throw new Error('Symlink escapes dist.');
    if (!statSync(canonical).isFile()) throw new Error('Not a file.');
    return canonical;
  } catch {
    throw new Error(`Missing or unsafe build file ${relative(root, candidate)} (from ${relative(root, importer)}).`);
  }
}

/** The Vite entry must be an external module stored within this build. */
function entryModules(root: string, html: string): string[] {
  const entries: string[] = [];
  for (const tag of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = new Map<string, string>();
    for (const attr of tag[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs.set(attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4]);
    }
    if (attrs.get('type') !== 'module') continue;
    const src = attrs.get('src');
    if (!src || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(src)) {
      throw new Error('Build module entry must reference a local file.');
    }
    entries.push(localFile(root, resolve(root, 'index.html'), src));
  }
  if (!entries.length) throw new Error('No local module entry found in dist/index.html.');
  return entries;
}

/** Read literal import/export edges without evaluating any application code. */
function moduleSpecifier(node: ts.Node): string | undefined {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
    return ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : undefined;
  }
  return undefined;
}

/** Return a literal object's property initializer, ignoring unrelated string contents. */
function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const item = object.properties.find(
    (entry) =>
      ts.isPropertyAssignment(entry) &&
      (ts.isIdentifier(entry.name) || ts.isStringLiteralLike(entry.name)) &&
      entry.name.text === name
  );
  return item && ts.isPropertyAssignment(item) ? item.initializer : undefined;
}

/** Resolve the component's local alias, then collect imports in its loader expression. */
function componentImports(expression: ts.Expression, aliases: Map<string, ts.Expression>): string[] {
  const seen = new Set<string>();
  while (ts.isIdentifier(expression) && aliases.has(expression.text) && !seen.has(expression.text)) {
    seen.add(expression.text);
    expression = aliases.get(expression.text)!;
  }
  const imports: string[] = [];
  const visit = (node: ts.Node): void => {
    const specifier = moduleSpecifier(node);
    if (specifier) imports.push(specifier);
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return imports;
}

/**
 * Fail closed before IPFS add/pin if a combined feature disappeared from the
 * built entry's reachable ES-module graph. This accidental-omission guard is
 * not a runtime test or a defense against deliberately forged application code;
 * the per-route browser and same-CID promotion checks remain mandatory.
 */
export function assertStaticFeatureParity(distDirectory: string): StaticFeatureParity {
  const root = realpathSync(distDirectory);
  const entries = entryModules(
    root,
    readFileSync(localFile(root, resolve(root, 'index.html'), './index.html'), 'utf8')
  );
  const pending = [...entries];
  const visited = new Set<string>();
  const routes = new Set<string>();
  const pages: Record<string, string> = {};
  let importsChecked = 0;

  while (pending.length) {
    const filename = pending.pop()!;
    if (visited.has(filename)) continue;
    visited.add(filename);
    const source = ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.JS
    );
    const diagnostics = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
    if (diagnostics?.length) throw new Error(`Invalid JavaScript in ${relative(root, filename)}.`);
    const aliases = new Map<string, ts.Expression>();
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          aliases.set(declaration.name.text, declaration.initializer);
        }
      }
    }
    const visit = (node: ts.Node): void => {
      const specifier = moduleSpecifier(node);
      if (specifier && /^(?:\.{1,2}\/|\/(?!\/))/.test(specifier)) {
        const imported = localFile(root, filename, specifier);
        importsChecked++;
        if (/^\.(?:m?js|cjs)$/.test(extname(imported))) pending.push(imported);
      }
      if (ts.isObjectLiteralExpression(node)) {
        const path = property(node, 'path');
        const component = property(node, 'component');
        if (
          path &&
          ts.isStringLiteralLike(path) &&
          (component || property(node, 'children') || property(node, 'redirect'))
        ) {
          routes.add(path.text);
          const expectedPage = REQUIRED_PAGES[path.text as keyof typeof REQUIRED_PAGES];
          if (expectedPage && component) {
            for (const imported of componentImports(component, aliases)) {
              if (new RegExp(`^${expectedPage}(?:-[\\w-]+)?\\.js$`).test(basename(imported))) {
                pages[path.text] = localFile(root, filename, imported);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const missingRoutes = REQUIRED_ROUTE_FRAGMENTS.filter((path) => !routes.has(path));
  const missingPages = Object.entries(REQUIRED_PAGES)
    .filter(([path]) => !pages[path] || !visited.has(pages[path]))
    .map(([, page]) => page);
  if (missingRoutes.length || missingPages.length) {
    throw new Error(
      `Static feature parity failed: missing routes ${JSON.stringify(missingRoutes)}; missing reachable page chunks ${JSON.stringify(missingPages)}. Browser verification is also required.`
    );
  }
  return {
    entryModules: entries.map((path) => relative(root, path)),
    reachableModules: visited.size,
    relativeImportsChecked: importsChecked,
    routeFragments: [...routes].sort(),
    requiredPageChunks: Object.fromEntries(Object.entries(pages).map(([path, file]) => [path, relative(root, file)])),
  };
}
