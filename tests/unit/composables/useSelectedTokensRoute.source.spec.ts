import { describe, expect, it } from 'vitest';

import routeSource from '@/composables/useSelectedTokensRoute.ts?raw';

describe('useSelectedTokensRoute source', () => {
  it('uses the slim bundled route whitelist map instead of the full whitelist payload', () => {
    expect(routeSource).toContain("import routeWhitelistBySymbol from '@/consts/routeWhitelistBySymbol.json';");
    expect(routeSource).not.toContain("import bundledWhitelist from '../../public/whitelist.json';");
  });
});
