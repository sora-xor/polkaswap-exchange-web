import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { assertStaticFeatureParity, REQUIRED_ROUTE_FRAGMENTS } from '../../../../scripts/ipfs/feature-parity';

const directories: string[] = [];
const pages: Record<string, string> = {
  '/swap/:first?/:second?': 'SwapPage',
  '/bots/:section(discover|lab|backtesting|my-bots)?': 'BotsPage',
  '/store': 'StorePage',
  '/buy-xor': 'BuyXorPage',
  '/get-ts': 'GetTsPage',
};

/** Small compiled-site fixture with real static/dynamic import edges and one aliased loader. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'polkaswap-feature-parity-'));
  directories.push(root);
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<script crossorigin type="module" src="./assets/entry.js"></script>');
  writeFileSync(join(root, 'assets/entry.js'), 'export { routes } from "./routes.js";');
  const routes = REQUIRED_ROUTE_FRAGMENTS.map((path) => {
    const page = pages[path];
    if (!page) return `{path:${JSON.stringify(path)},redirect:"/swap"}`;
    const loader = page === 'SwapPage' ? 'swapAlias' : `()=>import("./${page}-abc123.js")`;
    writeFileSync(join(root, `assets/${page}-abc123.js`), 'export default { render() {} };');
    return `{path:${JSON.stringify(path)},component:${loader}}`;
  });
  writeFileSync(
    join(root, 'assets/routes.js'),
    `const swapLoader=()=>import("./SwapPage-abc123.js"),swapAlias=swapLoader; export const routes=[${routes.join(',')}];`
  );
  return root;
}

/** Change only a fixture's route catalog. */
function changeRoutes(root: string, change: (source: string) => string): void {
  const filename = join(root, 'assets/routes.js');
  writeFileSync(filename, change(readFileSync(filename, 'utf8')));
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('assertStaticFeatureParity', () => {
  it('accepts the 45-fragment combined release with each page reachable from its route', () => {
    const result = assertStaticFeatureParity(fixture());
    expect(REQUIRED_ROUTE_FRAGMENTS).toHaveLength(45);
    expect(result.routeFragments).toHaveLength(45);
    expect(result.entryModules).toEqual(['assets/entry.js']);
    expect(result.reachableModules).toBe(7);
    expect(result.relativeImportsChecked).toBe(6);
    expect(Object.values(result.requiredPageChunks)).toEqual(
      expect.arrayContaining([
        'assets/SwapPage-abc123.js',
        'assets/BotsPage-abc123.js',
        'assets/StorePage-abc123.js',
        'assets/BuyXorPage-abc123.js',
        'assets/GetTsPage-abc123.js',
      ])
    );
  });

  it('allows new routes without silently allowing a baseline removal', () => {
    const root = fixture();
    changeRoutes(root, (source) => `${source}export const added=[{path:"/new-feature",redirect:"/swap"}];`);
    expect(assertStaticFeatureParity(root).routeFragments).toContain('/new-feature');
  });

  it.each(['/buy-xor', '/get-ts', '/store', '/bots/:section(discover|lab|backtesting|my-bots)?', '/deposit/history'])(
    'rejects a lost route %s even if the old page file and a decoy string remain',
    (route) => {
      const root = fixture();
      changeRoutes(
        root,
        (source) =>
          source.replace(`path:${JSON.stringify(route)}`, 'path:"/removed-feature"') +
          `;const decoy=${JSON.stringify(route)};`
      );
      expect(() => assertStaticFeatureParity(root)).toThrow('Static feature parity failed: missing routes');
    }
  );

  it('does not count an orphaned route catalog that is no longer imported by the entry', () => {
    const root = fixture();
    writeFileSync(join(root, 'assets/entry.js'), 'export const placeholder = true;');
    expect(() => assertStaticFeatureParity(root)).toThrow('missing reachable page chunks');
  });

  it('rejects a route replaced by a redirect even when its page remains imported elsewhere', () => {
    const root = fixture();
    changeRoutes(
      root,
      (source) =>
        source.replace('component:()=>import("./BuyXorPage-abc123.js")', 'redirect:"/swap"') +
        ';import("./BuyXorPage-abc123.js");'
    );
    expect(() => assertStaticFeatureParity(root)).toThrow(
      'missing routes []; missing reachable page chunks ["BuyXorPage"]'
    );
  });

  it('rejects a removed required lazy page chunk', () => {
    const root = fixture();
    rmSync(join(root, 'assets/BotsPage-abc123.js'));
    expect(() => assertStaticFeatureParity(root)).toThrow('Missing or unsafe build file assets/BotsPage-abc123.js');
  });

  it.each(['import "./missing.js";', 'export {x} from "./missing.js";', 'import("./missing.css");'])(
    'rejects broken relative module edges: %s',
    (edge) => {
      const root = fixture();
      writeFileSync(join(root, 'assets/GetTsPage-abc123.js'), edge);
      expect(() => assertStaticFeatureParity(root)).toThrow('Missing or unsafe build file assets/missing.');
    }
  );

  it('does not execute code or fetch external imports', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'assets/GetTsPage-abc123.js'),
      'throw new Error("must never run");import("https://example.invalid/remote.js");'
    );
    expect(assertStaticFeatureParity(root).reachableModules).toBe(7);
  });

  it('rejects invalid reachable JavaScript', () => {
    const root = fixture();
    writeFileSync(join(root, 'assets/GetTsPage-abc123.js'), 'export const = ;');
    expect(() => assertStaticFeatureParity(root)).toThrow('Invalid JavaScript');
  });

  it('rejects escaping relative imports', () => {
    const root = fixture();
    writeFileSync(join(root, 'assets/GetTsPage-abc123.js'), 'import "../../outside.js";');
    expect(() => assertStaticFeatureParity(root)).toThrow('Build reference escapes dist');
  });

  it('rejects symlinked files outside the frozen dist', () => {
    const root = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'polkaswap-outside-'));
    directories.push(outside);
    writeFileSync(join(outside, 'page.js'), 'export default {};');
    rmSync(join(root, 'assets/GetTsPage-abc123.js'));
    symlinkSync(join(outside, 'page.js'), join(root, 'assets/GetTsPage-abc123.js'));
    expect(() => assertStaticFeatureParity(root)).toThrow('Missing or unsafe build file');
  });

  it.each([
    '<!-- <script type="module" src="./assets/entry.js"></script> -->',
    '<script type="module" src="https://example.invalid/entry.js"></script>',
    '<script type="module">import "./assets/entry.js";</script>',
  ])('rejects missing/locality-unsafe module entry: %s', (html) => {
    const root = fixture();
    writeFileSync(join(root, 'index.html'), html);
    expect(() => assertStaticFeatureParity(root)).toThrow(/module entry/);
  });
});
