import Vue from 'vue'
import SoramitsuElements, { Message, MessageBox, Notification, setTheme, setDesignSystem } from '@soramitsu/soramitsu-js-ui'
import '@soramitsu/soramitsu-js-ui/lib/styles'

import store from '@/store'

setDesignSystem('neumorphic')

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
  const elements = Array.from(document.getElementsByClassName('el-notification'))
  const current = elements[elements.length - 1]
  const appContent = document.getElementsByClassName('app-main').item(0) as Element
  appContent.appendChild(current)
  const el = document.createElement('div')
  el.className = 'loader'
  current.appendChild(el)
}
