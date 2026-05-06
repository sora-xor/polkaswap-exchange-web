import { describe, expect, it, vi } from 'vitest';

import { BaseApi } from '@/lib/substrate/sdk/BaseApi';
import { Operation } from '@/lib/substrate/sdk/types';

type BaseApiWithPrivateFeeFactory = {
  getEmptyExtrinsic(operation: Operation): unknown;
};

describe('BaseApi static network fee extrinsics', () => {
  it('estimates burn-with-remark fees with a max-size Nexus remark payload', () => {
    const burnTx = { type: 'burn' };
    const remarkTx = { type: 'remark' };
    const batchTx = { type: 'batch' };

    const api = {
      tx: {
        assets: {
          burn: vi.fn(() => burnTx),
        },
        system: {
          remark: vi.fn(() => remarkTx),
        },
        utility: {
          batchAll: vi.fn(() => batchTx),
        },
      },
    };

    const baseApi = new BaseApi();
    baseApi.setConnection({ api } as never);

    const extrinsic = (baseApi as unknown as BaseApiWithPrivateFeeFactory).getEmptyExtrinsic(Operation.BurnWithRemark);

    expect(extrinsic).toBe(batchTx);
    expect(api.tx.assets.burn).toHaveBeenCalledWith('', 0);
    expect(api.tx.utility.batchAll).toHaveBeenCalledWith([burnTx, remarkTx]);

    const [remarkPayload] = api.tx.system.remark.mock.calls[0] ?? [];
    expect(typeof remarkPayload).toBe('string');
    expect(remarkPayload).toMatch(/^0x[0-9a-f]+$/);
    expect((remarkPayload.length - 2) / 2).toBe(439);
  });
});
