import SButton from '@soramitsu/soramitsu-js-ui/lib/components/Button/SButton';
import SCard from '@soramitsu/soramitsu-js-ui/lib/components/Card/SCard';
import SCheckbox from '@soramitsu/soramitsu-js-ui/lib/components/Checkbox';
import SCollapse from '@soramitsu/soramitsu-js-ui/lib/components/Collapse/SCollapse';
import SCollapseItem from '@soramitsu/soramitsu-js-ui/lib/components/Collapse/SCollapseItem';
import SDatePicker from '@soramitsu/soramitsu-js-ui/lib/components/DatePicker/SDatePicker';
import SDesignSystemProvider from '@soramitsu/soramitsu-js-ui/lib/components/DesignSystem/SDesignSystemProvider';
import SDialog from '@soramitsu/soramitsu-js-ui/lib/components/Dialog';
import SDivider from '@soramitsu/soramitsu-js-ui/lib/components/Divider/SDivider';
import SDropdown from '@soramitsu/soramitsu-js-ui/lib/components/Dropdown/SDropdown';
import SDropdownItem from '@soramitsu/soramitsu-js-ui/lib/components/Dropdown/SDropdownItem';
import SForm from '@soramitsu/soramitsu-js-ui/lib/components/Form/SForm';
import SFormItem from '@soramitsu/soramitsu-js-ui/lib/components/Form/SFormItem';
import SIcon from '@soramitsu/soramitsu-js-ui/lib/components/Icon/SIcon';
import SImage from '@soramitsu/soramitsu-js-ui/lib/components/Image/SImage';
import SFloatInput from '@soramitsu/soramitsu-js-ui/lib/components/Input/SFloatInput';
import SInput from '@soramitsu/soramitsu-js-ui/lib/components/Input/SInput';
import SCol from '@soramitsu/soramitsu-js-ui/lib/components/Layout/Col';
import SRow from '@soramitsu/soramitsu-js-ui/lib/components/Layout/Row';
import SMenu from '@soramitsu/soramitsu-js-ui/lib/components/Menu/SMenu';
import SMenuItem from '@soramitsu/soramitsu-js-ui/lib/components/Menu/SMenuItem';
import SMenuItemGroup from '@soramitsu/soramitsu-js-ui/lib/components/Menu/SMenuItemGroup';
import SPagination from '@soramitsu/soramitsu-js-ui/lib/components/Pagination';
import SRadio from '@soramitsu/soramitsu-js-ui/lib/components/Radio/SRadio';
import SRadioGroup from '@soramitsu/soramitsu-js-ui/lib/components/Radio/SRadioGroup';
import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';
// TODO: check why it doesn't install
// import SSkeleton from '@soramitsu/soramitsu-js-ui/lib/components/Skeleton/SSkeleton';
// import SSkeletonItem from '@soramitsu/soramitsu-js-ui/lib/components/Skeleton/SSkeletonItem';
import SSlider from '@soramitsu/soramitsu-js-ui/lib/components/Slider';
import SSwitch from '@soramitsu/soramitsu-js-ui/lib/components/Switch';
import STab from '@soramitsu/soramitsu-js-ui/lib/components/Tab/STab';
import STabs from '@soramitsu/soramitsu-js-ui/lib/components/Tab/STabs';
import STable from '@soramitsu/soramitsu-js-ui/lib/components/Table/STable';
import STableColumn from '@soramitsu/soramitsu-js-ui/lib/components/Table/STableColumn';
import STooltip from '@soramitsu/soramitsu-js-ui/lib/components/Tooltip';
import ElementUIPlugin, { Message, MessageBox, Notification } from '@soramitsu/soramitsu-js-ui/lib/plugins/elementUI';
import SoramitsuUIStorePlugin from '@soramitsu/soramitsu-js-ui/lib/plugins/soramitsuUIStore';
import DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';
import { setDesignSystem, setTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import ElCheckbox from 'element-ui/lib/checkbox';
import ElCheckboxGroup from 'element-ui/lib/checkbox-group';
import ElPopover from 'element-ui/lib/popover';
import Vue from 'vue';

import store from '@/store';

Vue.use(ElementUIPlugin);
Vue.use(SoramitsuUIStorePlugin, { store: store.original });
Vue.use(ElPopover);
Vue.use(ElCheckbox);
Vue.use(ElCheckboxGroup);
Vue.use(SButton);
Vue.use(SCard);
Vue.use(SCheckbox);
Vue.use(SCol);
Vue.use(SCollapse);
Vue.use(SCollapseItem);
Vue.use(SDatePicker);
Vue.use(SDesignSystemProvider);
Vue.use(SDialog);
Vue.use(SDivider);
Vue.use(SDropdown);
Vue.use(SDropdownItem);
Vue.use(SFloatInput);
Vue.use(SForm);
Vue.use(SFormItem);
Vue.use(SIcon);
Vue.use(SImage);
Vue.use(SInput);
Vue.use(SMenu);
Vue.use(SMenuItem);
Vue.use(SMenuItemGroup);
Vue.use(SPagination);
Vue.use(SRadio);
Vue.use(SRadioGroup);
Vue.use(SRow);
Vue.use(SScrollbar);
// Vue.use(SSkeleton);
// Vue.use(SSkeletonItem);
Vue.use(SSlider);
Vue.use(SSwitch);
Vue.use(STab);
Vue.use(STabs);
Vue.use(STable);
Vue.use(STableColumn);
Vue.use(STooltip);
Vue.prototype.$prompt = MessageBox.prompt;
Vue.prototype.$alert = MessageBox.alert;
Vue.prototype.$message = Message;
Vue.prototype.$notify = ({ message, type }) => {
  Notification({
    message,
    title: '',
    duration: 4500, // If is will be changed you should change animation duration as well
    type,
    customClass: 'sora s-flex',
  });
  const elements = Array.from(document.getElementsByClassName('el-notification'));
  const current = elements[elements.length - 1];
  const appContent = document.getElementsByClassName('app-main').item(0) as Element;
  appContent.appendChild(current);
  const el = document.createElement('div');
  el.className = 'loader';
  current.appendChild(el);
};

setTheme();
setDesignSystem(DesignSystem.NEUMORPHIC);
