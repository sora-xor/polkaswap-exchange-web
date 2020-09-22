import Vue from 'vue'
import SoramitsuElements, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui'
import '@soramitsu/soramitsu-js-ui/lib/styles'

Vue.use(SoramitsuElements)
Vue.prototype.$prompt = MessageBox.prompt
Vue.prototype.$alert = MessageBox.alert
Vue.prototype.$message = Message
Vue.prototype.$notify = Notification
