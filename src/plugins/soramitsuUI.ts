import Vue from 'vue'
import SoramitsuElements, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui'
import '@soramitsu/soramitsu-js-ui/lib/styles'
import store from '@/store'

Vue.use(SoramitsuElements, { store })
Vue.prototype.$prompt = MessageBox.prompt
Vue.prototype.$alert = MessageBox.alert
Vue.prototype.$message = Message
Vue.prototype.$notify = ({ message, type }) => {
  Notification({
    message,
    title: '',
    duration: 4500, // If is will be changed you should change animation duration as well
    type,
    customClass: 'sora s-flex'
  })
  const el = document.createElement('div')
  el.className = 'loader'
  const elements = Array.from(document.getElementsByClassName('el-notification'))
  elements[elements.length - 1].appendChild(el)
}
