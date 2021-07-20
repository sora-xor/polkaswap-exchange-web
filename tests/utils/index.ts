import { VueConstructor } from 'vue'
import Vuex from 'vuex'
import SoramitsuElements, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui'
import SoraNeoWalletElements from '@soramitsu/soraneo-wallet-web'

export const TranslationMock = (vue: VueConstructor) =>
  vue.mixin({ name: 'TranslationMixin', methods: { t: jest.fn(), tc: jest.fn() } })

export const SoramitsuElementsImport = (vue: VueConstructor): void => {
  vue.use(Vuex)
  const store = new Vuex.Store({ modules: {} })
  vue.use(SoramitsuElements, { store })
  vue.prototype.$prompt = MessageBox.prompt
  vue.prototype.$alert = MessageBox.alert
  vue.prototype.$message = Message
  vue.prototype.$notify = Notification
}

export const WalletImport = (vue: VueConstructor): void => {
  vue.use(Vuex)
  const store = new Vuex.Store({ modules: {} })
  vue.use(SoraNeoWalletElements, { store })
}
