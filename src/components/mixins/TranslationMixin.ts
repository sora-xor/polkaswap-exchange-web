import { mixins as walletMixins } from '@wallet';
import { Options, mixins as vueMixins } from 'vue-property-decorator';

import { TranslationConsts } from '@/consts';
import store from '@/store';

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

@Options({})
export default class TranslationMixin extends vueMixins(walletMixins.TranslationMixin) {
  get language(): string {
    return (
      (store.state?.settings as Record<string, any> | undefined)?.language ??
      (store.getters?.settings as Record<string, any> | undefined)?.language ??
      'en'
    );
  }

  readonly TranslationConsts = TranslationConsts;

  tOrdinal(n) {
    const locale = this.$i18n?.locale ?? this.language;
    const formatter = OrdinalRules[locale as keyof typeof OrdinalRules];
    return formatter ? formatter(n) : n;
  }
}
