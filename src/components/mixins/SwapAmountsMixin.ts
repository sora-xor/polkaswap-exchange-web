import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, mutation, state } from '@/store/decorators';
import { asZeroValue } from '@/utils';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component
export default class SwapAmountsMixin extends Mixins(TranslationMixin) {
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;

  @action.swap.setTokenFromAddress setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress setTokenToAddress!: (address?: string) => Promise<void>;

  @mutation.swap.setFromValue setFromValue!: (value: string) => void;
  @mutation.swap.setToValue setToValue!: (value: string) => void;

  get areTokensSelected(): boolean {
    return !!(this.tokenFrom && this.tokenTo);
  }

  get isZeroFromAmount(): boolean {
    return asZeroValue(this.fromValue);
  }

  get isZeroToAmount(): boolean {
    return asZeroValue(this.toValue);
  }

  get hasZeroAmount(): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount;
  }

  get areZeroAmounts(): boolean {
    return this.isZeroFromAmount && this.isZeroToAmount;
  }
}
