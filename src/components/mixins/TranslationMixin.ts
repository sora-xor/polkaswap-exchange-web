import { Component, Mixins } from 'vue-property-decorator';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { state } from '@/store/decorators';
import { app } from '@/consts';

const OrdinalRules = {
  en: (v) => {
    const n = +v;

    if (!Number.isFinite(n) || n === 0) return v;

    const remainder = n % 10;

    if (remainder === 1) return `${n}st`;
    if (remainder === 2) return `${n}nd`;
    if (remainder === 3) return `${n}rd`;

    return `${n}th`;
  },
};

const TranslationConsts = {
  ...WALLET_CONSTS.TranslationConsts,
  // extending consts
  AppName: app.name,
  TVL: 'TVL',
  EVM: 'EVM',
};

@Component
export default class TranslationMixin extends Mixins(mixins.TranslationMixin) {
  @state.settings.language language!: string;

  readonly TranslationConsts = TranslationConsts;

  tOrdinal(n) {
    return OrdinalRules[this.$i18n.locale]?.(n) ?? n;
  }
}
