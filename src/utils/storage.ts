import { Storage } from '@sora-substrate/util'
import { storage as soraStorage } from '@soramitsu/soraneo-wallet-web'

export const settingsStorage = new Storage('settings')

export default soraStorage
