import axios from '@/api';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { toQueryString } from '@/utils';

export interface MoonpayEVMTransferAssetData {
  amount: string;
  address: string; // asset address
  to: string; // evm address of recipient
}

export enum MoonpayTransactionStatus {
  Completed = 'completed',
  Failed = 'failed',
}

export interface MoonpayTransaction {
  id: string;
  cryptoTransactionId: string;
  createdAt: string;
  updatedAt: string;
  baseCurrencyId: string;
  baseCurrencyAmount: number;
  currencyId: string;
  quoteCurrencyAmount: number;
  status: MoonpayTransactionStatus;
}

export interface MoonpayCurrency {
  id: string;
  code: string;
}

export type MoonpayCurrenciesById = {
  [key: string]: MoonpayCurrency;
};

export class MoonpayApi {
  public static apiUrl = 'https://api.moonpay.com';
  public publicKey = '';
  public soraNetwork = '';

  public static getWidgetBaseUrl(soraNetwork: string): string {
    if (soraNetwork === WALLET_CONSTS.SoraNetwork.Prod) {
      return 'https://buy.moonpay.com';
    }
    return 'https://buy-staging.moonpay.com';
  }

  get requiredParams() {
    return {
      apiKey: this.publicKey,
    };
  }

  get accountRecords(): Record<string, string> {
    const records = api.accountStorage?.get('moonpay');

    return records ? JSON.parse(records) : {};
  }

  set accountRecords(records: Record<string, string>) {
    api.accountStorage?.set('moonpay', JSON.stringify(records));
  }

  public createWidgetUrl(queryParams, widgetUrl?: string): string {
    const baseUrl = widgetUrl || MoonpayApi.getWidgetBaseUrl(this.soraNetwork);
    const params = {
      ...this.requiredParams,
      ...queryParams,
    };
    const query = toQueryString(params);
    const url = `${baseUrl}?${query}`;

    return url;
  }

  public async getTransactionsByExtId(id: string): Promise<Array<MoonpayTransaction>> {
    try {
      const url = `${MoonpayApi.apiUrl}/v1/transactions/ext/${id}`;
      const transactions = await this.apiRequest(url);

      return transactions;
    } catch (error) {
      return [];
    }
  }

  public async getCurrencies(): Promise<Array<MoonpayCurrency>> {
    try {
      const url = `${MoonpayApi.apiUrl}/v3/currencies`;
      const currencies = await this.apiRequest(url);

      return currencies;
    } catch (error) {
      return [];
    }
  }

  private async apiRequest(url: string, params = {}): Promise<any> {
    const options = {
      params: {
        ...this.requiredParams,
        ...params,
      },
    };

    const { data } = await axios.get(url, options);

    return data;
  }
}
