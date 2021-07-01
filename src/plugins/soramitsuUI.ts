import Vue from 'vue'
import SoramitsuElements, {
  setDesignSystem,
  DesignSystemTypes,
  Components,
  Message,
  MessageBox,
  Notification
} from '@soramitsu/soramitsu-js-ui'

import store from '@/store'

const components = [
  Components.SButton,
  Components.SCard,
  Components.SCol,
  Components.SCollapse,
  Components.SCollapseItem,
  Components.SDesignSystemProvider,
  Components.SDialog,
  Components.SDivider,
  Components.SDropdown,
  Components.SDropdownItem,
  Components.SFloatInput,
  Components.SForm,
  Components.SFormItem,
  Components.SIcon,
  Components.SInput,
  Components.SMenu,
  Components.SMenuItem,
  Components.SMenuItemGroup,
  Components.SPagination,
  Components.SRadio,
  Components.SRadioGroup,
  Components.SRow,
  Components.SSwitch,
  Components.SSlider,
  Components.STab,
  Components.STabs,
  Components.STooltip
]

const directives = []

setDesignSystem(DesignSystemTypes.NEUMORPHIC)

Vue.use(SoramitsuElements, { store, components, directives })
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
