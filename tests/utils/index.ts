import { VueConstructor } from 'vue'
import Vuex from 'vuex'
import SoramitsuElements, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui'
import Wallet from '@soramitsu/soraneo-wallet-web'

export const TranslationMock = (vue: VueConstructor) =>
  vue.mixin({ name: 'TranslationMixin', methods: { t: jest.fn(), tc: jest.fn() } })

export const SoramitsuElementsImport = (vue: VueConstructor) => {
  vue.use(SoramitsuElements)
  vue.prototype.$prompt = MessageBox.prompt
  vue.prototype.$alert = MessageBox.alert
  vue.prototype.$message = Message
  vue.prototype.$notify = Notification
}

export const WalletImport = (vue: VueConstructor) => {
  vue.use(Vuex)
  const store = new Vuex.Store({ modules: {} })
  vue.use(Wallet, { store })
}
