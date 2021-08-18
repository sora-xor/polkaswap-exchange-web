import axios from '@/api'

import { NetworkTypes } from '@/consts'

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

  public createWidgetUrl (queryParams): string {
    const baseUrl = MoonpayApi.getWidgetBaseUrl(this.soraNetwork)
    const params = {
      ...this.requiredParams,
      ...queryParams
    }
    const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`).join('&')
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
