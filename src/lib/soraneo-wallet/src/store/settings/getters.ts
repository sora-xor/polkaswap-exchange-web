import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { defineGetters } from '@/store/module-helpers';

import type { LibraryDesignSystem } from '@/types/common';
import { Currency } from '@/types/currency';
import { getCurrency } from '@/util';

import { DaiCurrency } from '../../consts/currencies';
import { settingsGetterContext } from './../settings';
import { normalizeTheme } from './theme';

import type { SettingsState } from './types';

const getters = defineGetters<SettingsState>()({
  currencySymbol(...args): string {
    const { state } = settingsGetterContext(args);

    return getCurrency(state.currency)?.symbol ?? DaiCurrency.symbol;
  },

  exchangeRate(...args): number {
    const { state } = settingsGetterContext(args);

    if (state.currency === Currency.XOR) {
      const [, , rootState] = args as [SettingsState, unknown, any, any];
      const xorPriceCodec = rootState.wallet.account.fiatPriceObject[XOR.address];
      const xorPrice = FPNumber.fromCodecValue(xorPriceCodec);
      if (xorPrice.isGtZero()) {
        return FPNumber.ONE.div(xorPrice).toNumber();
      }
      return 1;
    }

    return state.fiatExchangeRateObject[state.currency] ?? 1;
  },

  libraryTheme(...args) {
    const { state } = settingsGetterContext(args);

    return normalizeTheme(state.theme);
  },

  libraryDesignSystem(...args): LibraryDesignSystem {
    const { state } = settingsGetterContext(args);
    const theme = normalizeTheme(state.theme);

    return {
      theme,
    };
  },
});

export default getters;
