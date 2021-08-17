import axios from '@/api'

import { NetworkTypes } from '@/consts'

export class MoonpayApi {
  public static apiUrl = 'https://api.moonpay.com'
  public publicKey: string

  public static getWidgetUrl (soraNetwork: string): string {
    if (soraNetwork === NetworkTypes.Mainnet) {
      return 'https://buy.moonpay.com'
    }
    return 'https://buy-staging.moonpay.com'
  }

  constructor (publicKey: string) {
    this.publicKey = publicKey
  }

  public async getTransaction (id: string): Promise<any> {
    const url = `${MoonpayApi.apiUrl}/v1/transactions/${id}`
    const data = await this.apiRequest(url)

    return data
  }

  private async apiRequest (url: string) {
    try {
      const { data } = await axios.get(url, {
        params: {
          apiKey: this.publicKey
        }
      })

      return data
    } catch (error) {
      console.error(error)
      return null
    }
  }
}
