import axios from '@/api'

import { NetworkTypes } from '@/consts'
import { toQueryString } from '@/utils'

export interface MoonpayEVMTransferAssetData {
  amount: string;
  address: string; // asset address
  to: string; // evm address of recipient
}

export class MoonpayApi {
  public static apiUrl = 'https://api.moonpay.com'
  public publicKey = ''
  public soraNetwork = ''

  public static getWidgetBaseUrl (soraNetwork: string): string {
    if (soraNetwork === NetworkTypes.Mainnet) {
      return 'https://buy.moonpay.com'
    }
    return 'https://buy-staging.moonpay.com'
  }

  get requiredParams () {
    return {
      apiKey: this.publicKey
    }
  }

  public createWidgetUrl (queryParams, widgetUrl?: string): string {
    const baseUrl = widgetUrl || MoonpayApi.getWidgetBaseUrl(this.soraNetwork)
    const params = {
      ...this.requiredParams,
      ...queryParams
    }
    const query = toQueryString(params)
    const url = `${baseUrl}?${query}`

    return url
  }

  public setPublicKey (publicKey: string) {
    this.publicKey = publicKey
  }

  public setNetwork (soraNetwork: string) {
    this.soraNetwork = soraNetwork
  }

  public getTransactionById (id: string): Promise<any> {
    const url = `${MoonpayApi.apiUrl}/v1/transactions/${id}`
    return this.apiRequest(url)
  }

  public getTransactionsByExtId (id: string): Promise<any> {
    const url = `${MoonpayApi.apiUrl}/v1/transactions/ext/${id}`
    return this.apiRequest(url)
  }

  public getCurrencies (): Promise<any> {
    const url = `${MoonpayApi.apiUrl}/v3/currencies`
    return this.apiRequest(url)
  }

  private async apiRequest (url: string, params = {}) {
    const options = {
      params: {
        ...this.requiredParams,
        ...params
      }
    }

    const { data } = await axios.get(url, options)

    return data
  }
}
