import { TypeRegistry } from '@polkadot/types';
import type { RegistryTypes } from '@polkadot/types/types';
import { describe, expect, it } from 'vitest';

import * as definitions from '@/lib/substrate/types/interfaces/definitions';

describe('inlined substrate definitions', () => {
  it('loads every chain module from the local source tree', () => {
    expect(Object.keys(definitions)).toHaveLength(24);
    for (const module of Object.values(definitions)) {
      expect(module.types).toBeTypeOf('object');
      expect(module.rpc).toBeTypeOf('object');
    }
    expect(definitions.assets.rpc?.freeBalance.type).toBe('Option<BalanceInfo>');
    expect(definitions.runtime.types.SwapWithDesiredInput).toEqual({
      desiredAmountIn: 'Balance',
      minAmountOut: 'Balance',
    });
  });

  it('encodes a swap using the local runtime definitions without losing token precision', () => {
    const registry = new TypeRegistry();
    // Definition modules declare their codecs as DefinitionsTypes; the SDK casts the same shape in types/index.ts.
    registry.register(definitions.runtime.types as RegistryTypes);

    const amount = registry.createType('SwapAmount', {
      WithDesiredInput: {
        desiredAmountIn: '1000000000000000000',
        minAmountOut: '999999999999999999',
      },
    });

    expect(amount.toHex()).toBe('0x00000064a7b3b6e00d0000000000000000ffff63a7b3b6e00d0000000000000000');
  });
});
