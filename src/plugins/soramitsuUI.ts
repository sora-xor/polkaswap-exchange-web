import Vue from 'vue'
import { DesignSystemTypes } from '@soramitsu/soramitsu-js-ui/src/utils/DesignSystem'
import { setDesignSystem } from '@soramitsu/soramitsu-js-ui/src/utils'

import ElementUIPlugin, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui/src/plugins/elementUI'
import SoramitsuUIStorePlugin from '@soramitsu/soramitsu-js-ui/src/plugins/soramitsuUIStore'

import SButton from '@soramitsu/soramitsu-js-ui/src/components/Button/SButton'
import SCard from '@soramitsu/soramitsu-js-ui/src/components/Card/SCard'
import SCheckbox from '@soramitsu/soramitsu-js-ui/src/components/Checkbox'
import SCol from '@soramitsu/soramitsu-js-ui/src/components/Layout/Col'
import SCollapse from '@soramitsu/soramitsu-js-ui/src/components/Collapse/SCollapse'
import SCollapseItem from '@soramitsu/soramitsu-js-ui/src/components/Collapse/SCollapseItem'
import SDesignSystemProvider from '@soramitsu/soramitsu-js-ui/src/components/DesignSystem/SDesignSystemProvider'
import SDialog from '@soramitsu/soramitsu-js-ui/src/components/Dialog'
import SDivider from '@soramitsu/soramitsu-js-ui/src/components/Divider/SDivider'
import SDropdown from '@soramitsu/soramitsu-js-ui/src/components/Dropdown/SDropdown'
import SDropdownItem from '@soramitsu/soramitsu-js-ui/src/components/Dropdown/SDropdownItem'
import SFloatInput from '@soramitsu/soramitsu-js-ui/src/components/Input/SFloatInput'
import SForm from '@soramitsu/soramitsu-js-ui/src/components/Form/SForm'
import SFormItem from '@soramitsu/soramitsu-js-ui/src/components/Form/SFormItem'
import SIcon from '@soramitsu/soramitsu-js-ui/src/components/Icon/SIcon'
import SInput from '@soramitsu/soramitsu-js-ui/src/components/Input/SInput'
import SMenu from '@soramitsu/soramitsu-js-ui/src/components/Menu/SMenu'
import SMenuItem from '@soramitsu/soramitsu-js-ui/src/components/Menu/SMenuItem'
import SMenuItemGroup from '@soramitsu/soramitsu-js-ui/src/components/Menu/SMenuItemGroup'
import SPagination from '@soramitsu/soramitsu-js-ui/src/components/Pagination'
import SRadio from '@soramitsu/soramitsu-js-ui/src/components/Radio/SRadio'
import SRadioGroup from '@soramitsu/soramitsu-js-ui/src/components/Radio/SRadioGroup'
import SRow from '@soramitsu/soramitsu-js-ui/src/components/Layout/Row'
import SSlider from '@soramitsu/soramitsu-js-ui/src/components/Slider'
import SSwitch from '@soramitsu/soramitsu-js-ui/src/components/Switch'
import STab from '@soramitsu/soramitsu-js-ui/src/components/Tab/STab'
import STabs from '@soramitsu/soramitsu-js-ui/src/components/Tab/STabs'
import STable from '@soramitsu/soramitsu-js-ui/src/components/Table/STable'
import STableColumn from '@soramitsu/soramitsu-js-ui/src/components/Table/STableColumn'
import STooltip from '@soramitsu/soramitsu-js-ui/src/components/Tooltip'

import store from '@/store'

Vue.use(ElementUIPlugin)
Vue.use(SoramitsuUIStorePlugin, { store })
Vue.use(SButton)
Vue.use(SCard)
Vue.use(SCheckbox)
Vue.use(SCol)
Vue.use(SCollapse)
Vue.use(SCollapseItem)
Vue.use(SDesignSystemProvider)
Vue.use(SDialog)
Vue.use(SDivider)
Vue.use(SDropdown)
Vue.use(SDropdownItem)
Vue.use(SFloatInput)
Vue.use(SForm)
Vue.use(SFormItem)
Vue.use(SIcon)
Vue.use(SInput)
Vue.use(SMenu)
Vue.use(SMenuItem)
Vue.use(SMenuItemGroup)
Vue.use(SPagination)
Vue.use(SRadio)
Vue.use(SRadioGroup)
Vue.use(SRow)
Vue.use(SSlider)
Vue.use(SSwitch)
Vue.use(STab)
Vue.use(STabs)
Vue.use(STable)
Vue.use(STableColumn)
Vue.use(STooltip)
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

setDesignSystem(DesignSystemTypes.NEUMORPHIC)
