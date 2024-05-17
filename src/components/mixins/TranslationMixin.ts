import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { TranslationConsts } from '@/consts';
import { state } from '@/store/decorators';

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
} as const;

@Component
export default class TranslationMixin extends Mixins(mixins.TranslationMixin) {
  @state.settings.language language!: string;

  readonly TranslationConsts = TranslationConsts;

  tOrdinal(n) {
    return OrdinalRules[this.$i18n.locale]?.(n) ?? n;
  }
}
