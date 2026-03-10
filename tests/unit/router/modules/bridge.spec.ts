import { describe, expect, it } from 'vitest';

import { bridgeRoutes } from '@/router/modules/bridge';

describe('bridgeRoutes', () => {
  it('does not expose deprecated sccp route', () => {
    const bridgeRoute = bridgeRoutes.find(({ path }) => path === '/bridge');
    const sccpRoute = bridgeRoute?.children?.find(({ path }) => path === 'sccp');

    expect(sccpRoute).toBeUndefined();
  });
});
