import { describe, expect, it } from 'vitest';

import addLiquidityFormSource from '@/modules/pool/components/AddLiquidity/Form.vue?raw';

describe('AddLiquidity Form source', () => {
  it('keeps the SelectToken component reference distinct from the select handler', () => {
    expect(addLiquidityFormSource).toContain('<SelectToken');
    expect(addLiquidityFormSource).toContain('@select="handleSelectToken"');
    expect(addLiquidityFormSource).not.toContain('<select-token');
    expect(addLiquidityFormSource).toContain('const handleSelectToken = async (token: AccountAsset) => {');
    expect(addLiquidityFormSource).not.toContain('const selectToken = async (token: AccountAsset) => {');
  });
});
