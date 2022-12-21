import { Component, Mixins } from 'vue-property-decorator';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { PoolApyObject } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import { state } from '@/store/decorators';

@Component
export default class PoolApyMixin extends Mixins() {
  @state.pool.poolApyObject poolApyObject!: PoolApyObject;

  getPoolApy(baseAssetAddress: string, targetAssetAddress: string): Nullable<string> {
    const poolInfo = api.poolXyk.getInfo(baseAssetAddress, targetAssetAddress);
    if (!poolInfo?.address) return null;
    return this.poolApyObject[poolInfo.address] ?? null;
  }
}
