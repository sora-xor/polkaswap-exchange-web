import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { getter, mutation } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SwapQuoteData } from '@sora-substrate/util/build/swap/types';
import type { Subscription } from 'rxjs';

@Component
export default class SwapQuoteMixin extends Mixins(mixins.LoadingMixin) {
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @mutation.swap.setSubscriptionPayload private setSubscriptionPayload!: (payload: SwapQuoteData) => void;

  quoteSubscription: Nullable<Subscription> = null;

  get areTokensSelected(): boolean {
    return !!(this.tokenFrom && this.tokenTo);
  }

  public async subscribeOnQuote(func: any, liquiditySources: LiquiditySourceTypes[] = []): Promise<void> {
    this.resetQuoteSubscription();

    if (!this.areTokensSelected) return;

    this.loading = true;

    const observableQuote = await api.swap.getDexesSwapQuoteObservable(
      (this.tokenFrom as AccountAsset).address,
      (this.tokenTo as AccountAsset).address,
      liquiditySources
    );

    this.quoteSubscription = observableQuote.subscribe((quoteData) => {
      this.setSubscriptionPayload(quoteData);
      func();
      this.loading = false;
    });
  }

  public resetQuoteSubscription(): void {
    this.quoteSubscription?.unsubscribe();
    this.quoteSubscription = null;
  }
}
