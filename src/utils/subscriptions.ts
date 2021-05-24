import { api } from '@soramitsu/soraneo-wallet-web'

export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, any>

  constructor () {
    this.subscriptions = new Map()
  }

  add (key: string, { updateBalance, token }) {
    const subscription = api.getAssetBalanceObservable(token).subscribe(balance => updateBalance(balance))
    this.subscriptions.set(key, subscription)
  }

  remove (key: string, { updateBalance }) {
    if (this.subscriptions.has(key)) {
      const subscription = this.subscriptions.get(key)
      subscription.unsubscribe()
      this.subscriptions.delete(key)
      updateBalance(null)
    }
  }
}
