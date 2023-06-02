import { Component, Mixins } from 'vue-property-decorator';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { PoolApyObject } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

import { state } from '@/store/decorators';

@Component
export default class PoolApyMixin extends Mixins() {
  @state.pool.poolApyObject poolApyObject!: PoolApyObject;

  getPoolApy(baseAssetAddress: Nullable<string>, targetAssetAddress: Nullable<string>): Nullable<string> {
    if (!(baseAssetAddress && targetAssetAddress)) return null;
    const poolInfo = api.poolXyk.getInfo(baseAssetAddress, targetAssetAddress);
    if (!poolInfo?.address) return null;
    return this.poolApyObject[poolInfo.address] ?? null;
  }
}
