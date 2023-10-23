import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import store from '../store';

export interface X1Widget {
  sdkUrl: string;
  widgetId: string;
}

export class X1Api {
  public static getWidget(soraNetwork: string): X1Widget {
    if (soraNetwork === WALLET_CONSTS.SoraNetwork.Prod) {
      return { sdkUrl: 'https://x1ex.com/widgets/sdk.js', widgetId: store.getters.settings.x1ApiKey };
    }
    return { sdkUrl: 'https://dev.x1ex.com/widgets/sdk.js', widgetId: store.getters.settings.x1ApiKey };
  }
}
