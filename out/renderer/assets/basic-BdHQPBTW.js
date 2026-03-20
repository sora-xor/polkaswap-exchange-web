import { n as css, r as resetStyles, o as elementStyles, q as i, x, t as i$1, G as AssetUtil, b as EventsController, R as RouterController, U as ApiController, O as OptionsController, aj as WalletUtil, l as ConnectorController, c as CoreHelperUtil, S as SnackController, m as ConnectionController, C as ConstantsUtil, a1 as AssetController, ah as ConnectorUtil, ac as HelpersUtil, a as ChainController, T as ThemeController, M as ModalController, a2 as AppKitError, a3 as ErrorUtil, ai as ConnectionControllerUtil, h as ConstantsUtil$1, bR as CaipNetworksUtil, I as StorageUtil } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r, U as UiHelperUtil } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-lAjfmR0R.js";
import "./index-Bag94m_F.js";
import "./index-Cm7UDlkl.js";
import "./index-Bz3_ZVag.js";
import "./index-DgvHPQm2.js";
import { n as networkSvgMd } from "./index-Cztg-IpD.js";
import "./index-Bga-Wh90.js";
import "./index-xvpTmtDJ.js";
import "./index-BH8iPnnC.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
import "./index-Oesj6-8K.js";
import "./index-DAKl5XGv.js";
import "./index-B80WMNJI.js";
const styles$f = css`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[2]};
    column-gap: ${({ spacing }) => spacing[1]};
    color: ${({ tokens }) => tokens.theme.textSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[20]};
    background-color: transparent;
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({ tokens }) => tokens.theme.textPrimary};
    background-color: ${({ tokens }) => tokens.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({ tokens }) => tokens.theme.textPrimary};
    }
  }
`;
var __decorate$p = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const TEXT_VARIANT_BY_SIZE = {
  lg: "lg-regular",
  md: "md-regular",
  sm: "sm-regular"
};
const ICON_SIZE = {
  lg: "md",
  md: "sm",
  sm: "sm"
};
let WuiTab = class WuiTab2 extends i {
  constructor() {
    super(...arguments);
    this.icon = "mobile";
    this.size = "md";
    this.label = "";
    this.active = false;
  }
  render() {
    return x`
      <button data-active=${this.active}>
        ${this.icon ? x`<wui-icon size=${ICON_SIZE[this.size]} name=${this.icon}></wui-icon>` : ""}
        <wui-text variant=${TEXT_VARIANT_BY_SIZE[this.size]}> ${this.label} </wui-text>
      </button>
    `;
  }
};
WuiTab.styles = [resetStyles, elementStyles, styles$f];
__decorate$p([
  n()
], WuiTab.prototype, "icon", void 0);
__decorate$p([
  n()
], WuiTab.prototype, "size", void 0);
__decorate$p([
  n()
], WuiTab.prototype, "label", void 0);
__decorate$p([
  n({ type: Boolean })
], WuiTab.prototype, "active", void 0);
WuiTab = __decorate$p([
  customElement("wui-tab-item")
], WuiTab);
const styles$e = css`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[32]};
    padding: ${({ spacing }) => spacing["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;
var __decorate$o = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTabs = class WuiTabs2 extends i {
  constructor() {
    super(...arguments);
    this.tabs = [];
    this.onTabChange = () => null;
    this.size = "md";
    this.activeTab = 0;
  }
  render() {
    this.dataset["size"] = this.size;
    return this.tabs.map((tab, index) => {
      const isActive = index === this.activeTab;
      return x`
        <wui-tab-item
          @click=${() => this.onTabClick(index)}
          icon=${tab.icon}
          size=${this.size}
          label=${tab.label}
          ?active=${isActive}
          data-active=${isActive}
          data-testid="tab-${tab.label?.toLowerCase()}"
        ></wui-tab-item>
      `;
    });
  }
  onTabClick(index) {
    this.activeTab = index;
    this.onTabChange(index);
  }
};
WuiTabs.styles = [resetStyles, elementStyles, styles$e];
__decorate$o([
  n({ type: Array })
], WuiTabs.prototype, "tabs", void 0);
__decorate$o([
  n()
], WuiTabs.prototype, "onTabChange", void 0);
__decorate$o([
  n()
], WuiTabs.prototype, "size", void 0);
__decorate$o([
  r()
], WuiTabs.prototype, "activeTab", void 0);
WuiTabs = __decorate$o([
  customElement("wui-tabs")
], WuiTabs);
const styles$d = css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      color ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      border ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      box-shadow ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      width ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      height ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      transform ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ colors }) => colors.neutrals300};
    border-radius: ${({ borderRadius }) => borderRadius.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      color ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      border ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      box-shadow ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      width ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      height ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      transform ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({ colors }) => colors.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({ tokens }) => tokens.core.iconAccentPrimary};
    background-color: ${({ tokens }) => tokens.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({ tokens }) => tokens.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({ tokens }) => tokens.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({ colors }) => colors.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({ colors }) => colors.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({ colors }) => colors.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({ colors }) => colors.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({ colors }) => colors.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({ tokens }) => tokens.theme.textTertiary};
  }
`;
var __decorate$n = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiToggle = class WuiToggle2 extends i {
  constructor() {
    super(...arguments);
    this.inputElementRef = e();
    this.checked = false;
    this.disabled = false;
    this.size = "md";
  }
  render() {
    return x`
      <label data-size=${this.size}>
        <input
          ${n$1(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `;
  }
  dispatchChangeEvent() {
    this.dispatchEvent(new CustomEvent("switchChange", {
      detail: this.inputElementRef.value?.checked,
      bubbles: true,
      composed: true
    }));
  }
};
WuiToggle.styles = [resetStyles, elementStyles, styles$d];
__decorate$n([
  n({ type: Boolean })
], WuiToggle.prototype, "checked", void 0);
__decorate$n([
  n({ type: Boolean })
], WuiToggle.prototype, "disabled", void 0);
__decorate$n([
  n()
], WuiToggle.prototype, "size", void 0);
WuiToggle = __decorate$n([
  customElement("wui-toggle")
], WuiToggle);
const styles$c = css`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({ spacing }) => spacing["2"]};
    padding: ${({ spacing }) => spacing["2"]} ${({ spacing }) => spacing["3"]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;
var __decorate$m = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiCertifiedSwitch = class WuiCertifiedSwitch2 extends i {
  constructor() {
    super(...arguments);
    this.checked = false;
  }
  render() {
    return x`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `;
  }
  handleToggleChange(event) {
    event.stopPropagation();
    this.checked = event.detail;
    this.dispatchSwitchEvent();
  }
  dispatchSwitchEvent() {
    this.dispatchEvent(new CustomEvent("certifiedSwitchChange", {
      detail: this.checked,
      bubbles: true,
      composed: true
    }));
  }
};
WuiCertifiedSwitch.styles = [resetStyles, elementStyles, styles$c];
__decorate$m([
  n({ type: Boolean })
], WuiCertifiedSwitch.prototype, "checked", void 0);
WuiCertifiedSwitch = __decorate$m([
  customElement("wui-certified-switch")
], WuiCertifiedSwitch);
const styles$b = css`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({ spacing }) => spacing[3]};
    color: ${({ tokens }) => tokens.theme.iconDefault};
    cursor: pointer;
    padding: ${({ spacing }) => spacing[2]};
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }
`;
var __decorate$l = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiSearchBar = class WuiSearchBar2 extends i {
  constructor() {
    super(...arguments);
    this.inputComponentRef = e();
    this.inputValue = "";
  }
  render() {
    return x`
      <wui-input-text
        ${n$1(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue ? x`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>` : null}
      </wui-input-text>
    `;
  }
  onInputChange(event) {
    this.inputValue = event.detail || "";
  }
  clearValue() {
    const component = this.inputComponentRef.value;
    const inputElement = component?.inputElementRef.value;
    if (inputElement) {
      inputElement.value = "";
      this.inputValue = "";
      inputElement.focus();
      inputElement.dispatchEvent(new Event("input"));
    }
  }
};
WuiSearchBar.styles = [resetStyles, styles$b];
__decorate$l([
  n()
], WuiSearchBar.prototype, "inputValue", void 0);
WuiSearchBar = __decorate$l([
  customElement("wui-search-bar")
], WuiSearchBar);
const styles$a = css`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({ spacing }) => spacing[2]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({ tokens }) => tokens.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;
var __decorate$k = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiCardSelectLoader = class WuiCardSelectLoader2 extends i {
  constructor() {
    super(...arguments);
    this.type = "wallet";
  }
  render() {
    return x`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `;
  }
  shimmerTemplate() {
    if (this.type === "network") {
      return x` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${networkSvgMd}`;
    }
    return x`<wui-shimmer width="56px" height="56px"></wui-shimmer>`;
  }
};
WuiCardSelectLoader.styles = [resetStyles, elementStyles, styles$a];
__decorate$k([
  n()
], WuiCardSelectLoader.prototype, "type", void 0);
WuiCardSelectLoader = __decorate$k([
  customElement("wui-card-select-loader")
], WuiCardSelectLoader);
const styles$9 = i$1`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;
var __decorate$j = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiGrid = class WuiGrid2 extends i {
  render() {
    this.style.cssText = `
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap && `var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap && `var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap && `var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 0)};
      padding-right: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 1)};
      padding-bottom: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 2)};
      padding-left: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 3)};
      margin-top: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 0)};
      margin-right: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 1)};
      margin-bottom: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 2)};
      margin-left: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 3)};
    `;
    return x`<slot></slot>`;
  }
};
WuiGrid.styles = [resetStyles, styles$9];
__decorate$j([
  n()
], WuiGrid.prototype, "gridTemplateRows", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "gridTemplateColumns", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "justifyItems", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "alignItems", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "justifyContent", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "alignContent", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "columnGap", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "rowGap", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "gap", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "padding", void 0);
__decorate$j([
  n()
], WuiGrid.prototype, "margin", void 0);
WuiGrid = __decorate$j([
  customElement("wui-grid")
], WuiGrid);
const styles$8 = css`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({ spacing }) => spacing["2"]};
    padding: ${({ spacing }) => spacing["3"]} ${({ spacing }) => spacing["0"]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({ borderRadius }) => borderRadius["4"]}, 20px);
    transition:
      color ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-1"]},
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-1"]},
      border-radius ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({ tokens }) => tokens.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({ tokens }) => tokens.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({ colors }) => colors.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({ colors }) => colors.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({ colors }) => colors.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;
var __decorate$i = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAllWalletsListItem = class W3mAllWalletsListItem2 extends i {
  constructor() {
    super();
    this.observer = new IntersectionObserver(() => void 0);
    this.visible = false;
    this.imageSrc = void 0;
    this.imageLoading = false;
    this.isImpressed = false;
    this.explorerId = "";
    this.walletQuery = "";
    this.certified = false;
    this.displayIndex = 0;
    this.wallet = void 0;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.visible = true;
          this.fetchImageSrc();
          this.sendImpressionEvent();
        } else {
          this.visible = false;
        }
      });
    }, { threshold: 0.01 });
  }
  firstUpdated() {
    this.observer.observe(this);
  }
  disconnectedCallback() {
    this.observer.disconnect();
  }
  render() {
    const certified = this.wallet?.badge_type === "certified";
    return x`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${o(certified ? "certified" : void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${certified ? x`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>` : null}
        </wui-flex>
      </button>
    `;
  }
  imageTemplate() {
    if (!this.visible && !this.imageSrc || this.imageLoading) {
      return this.shimmerTemplate();
    }
    return x`
      <wui-wallet-image
        size="lg"
        imageSrc=${o(this.imageSrc)}
        name=${o(this.wallet?.name)}
        .installed=${this.wallet?.installed ?? false}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `;
  }
  shimmerTemplate() {
    return x`<wui-shimmer width="56px" height="56px"></wui-shimmer>`;
  }
  async fetchImageSrc() {
    if (!this.wallet) {
      return;
    }
    this.imageSrc = AssetUtil.getWalletImage(this.wallet);
    if (this.imageSrc) {
      return;
    }
    this.imageLoading = true;
    this.imageSrc = await AssetUtil.fetchWalletImage(this.wallet.image_id);
    this.imageLoading = false;
  }
  sendImpressionEvent() {
    if (!this.wallet || this.isImpressed) {
      return;
    }
    this.isImpressed = true;
    EventsController.sendWalletImpressionEvent({
      name: this.wallet.name,
      walletRank: this.wallet.order,
      explorerId: this.explorerId,
      view: RouterController.state.view,
      query: this.walletQuery,
      certified: this.certified,
      displayIndex: this.displayIndex
    });
  }
};
W3mAllWalletsListItem.styles = styles$8;
__decorate$i([
  r()
], W3mAllWalletsListItem.prototype, "visible", void 0);
__decorate$i([
  r()
], W3mAllWalletsListItem.prototype, "imageSrc", void 0);
__decorate$i([
  r()
], W3mAllWalletsListItem.prototype, "imageLoading", void 0);
__decorate$i([
  r()
], W3mAllWalletsListItem.prototype, "isImpressed", void 0);
__decorate$i([
  n()
], W3mAllWalletsListItem.prototype, "explorerId", void 0);
__decorate$i([
  n()
], W3mAllWalletsListItem.prototype, "walletQuery", void 0);
__decorate$i([
  n()
], W3mAllWalletsListItem.prototype, "certified", void 0);
__decorate$i([
  n()
], W3mAllWalletsListItem.prototype, "displayIndex", void 0);
__decorate$i([
  n({ type: Object })
], W3mAllWalletsListItem.prototype, "wallet", void 0);
W3mAllWalletsListItem = __decorate$i([
  customElement("w3m-all-wallets-list-item")
], W3mAllWalletsListItem);
const styles$7 = css`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({ durations }) => durations["xl"]};
    animation-timing-function: ${({ easings }) => easings["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({ spacing }) => spacing["4"]};
    padding-bottom: ${({ spacing }) => spacing["4"]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;
var __decorate$h = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const PAGINATOR_ID = "local-paginator";
let W3mAllWalletsList = class W3mAllWalletsList2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.paginationObserver = void 0;
    this.loading = !ApiController.state.wallets.length;
    this.wallets = ApiController.state.wallets;
    this.mobileFullScreen = OptionsController.state.enableMobileFullScreen;
    this.unsubscribe.push(...[ApiController.subscribeKey("wallets", (val) => this.wallets = val)]);
  }
  firstUpdated() {
    this.initialFetch();
    this.createPaginationObserver();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.paginationObserver?.disconnect();
  }
  render() {
    if (this.mobileFullScreen) {
      this.setAttribute("data-mobile-fullscreen", "true");
    }
    return x`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0", "3", "3", "3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading ? this.shimmerTemplate(16) : this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `;
  }
  async initialFetch() {
    this.loading = true;
    const gridEl = this.shadowRoot?.querySelector("wui-grid");
    if (gridEl) {
      await ApiController.fetchWalletsByPage({ page: 1 });
      await gridEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      }).finished;
      this.loading = false;
      gridEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      });
    }
  }
  shimmerTemplate(items, id) {
    return [...Array(items)].map(() => x`
        <wui-card-select-loader type="wallet" id=${o(id)}></wui-card-select-loader>
      `);
  }
  walletsTemplate() {
    return WalletUtil.getWalletConnectWallets(this.wallets).map((wallet, index) => x`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${wallet.id}"
          @click=${() => this.onConnectWallet(wallet)}
          .wallet=${wallet}
          explorerId=${wallet.id}
          certified=${this.badge === "certified"}
          displayIndex=${index}
        ></w3m-all-wallets-list-item>
      `);
  }
  paginationLoaderTemplate() {
    const { wallets, recommended, featured, count, mobileFilteredOutWalletsLength } = ApiController.state;
    const columns = window.innerWidth < 352 ? 3 : 4;
    const currentWallets = wallets.length + recommended.length;
    const minimumRows = Math.ceil(currentWallets / columns);
    let shimmerCount = minimumRows * columns - currentWallets + columns;
    shimmerCount -= wallets.length ? featured.length % columns : 0;
    if (count === 0 && featured.length > 0) {
      return null;
    }
    if (count === 0 || [...featured, ...wallets, ...recommended].length < count - (mobileFilteredOutWalletsLength ?? 0)) {
      return this.shimmerTemplate(shimmerCount, PAGINATOR_ID);
    }
    return null;
  }
  createPaginationObserver() {
    const loaderEl = this.shadowRoot?.querySelector(`#${PAGINATOR_ID}`);
    if (loaderEl) {
      this.paginationObserver = new IntersectionObserver(([element]) => {
        if (element?.isIntersecting && !this.loading) {
          const { page, count, wallets } = ApiController.state;
          if (wallets.length < count) {
            ApiController.fetchWalletsByPage({ page: page + 1 });
          }
        }
      });
      this.paginationObserver.observe(loaderEl);
    }
  }
  onConnectWallet(wallet) {
    ConnectorController.selectWalletConnector(wallet);
  }
};
W3mAllWalletsList.styles = styles$7;
__decorate$h([
  r()
], W3mAllWalletsList.prototype, "loading", void 0);
__decorate$h([
  r()
], W3mAllWalletsList.prototype, "wallets", void 0);
__decorate$h([
  r()
], W3mAllWalletsList.prototype, "badge", void 0);
__decorate$h([
  r()
], W3mAllWalletsList.prototype, "mobileFullScreen", void 0);
W3mAllWalletsList = __decorate$h([
  customElement("w3m-all-wallets-list")
], W3mAllWalletsList);
const styles$6 = i$1`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
var __decorate$g = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAllWalletsSearch = class W3mAllWalletsSearch2 extends i {
  constructor() {
    super(...arguments);
    this.prevQuery = "";
    this.prevBadge = void 0;
    this.loading = true;
    this.mobileFullScreen = OptionsController.state.enableMobileFullScreen;
    this.query = "";
  }
  render() {
    if (this.mobileFullScreen) {
      this.setAttribute("data-mobile-fullscreen", "true");
    }
    this.onSearch();
    return this.loading ? x`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>` : this.walletsTemplate();
  }
  async onSearch() {
    if (this.query.trim() !== this.prevQuery.trim() || this.badge !== this.prevBadge) {
      this.prevQuery = this.query;
      this.prevBadge = this.badge;
      this.loading = true;
      await ApiController.searchWallet({ search: this.query, badge: this.badge });
      this.loading = false;
    }
  }
  walletsTemplate() {
    const { search } = ApiController.state;
    const markedInstalledWallets = WalletUtil.markWalletsAsInstalled(search);
    const walletsByWcSupport = WalletUtil.filterWalletsByWcSupport(markedInstalledWallets);
    if (!walletsByWcSupport.length) {
      return x`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `;
    }
    return x`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0", "3", "3", "3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${walletsByWcSupport.map((wallet, index) => x`
            <w3m-all-wallets-list-item
              @click=${() => this.onConnectWallet(wallet)}
              .wallet=${wallet}
              data-testid="wallet-search-item-${wallet.id}"
              explorerId=${wallet.id}
              certified=${this.badge === "certified"}
              walletQuery=${this.query}
              displayIndex=${index}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `;
  }
  onConnectWallet(wallet) {
    ConnectorController.selectWalletConnector(wallet);
  }
};
W3mAllWalletsSearch.styles = styles$6;
__decorate$g([
  r()
], W3mAllWalletsSearch.prototype, "loading", void 0);
__decorate$g([
  r()
], W3mAllWalletsSearch.prototype, "mobileFullScreen", void 0);
__decorate$g([
  n()
], W3mAllWalletsSearch.prototype, "query", void 0);
__decorate$g([
  n()
], W3mAllWalletsSearch.prototype, "badge", void 0);
W3mAllWalletsSearch = __decorate$g([
  customElement("w3m-all-wallets-search")
], W3mAllWalletsSearch);
var __decorate$f = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAllWalletsView = class W3mAllWalletsView2 extends i {
  constructor() {
    super(...arguments);
    this.search = "";
    this.badge = void 0;
    this.onDebouncedSearch = CoreHelperUtil.debounce((value) => {
      this.search = value;
    });
  }
  render() {
    const isSearch = this.search.length >= 2;
    return x`
      <wui-flex .padding=${["1", "3", "3", "3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge === "certified"}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${isSearch || this.badge ? x`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>` : x`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `;
  }
  onInputChange(event) {
    this.onDebouncedSearch(event.detail);
  }
  onCertifiedSwitchChange(event) {
    if (event.detail) {
      this.badge = "certified";
      SnackController.showSvg("Only WalletConnect certified", {
        icon: "walletConnectBrown",
        iconColor: "accent-100"
      });
    } else {
      this.badge = void 0;
    }
  }
  qrButtonTemplate() {
    if (CoreHelperUtil.isMobile()) {
      return x`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `;
    }
    return null;
  }
  onWalletConnectQr() {
    RouterController.push("ConnectingWalletConnect");
  }
};
__decorate$f([
  r()
], W3mAllWalletsView.prototype, "search", void 0);
__decorate$f([
  r()
], W3mAllWalletsView.prototype, "badge", void 0);
W3mAllWalletsView = __decorate$f([
  customElement("w3m-all-wallets-view")
], W3mAllWalletsView);
var __decorate$e = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAllWalletsWidget = class W3mAllWalletsWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.tabIdx = void 0;
    this.connectors = ConnectorController.state.connectors;
    this.count = ApiController.state.count;
    this.filteredCount = ApiController.state.filteredWallets.length;
    this.isFetchingRecommendedWallets = ApiController.state.isFetchingRecommendedWallets;
    this.unsubscribe.push(ConnectorController.subscribeKey("connectors", (val) => this.connectors = val), ApiController.subscribeKey("count", (val) => this.count = val), ApiController.subscribeKey("filteredWallets", (val) => this.filteredCount = val.length), ApiController.subscribeKey("isFetchingRecommendedWallets", (val) => this.isFetchingRecommendedWallets = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const wcConnector = this.connectors.find((c) => c.id === "walletConnect");
    const { allWallets } = OptionsController.state;
    if (!wcConnector || allWallets === "HIDE") {
      return null;
    }
    if (allWallets === "ONLY_MOBILE" && !CoreHelperUtil.isMobile()) {
      return null;
    }
    const featuredCount = ApiController.state.featured.length;
    const rawCount = this.count + featuredCount;
    const roundedCount = rawCount < 10 ? rawCount : Math.floor(rawCount / 10) * 10;
    const count = this.filteredCount > 0 ? this.filteredCount : roundedCount;
    let tagLabel = `${count}`;
    if (this.filteredCount > 0) {
      tagLabel = `${this.filteredCount}`;
    } else if (count < rawCount) {
      tagLabel = `${count}+`;
    }
    const hasWcConnection = ConnectionController.hasAnyConnection(ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT);
    return x`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${tagLabel}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${o(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${hasWcConnection}
        size="sm"
      ></wui-list-wallet>
    `;
  }
  onAllWallets() {
    EventsController.sendEvent({ type: "track", event: "CLICK_ALL_WALLETS" });
    RouterController.push("AllWallets", { redirectView: RouterController.state.data?.redirectView });
  }
};
__decorate$e([
  n()
], W3mAllWalletsWidget.prototype, "tabIdx", void 0);
__decorate$e([
  r()
], W3mAllWalletsWidget.prototype, "connectors", void 0);
__decorate$e([
  r()
], W3mAllWalletsWidget.prototype, "count", void 0);
__decorate$e([
  r()
], W3mAllWalletsWidget.prototype, "filteredCount", void 0);
__decorate$e([
  r()
], W3mAllWalletsWidget.prototype, "isFetchingRecommendedWallets", void 0);
W3mAllWalletsWidget = __decorate$e([
  customElement("w3m-all-wallets-widget")
], W3mAllWalletsWidget);
const styles$5 = css`
  :host {
    margin-top: ${({ spacing }) => spacing["1"]};
  }
  wui-separator {
    margin: ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1)
      ${({ spacing }) => spacing["2"]} calc(${({ spacing }) => spacing["3"]} * -1);
    width: calc(100% + ${({ spacing }) => spacing["3"]} * 2);
  }
`;
var __decorate$d = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectorList = class W3mConnectorList2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.explorerWallets = ApiController.state.explorerWallets;
    this.connections = ConnectionController.state.connections;
    this.connectorImages = AssetController.state.connectorImages;
    this.loadingTelegram = false;
    this.unsubscribe.push(ConnectionController.subscribeKey("connections", (val) => this.connections = val), AssetController.subscribeKey("connectorImages", (val) => this.connectorImages = val), ApiController.subscribeKey("explorerFilteredWallets", (val) => {
      this.explorerWallets = val?.length ? val : ApiController.state.explorerWallets;
    }), ApiController.subscribeKey("explorerWallets", (val) => {
      if (!this.explorerWallets?.length) {
        this.explorerWallets = val;
      }
    }));
    if (CoreHelperUtil.isTelegram() && CoreHelperUtil.isIos()) {
      this.loadingTelegram = !ConnectionController.state.wcUri;
      this.unsubscribe.push(ConnectionController.subscribeKey("wcUri", (val) => this.loadingTelegram = !val));
    }
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `;
  }
  connectorListTemplate() {
    return ConnectorUtil.connectorList().map((item, displayIndex) => {
      if (item.kind === "connector") {
        return this.renderConnector(item, displayIndex);
      }
      return this.renderWallet(item, displayIndex);
    });
  }
  getConnectorNamespaces(item) {
    if (item.subtype === "walletConnect") {
      return [];
    }
    if (item.subtype === "multiChain") {
      return item.connector.connectors?.map((c) => c.chain) || [];
    }
    return [item.connector.chain];
  }
  renderConnector(item, index) {
    const connector = item.connector;
    const imageSrc = AssetUtil.getConnectorImage(connector) || this.connectorImages[connector?.imageId ?? ""];
    const connectionsByNamespace = this.connections.get(connector.chain) ?? [];
    const isAlreadyConnected = connectionsByNamespace.some((c) => HelpersUtil.isLowerCaseMatch(c.connectorId, connector.id));
    let tagLabel = void 0;
    let tagVariant = void 0;
    if (item.subtype === "walletConnect") {
      tagLabel = "qr code";
      tagVariant = "accent";
    } else if (item.subtype === "injected" || item.subtype === "announced") {
      tagLabel = isAlreadyConnected ? "connected" : "installed";
      tagVariant = isAlreadyConnected ? "info" : "success";
    } else {
      tagLabel = void 0;
      tagVariant = void 0;
    }
    const hasWcConnection = ConnectionController.hasAnyConnection(ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT);
    const disabled = item.subtype === "walletConnect" || item.subtype === "external" ? hasWcConnection : false;
    return x`
      <w3m-list-wallet
        displayIndex=${index}
        imageSrc=${o(imageSrc)}
        .installed=${true}
        name=${connector.name ?? "Unknown"}
        .tagVariant=${tagVariant}
        tagLabel=${o(tagLabel)}
        data-testid=${`wallet-selector-${connector.id.toLowerCase()}`}
        size="sm"
        @click=${() => this.onClickConnector(item)}
        tabIdx=${o(this.tabIdx)}
        ?disabled=${disabled}
        rdnsId=${o(connector.explorerWallet?.rdns || void 0)}
        walletRank=${o(connector.explorerWallet?.order)}
        .namespaces=${this.getConnectorNamespaces(item)}
      >
      </w3m-list-wallet>
    `;
  }
  onClickConnector(item) {
    const redirectView = RouterController.state.data?.redirectView;
    if (item.subtype === "walletConnect") {
      ConnectorController.setActiveConnector(item.connector);
      if (CoreHelperUtil.isMobile()) {
        RouterController.push("AllWallets");
      } else {
        RouterController.push("ConnectingWalletConnect", { redirectView });
      }
      return;
    }
    if (item.subtype === "multiChain") {
      ConnectorController.setActiveConnector(item.connector);
      RouterController.push("ConnectingMultiChain", { redirectView });
      return;
    }
    if (item.subtype === "injected") {
      ConnectorController.setActiveConnector(item.connector);
      RouterController.push("ConnectingExternal", {
        connector: item.connector,
        redirectView,
        wallet: item.connector.explorerWallet
      });
      return;
    }
    if (item.subtype === "announced") {
      if (item.connector.id === "walletConnect") {
        if (CoreHelperUtil.isMobile()) {
          RouterController.push("AllWallets");
        } else {
          RouterController.push("ConnectingWalletConnect", { redirectView });
        }
        return;
      }
      RouterController.push("ConnectingExternal", {
        connector: item.connector,
        redirectView,
        wallet: item.connector.explorerWallet
      });
      return;
    }
    RouterController.push("ConnectingExternal", {
      connector: item.connector,
      redirectView
    });
  }
  renderWallet(item, index) {
    const wallet = item.wallet;
    const imageSrc = AssetUtil.getWalletImage(wallet);
    const hasWcConnection = ConnectionController.hasAnyConnection(ConstantsUtil.CONNECTOR_ID.WALLET_CONNECT);
    const disabled = hasWcConnection;
    const loading = this.loadingTelegram;
    const tagLabel = item.subtype === "recent" ? "recent" : void 0;
    const tagVariant = item.subtype === "recent" ? "info" : void 0;
    return x`
      <w3m-list-wallet
        displayIndex=${index}
        imageSrc=${o(imageSrc)}
        name=${wallet.name ?? "Unknown"}
        @click=${() => this.onClickWallet(item)}
        size="sm"
        data-testid=${`wallet-selector-${wallet.id}`}
        tabIdx=${o(this.tabIdx)}
        ?loading=${loading}
        ?disabled=${disabled}
        rdnsId=${o(wallet.rdns || void 0)}
        walletRank=${o(wallet.order)}
        tagLabel=${o(tagLabel)}
        .tagVariant=${tagVariant}
      >
      </w3m-list-wallet>
    `;
  }
  onClickWallet(item) {
    const redirectView = RouterController.state.data?.redirectView;
    const namespace = ChainController.state.activeChain;
    if (item.subtype === "featured") {
      ConnectorController.selectWalletConnector(item.wallet);
      return;
    }
    if (item.subtype === "recent") {
      if (this.loadingTelegram) {
        return;
      }
      ConnectorController.selectWalletConnector(item.wallet);
      return;
    }
    if (item.subtype === "custom") {
      if (this.loadingTelegram) {
        return;
      }
      RouterController.push("ConnectingWalletConnect", { wallet: item.wallet, redirectView });
      return;
    }
    if (this.loadingTelegram) {
      return;
    }
    const connector = namespace ? ConnectorController.getConnector({ id: item.wallet.id, namespace }) : void 0;
    if (connector) {
      RouterController.push("ConnectingExternal", { connector, redirectView });
    } else {
      RouterController.push("ConnectingWalletConnect", { wallet: item.wallet, redirectView });
    }
  }
};
W3mConnectorList.styles = styles$5;
__decorate$d([
  n({ type: Number })
], W3mConnectorList.prototype, "tabIdx", void 0);
__decorate$d([
  r()
], W3mConnectorList.prototype, "explorerWallets", void 0);
__decorate$d([
  r()
], W3mConnectorList.prototype, "connections", void 0);
__decorate$d([
  r()
], W3mConnectorList.prototype, "connectorImages", void 0);
__decorate$d([
  r()
], W3mConnectorList.prototype, "loadingTelegram", void 0);
W3mConnectorList = __decorate$d([
  customElement("w3m-connector-list")
], W3mConnectorList);
const styles$4 = css`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[5]};
    padding-left: ${({ spacing }) => spacing[3]};
    padding-right: ${({ spacing }) => spacing[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing }) => spacing[6]};
  }

  wui-text {
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;
var __decorate$c = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiCtaButton = class WuiCtaButton2 extends i {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.label = "";
    this.buttonLabel = "";
  }
  render() {
    return x`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `;
  }
};
WuiCtaButton.styles = [resetStyles, elementStyles, styles$4];
__decorate$c([
  n({ type: Boolean })
], WuiCtaButton.prototype, "disabled", void 0);
__decorate$c([
  n()
], WuiCtaButton.prototype, "label", void 0);
__decorate$c([
  n()
], WuiCtaButton.prototype, "buttonLabel", void 0);
WuiCtaButton = __decorate$c([
  customElement("wui-cta-button")
], WuiCtaButton);
const styles$3 = css`
  :host {
    display: block;
    padding: 0 ${({ spacing }) => spacing["5"]} ${({ spacing }) => spacing["5"]};
  }
`;
var __decorate$b = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mMobileDownloadLinks = class W3mMobileDownloadLinks2 extends i {
  constructor() {
    super(...arguments);
    this.wallet = void 0;
  }
  render() {
    if (!this.wallet) {
      this.style.display = "none";
      return null;
    }
    const { name, app_store, play_store, chrome_store, homepage } = this.wallet;
    const isMobile = CoreHelperUtil.isMobile();
    const isIos = CoreHelperUtil.isIos();
    const isAndroid = CoreHelperUtil.isAndroid();
    const isMultiple = [app_store, play_store, homepage, chrome_store].filter(Boolean).length > 1;
    const shortName = UiHelperUtil.getTruncateString({
      string: name,
      charsStart: 12,
      charsEnd: 0,
      truncate: "end"
    });
    if (isMultiple && !isMobile) {
      return x`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${() => RouterController.push("Downloads", { wallet: this.wallet })}
        ></wui-cta-button>
      `;
    }
    if (!isMultiple && homepage) {
      return x`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `;
    }
    if (app_store && isIos) {
      return x`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `;
    }
    if (play_store && isAndroid) {
      return x`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `;
    }
    this.style.display = "none";
    return null;
  }
  onAppStore() {
    if (this.wallet?.app_store) {
      CoreHelperUtil.openHref(this.wallet.app_store, "_blank");
    }
  }
  onPlayStore() {
    if (this.wallet?.play_store) {
      CoreHelperUtil.openHref(this.wallet.play_store, "_blank");
    }
  }
  onHomePage() {
    if (this.wallet?.homepage) {
      CoreHelperUtil.openHref(this.wallet.homepage, "_blank");
    }
  }
};
W3mMobileDownloadLinks.styles = [styles$3];
__decorate$b([
  n({ type: Object })
], W3mMobileDownloadLinks.prototype, "wallet", void 0);
W3mMobileDownloadLinks = __decorate$b([
  customElement("w3m-mobile-download-links")
], W3mMobileDownloadLinks);
const styles$2 = css`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing }) => spacing["1"]} * -1);
    bottom: calc(${({ spacing }) => spacing["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({ durations }) => durations["lg"]};
    transition-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({ spacing }) => spacing["4"]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({ easings }) => easings["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;
var __decorate$a = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
class W3mConnectingWidget extends i {
  constructor() {
    super();
    this.wallet = RouterController.state.data?.wallet;
    this.connector = RouterController.state.data?.connector;
    this.timeout = void 0;
    this.secondaryBtnIcon = "refresh";
    this.onConnect = void 0;
    this.onRender = void 0;
    this.onAutoConnect = void 0;
    this.isWalletConnect = true;
    this.unsubscribe = [];
    this.imageSrc = AssetUtil.getConnectorImage(this.connector) ?? AssetUtil.getWalletImage(this.wallet);
    this.name = this.wallet?.name ?? this.connector?.name ?? "Wallet";
    this.isRetrying = false;
    this.uri = ConnectionController.state.wcUri;
    this.error = ConnectionController.state.wcError;
    this.ready = false;
    this.showRetry = false;
    this.label = void 0;
    this.secondaryBtnLabel = "Try again";
    this.secondaryLabel = "Accept connection request in the wallet";
    this.isLoading = false;
    this.isMobile = false;
    this.onRetry = void 0;
    this.unsubscribe.push(...[
      ConnectionController.subscribeKey("wcUri", (val) => {
        this.uri = val;
        if (this.isRetrying && this.onRetry) {
          this.isRetrying = false;
          this.onConnect?.();
        }
      }),
      ConnectionController.subscribeKey("wcError", (val) => this.error = val)
    ]);
    if ((CoreHelperUtil.isTelegram() || CoreHelperUtil.isSafari()) && CoreHelperUtil.isIos() && ConnectionController.state.wcUri) {
      this.onConnect?.();
    }
  }
  firstUpdated() {
    this.onAutoConnect?.();
    this.showRetry = !this.onAutoConnect;
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    ConnectionController.setWcError(false);
    clearTimeout(this.timeout);
  }
  render() {
    this.onRender?.();
    this.onShowRetry();
    const subLabel = this.error ? "Connection can be declined if a previous request is still active" : this.secondaryLabel;
    let label = "";
    if (this.label) {
      label = this.label;
    } else {
      label = `Continue in ${this.name}`;
      if (this.error) {
        label = "Connection declined";
      }
    }
    return x`
      <wui-flex
        data-error=${o(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10", "5", "5", "5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${o(this.imageSrc)}></wui-wallet-image>

          ${this.error ? null : this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2", "0", "0", "0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error ? "error" : "primary"}>
            ${label}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${subLabel}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel ? x`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying || this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              ` : null}
      </wui-flex>

      ${this.isWalletConnect ? x`
              <wui-flex .padding=${["0", "5", "5", "5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            ` : null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `;
  }
  onShowRetry() {
    if (this.error && !this.showRetry) {
      this.showRetry = true;
      const retryButton = this.shadowRoot?.querySelector("wui-button");
      retryButton?.animate([{ opacity: 0 }, { opacity: 1 }], {
        fill: "forwards",
        easing: "ease"
      });
    }
  }
  onTryAgain() {
    ConnectionController.setWcError(false);
    if (this.onRetry) {
      this.isRetrying = true;
      this.onRetry?.();
    } else {
      this.onConnect?.();
    }
  }
  loaderTemplate() {
    const borderRadiusMaster = ThemeController.state.themeVariables["--w3m-border-radius-master"];
    const radius = borderRadiusMaster ? parseInt(borderRadiusMaster.replace("px", ""), 10) : 4;
    return x`<wui-loading-thumbnail radius=${radius * 9}></wui-loading-thumbnail>`;
  }
  onCopyUri() {
    try {
      if (this.uri) {
        CoreHelperUtil.copyToClopboard(this.uri);
        SnackController.showSuccess("Link copied");
      }
    } catch {
      SnackController.showError("Failed to copy");
    }
  }
}
W3mConnectingWidget.styles = styles$2;
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "isRetrying", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "uri", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "error", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "ready", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "showRetry", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "label", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "secondaryBtnLabel", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "secondaryLabel", void 0);
__decorate$a([
  r()
], W3mConnectingWidget.prototype, "isLoading", void 0);
__decorate$a([
  n({ type: Boolean })
], W3mConnectingWidget.prototype, "isMobile", void 0);
__decorate$a([
  n()
], W3mConnectingWidget.prototype, "onRetry", void 0);
var __decorate$9 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingHeader = class W3mConnectingHeader2 extends i {
  constructor() {
    super(...arguments);
    this.platformTabs = [];
    this.unsubscribe = [];
    this.platforms = [];
    this.onSelectPlatfrom = void 0;
  }
  disconnectCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const tabs = this.generateTabs();
    return x`
      <wui-flex justifyContent="center" .padding=${["0", "0", "4", "0"]}>
        <wui-tabs .tabs=${tabs} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `;
  }
  generateTabs() {
    const tabs = this.platforms.map((platform) => {
      if (platform === "browser") {
        return { label: "Browser", icon: "extension", platform: "browser" };
      } else if (platform === "mobile") {
        return { label: "Mobile", icon: "mobile", platform: "mobile" };
      } else if (platform === "qrcode") {
        return { label: "Mobile", icon: "mobile", platform: "qrcode" };
      } else if (platform === "web") {
        return { label: "Webapp", icon: "browser", platform: "web" };
      } else if (platform === "desktop") {
        return { label: "Desktop", icon: "desktop", platform: "desktop" };
      }
      return { label: "Browser", icon: "extension", platform: "unsupported" };
    });
    this.platformTabs = tabs.map(({ platform }) => platform);
    return tabs;
  }
  onTabChange(index) {
    const tab = this.platformTabs[index];
    if (tab) {
      this.onSelectPlatfrom?.(tab);
    }
  }
};
__decorate$9([
  n({ type: Array })
], W3mConnectingHeader.prototype, "platforms", void 0);
__decorate$9([
  n()
], W3mConnectingHeader.prototype, "onSelectPlatfrom", void 0);
W3mConnectingHeader = __decorate$9([
  customElement("w3m-connecting-header")
], W3mConnectingHeader);
var __decorate$8 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcBrowser = class W3mConnectingWcBrowser2 extends W3mConnectingWidget {
  constructor() {
    super();
    if (!this.wallet) {
      throw new Error("w3m-connecting-wc-browser: No wallet provided");
    }
    this.onConnect = this.onConnectProxy.bind(this);
    this.onAutoConnect = this.onConnectProxy.bind(this);
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.wallet.name,
        platform: "browser",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet.order,
        view: RouterController.state.view
      }
    });
  }
  async onConnectProxy() {
    try {
      this.error = false;
      const { connectors } = ConnectorController.state;
      const connector = connectors.find((c) => c.type === "ANNOUNCED" && c.info?.rdns === this.wallet?.rdns || c.type === "INJECTED" || c.name === this.wallet?.name);
      if (connector) {
        await ConnectionController.connectExternal(connector, connector.chain);
      } else {
        throw new Error("w3m-connecting-wc-browser: No connector found");
      }
      ModalController.close();
    } catch (error) {
      const isUserRejectedRequestError = error instanceof AppKitError && error.originalName === ErrorUtil.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST;
      if (isUserRejectedRequestError) {
        EventsController.sendEvent({
          type: "track",
          event: "USER_REJECTED",
          properties: { message: error.message }
        });
      } else {
        EventsController.sendEvent({
          type: "track",
          event: "CONNECT_ERROR",
          properties: { message: error?.message ?? "Unknown" }
        });
      }
      this.error = true;
    }
  }
};
W3mConnectingWcBrowser = __decorate$8([
  customElement("w3m-connecting-wc-browser")
], W3mConnectingWcBrowser);
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcDesktop = class W3mConnectingWcDesktop2 extends W3mConnectingWidget {
  constructor() {
    super();
    if (!this.wallet) {
      throw new Error("w3m-connecting-wc-desktop: No wallet provided");
    }
    this.onConnect = this.onConnectProxy.bind(this);
    this.onRender = this.onRenderProxy.bind(this);
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.wallet.name,
        platform: "desktop",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet.order,
        view: RouterController.state.view
      }
    });
  }
  onRenderProxy() {
    if (!this.ready && this.uri) {
      this.ready = true;
      this.onConnect?.();
    }
  }
  onConnectProxy() {
    if (this.wallet?.desktop_link && this.uri) {
      try {
        this.error = false;
        const { desktop_link, name } = this.wallet;
        const { redirect, href } = CoreHelperUtil.formatNativeUrl(desktop_link, this.uri);
        ConnectionController.setWcLinking({ name, href });
        ConnectionController.setRecentWallet(this.wallet);
        CoreHelperUtil.openHref(redirect, "_blank");
      } catch {
        this.error = true;
      }
    }
  }
};
W3mConnectingWcDesktop = __decorate$7([
  customElement("w3m-connecting-wc-desktop")
], W3mConnectingWcDesktop);
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcMobile = class W3mConnectingWcMobile2 extends W3mConnectingWidget {
  constructor() {
    super();
    this.btnLabelTimeout = void 0;
    this.redirectDeeplink = void 0;
    this.redirectUniversalLink = void 0;
    this.target = void 0;
    this.preferUniversalLinks = OptionsController.state.experimental_preferUniversalLinks;
    this.isLoading = true;
    this.onConnect = () => {
      ConnectionControllerUtil.onConnectMobile(this.wallet);
    };
    if (!this.wallet) {
      throw new Error("w3m-connecting-wc-mobile: No wallet provided");
    }
    this.secondaryBtnLabel = "Open";
    this.secondaryLabel = ConstantsUtil$1.CONNECT_LABELS.MOBILE;
    this.secondaryBtnIcon = "externalLink";
    this.onHandleURI();
    this.unsubscribe.push(ConnectionController.subscribeKey("wcUri", () => {
      this.onHandleURI();
    }));
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.wallet.name,
        platform: "mobile",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet.order,
        view: RouterController.state.view
      }
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.btnLabelTimeout);
  }
  onHandleURI() {
    this.isLoading = !this.uri;
    if (!this.ready && this.uri) {
      this.ready = true;
      this.onConnect?.();
    }
  }
  onTryAgain() {
    ConnectionController.setWcError(false);
    this.onConnect?.();
  }
};
__decorate$6([
  r()
], W3mConnectingWcMobile.prototype, "redirectDeeplink", void 0);
__decorate$6([
  r()
], W3mConnectingWcMobile.prototype, "redirectUniversalLink", void 0);
__decorate$6([
  r()
], W3mConnectingWcMobile.prototype, "target", void 0);
__decorate$6([
  r()
], W3mConnectingWcMobile.prototype, "preferUniversalLinks", void 0);
__decorate$6([
  r()
], W3mConnectingWcMobile.prototype, "isLoading", void 0);
W3mConnectingWcMobile = __decorate$6([
  customElement("w3m-connecting-wc-mobile")
], W3mConnectingWcMobile);
const styles$1 = css`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({ durations }) => durations["xl"]};
    animation-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcQrcode = class W3mConnectingWcQrcode2 extends W3mConnectingWidget {
  constructor() {
    super();
    this.basic = false;
  }
  firstUpdated() {
    if (!this.basic) {
      EventsController.sendEvent({
        type: "track",
        event: "SELECT_WALLET",
        properties: {
          name: this.wallet?.name ?? "WalletConnect",
          platform: "qrcode",
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet?.order,
          view: RouterController.state.view
        }
      });
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.forEach((unsub) => unsub());
  }
  render() {
    this.onRenderProxy();
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0", "5", "5", "5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `;
  }
  onRenderProxy() {
    if (!this.ready && this.uri) {
      this.ready = true;
    }
  }
  qrCodeTemplate() {
    if (!this.uri || !this.ready) {
      return null;
    }
    const alt = this.wallet ? this.wallet.name : void 0;
    ConnectionController.setWcLinking(void 0);
    ConnectionController.setRecentWallet(this.wallet);
    const qrColor = ThemeController.state.themeVariables["--apkt-qr-color"] ?? ThemeController.state.themeVariables["--w3m-qr-color"];
    return x` <wui-qr-code
      theme=${ThemeController.state.themeMode}
      uri=${this.uri}
      imageSrc=${o(AssetUtil.getWalletImage(this.wallet))}
      color=${o(qrColor)}
      alt=${o(alt)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`;
  }
  copyTemplate() {
    const inactive = !this.uri || !this.ready;
    return x`<wui-button
      .disabled=${inactive}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`;
  }
};
W3mConnectingWcQrcode.styles = styles$1;
__decorate$5([
  n({ type: Boolean })
], W3mConnectingWcQrcode.prototype, "basic", void 0);
W3mConnectingWcQrcode = __decorate$5([
  customElement("w3m-connecting-wc-qrcode")
], W3mConnectingWcQrcode);
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcUnsupported = class W3mConnectingWcUnsupported2 extends i {
  constructor() {
    super();
    this.wallet = RouterController.state.data?.wallet;
    if (!this.wallet) {
      throw new Error("w3m-connecting-wc-unsupported: No wallet provided");
    }
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.wallet.name,
        platform: "browser",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet?.order,
        view: RouterController.state.view
      }
    });
  }
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10", "5", "5", "5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${o(AssetUtil.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `;
  }
};
W3mConnectingWcUnsupported = __decorate$4([
  customElement("w3m-connecting-wc-unsupported")
], W3mConnectingWcUnsupported);
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcWeb = class W3mConnectingWcWeb2 extends W3mConnectingWidget {
  constructor() {
    super();
    this.isLoading = true;
    if (!this.wallet) {
      throw new Error("w3m-connecting-wc-web: No wallet provided");
    }
    this.onConnect = this.onConnectProxy.bind(this);
    this.secondaryBtnLabel = "Open";
    this.secondaryLabel = ConstantsUtil$1.CONNECT_LABELS.MOBILE;
    this.secondaryBtnIcon = "externalLink";
    this.updateLoadingState();
    this.unsubscribe.push(ConnectionController.subscribeKey("wcUri", () => {
      this.updateLoadingState();
    }));
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.wallet.name,
        platform: "web",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet?.order,
        view: RouterController.state.view
      }
    });
  }
  updateLoadingState() {
    this.isLoading = !this.uri;
  }
  onConnectProxy() {
    if (this.wallet?.webapp_link && this.uri) {
      try {
        this.error = false;
        const { webapp_link, name } = this.wallet;
        const { redirect, href } = CoreHelperUtil.formatUniversalUrl(webapp_link, this.uri);
        ConnectionController.setWcLinking({ name, href });
        ConnectionController.setRecentWallet(this.wallet);
        CoreHelperUtil.openHref(redirect, "_blank");
      } catch {
        this.error = true;
      }
    }
  }
};
__decorate$3([
  r()
], W3mConnectingWcWeb.prototype, "isLoading", void 0);
W3mConnectingWcWeb = __decorate$3([
  customElement("w3m-connecting-wc-web")
], W3mConnectingWcWeb);
const styles = css`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcView = class W3mConnectingWcView2 extends i {
  constructor() {
    super();
    this.wallet = RouterController.state.data?.wallet;
    this.unsubscribe = [];
    this.platform = void 0;
    this.platforms = [];
    this.isSiwxEnabled = Boolean(OptionsController.state.siwx);
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.displayBranding = true;
    this.basic = false;
    this.determinePlatforms();
    this.initializeConnection();
    this.unsubscribe.push(OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (OptionsController.state.enableMobileFullScreen) {
      this.setAttribute("data-mobile-fullscreen", "true");
    }
    return x`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `;
  }
  reownBrandingTemplate() {
    if (!this.remoteFeatures?.reownBranding || !this.displayBranding) {
      return null;
    }
    return x`<wui-ux-by-reown></wui-ux-by-reown>`;
  }
  async initializeConnection(retry = false) {
    if (this.platform === "browser" || OptionsController.state.manualWCControl && !retry) {
      return;
    }
    try {
      const { wcPairingExpiry, status } = ConnectionController.state;
      const { redirectView } = RouterController.state.data ?? {};
      if (retry || OptionsController.state.enableEmbedded || CoreHelperUtil.isPairingExpired(wcPairingExpiry) || status === "connecting") {
        const connectionsByNamespace = ConnectionController.getConnections(ChainController.state.activeChain);
        const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
        const hasConnections = connectionsByNamespace.length > 0;
        await ConnectionController.connectWalletConnect({ cache: "never" });
        if (!this.isSiwxEnabled) {
          if (hasConnections && isMultiWalletEnabled) {
            RouterController.replace("ProfileWallets");
            SnackController.showSuccess("New Wallet Added");
          } else if (redirectView) {
            RouterController.replace(redirectView);
          } else {
            ModalController.close();
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("An error occurred when attempting to switch chain") && !OptionsController.state.enableNetworkSwitch) {
        if (ChainController.state.activeChain) {
          ChainController.setActiveCaipNetwork(CaipNetworksUtil.getUnsupportedNetwork(`${ChainController.state.activeChain}:${ChainController.state.activeCaipNetwork?.id}`));
          ChainController.showUnsupportedChainUI();
          return;
        }
      }
      const isUserRejectedRequestError = error instanceof AppKitError && error.originalName === ErrorUtil.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST;
      if (isUserRejectedRequestError) {
        EventsController.sendEvent({
          type: "track",
          event: "USER_REJECTED",
          properties: { message: error.message }
        });
      } else {
        EventsController.sendEvent({
          type: "track",
          event: "CONNECT_ERROR",
          properties: { message: error?.message ?? "Unknown" }
        });
      }
      ConnectionController.setWcError(true);
      SnackController.showError(error.message ?? "Connection error");
      ConnectionController.resetWcConnection();
      RouterController.goBack();
    }
  }
  determinePlatforms() {
    if (!this.wallet) {
      this.platforms.push("qrcode");
      this.platform = "qrcode";
      return;
    }
    if (this.platform) {
      return;
    }
    const { mobile_link, desktop_link, webapp_link, injected, rdns } = this.wallet;
    const injectedIds = injected?.map(({ injected_id }) => injected_id).filter(Boolean);
    const browserIds = [...rdns ? [rdns] : injectedIds ?? []];
    const isBrowser = OptionsController.state.isUniversalProvider ? false : browserIds.length;
    const hasMobileWCLink = mobile_link;
    const isWebWc = webapp_link;
    const isBrowserInstalled = ConnectionController.checkInstalled(browserIds);
    const isBrowserWc = isBrowser && isBrowserInstalled;
    const isDesktopWc = desktop_link && !CoreHelperUtil.isMobile();
    if (isBrowserWc && !ChainController.state.noAdapters) {
      this.platforms.push("browser");
    }
    if (hasMobileWCLink) {
      this.platforms.push(CoreHelperUtil.isMobile() ? "mobile" : "qrcode");
    }
    if (isWebWc) {
      this.platforms.push("web");
    }
    if (isDesktopWc) {
      this.platforms.push("desktop");
    }
    if (!isBrowserWc && isBrowser && !ChainController.state.noAdapters) {
      this.platforms.push("unsupported");
    }
    this.platform = this.platforms[0];
  }
  platformTemplate() {
    switch (this.platform) {
      case "browser":
        return x`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;
      case "web":
        return x`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;
      case "desktop":
        return x`
          <w3m-connecting-wc-desktop .onRetry=${() => this.initializeConnection(true)}>
          </w3m-connecting-wc-desktop>
        `;
      case "mobile":
        return x`
          <w3m-connecting-wc-mobile isMobile .onRetry=${() => this.initializeConnection(true)}>
          </w3m-connecting-wc-mobile>
        `;
      case "qrcode":
        return x`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;
      default:
        return x`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`;
    }
  }
  headerTemplate() {
    const multiPlatform = this.platforms.length > 1;
    if (!multiPlatform) {
      return null;
    }
    return x`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `;
  }
  async onSelectPlatform(platform) {
    const container = this.shadowRoot?.querySelector("div");
    if (container) {
      await container.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      }).finished;
      this.platform = platform;
      container.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      });
    }
  }
};
W3mConnectingWcView.styles = styles;
__decorate$2([
  r()
], W3mConnectingWcView.prototype, "platform", void 0);
__decorate$2([
  r()
], W3mConnectingWcView.prototype, "platforms", void 0);
__decorate$2([
  r()
], W3mConnectingWcView.prototype, "isSiwxEnabled", void 0);
__decorate$2([
  r()
], W3mConnectingWcView.prototype, "remoteFeatures", void 0);
__decorate$2([
  n({ type: Boolean })
], W3mConnectingWcView.prototype, "displayBranding", void 0);
__decorate$2([
  n({ type: Boolean })
], W3mConnectingWcView.prototype, "basic", void 0);
W3mConnectingWcView = __decorate$2([
  customElement("w3m-connecting-wc-view")
], W3mConnectingWcView);
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingWcBasicView = class W3mConnectingWcBasicView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.isMobile = CoreHelperUtil.isMobile();
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.unsubscribe.push(OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (this.isMobile) {
      const { featured, recommended } = ApiController.state;
      const { customWallets } = OptionsController.state;
      const recent = StorageUtil.getRecentWallets();
      const showConnectors = featured.length || recommended.length || customWallets?.length || recent.length;
      return x`<wui-flex flexDirection="column" gap="2" .margin=${["1", "3", "3", "3"]}>
        ${showConnectors ? x`<w3m-connector-list></w3m-connector-list>` : null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`;
    }
    return x`<wui-flex flexDirection="column" .padding=${["0", "0", "4", "0"]}>
        <w3m-connecting-wc-view ?basic=${true} .displayBranding=${false}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0", "3", "0", "3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `;
  }
  reownBrandingTemplate() {
    if (!this.remoteFeatures?.reownBranding) {
      return null;
    }
    return x` <wui-flex flexDirection="column" .padding=${["1", "0", "1", "0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`;
  }
};
__decorate$1([
  r()
], W3mConnectingWcBasicView.prototype, "isMobile", void 0);
__decorate$1([
  r()
], W3mConnectingWcBasicView.prototype, "remoteFeatures", void 0);
W3mConnectingWcBasicView = __decorate$1([
  customElement("w3m-connecting-wc-basic-view")
], W3mConnectingWcBasicView);
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mDownloadsView = class W3mDownloadsView2 extends i {
  constructor() {
    super(...arguments);
    this.wallet = RouterController.state.data?.wallet;
  }
  render() {
    if (!this.wallet) {
      throw new Error("w3m-downloads-view");
    }
    return x`
      <wui-flex gap="2" flexDirection="column" .padding=${["3", "3", "4", "3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `;
  }
  chromeTemplate() {
    if (!this.wallet?.chrome_store) {
      return null;
    }
    return x`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`;
  }
  iosTemplate() {
    if (!this.wallet?.app_store) {
      return null;
    }
    return x`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`;
  }
  androidTemplate() {
    if (!this.wallet?.play_store) {
      return null;
    }
    return x`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`;
  }
  homepageTemplate() {
    if (!this.wallet?.homepage) {
      return null;
    }
    return x`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `;
  }
  openStore(params) {
    if (params.href && this.wallet) {
      EventsController.sendEvent({
        type: "track",
        event: "GET_WALLET",
        properties: {
          name: this.wallet.name,
          walletRank: this.wallet.order,
          explorerId: this.wallet.id,
          type: params.type
        }
      });
      CoreHelperUtil.openHref(params.href, "_blank");
    }
  }
  onChromeStore() {
    if (this.wallet?.chrome_store) {
      this.openStore({ href: this.wallet.chrome_store, type: "chrome_store" });
    }
  }
  onAppStore() {
    if (this.wallet?.app_store) {
      this.openStore({ href: this.wallet.app_store, type: "app_store" });
    }
  }
  onPlayStore() {
    if (this.wallet?.play_store) {
      this.openStore({ href: this.wallet.play_store, type: "play_store" });
    }
  }
  onHomePage() {
    if (this.wallet?.homepage) {
      this.openStore({ href: this.wallet.homepage, type: "homepage" });
    }
  }
};
W3mDownloadsView = __decorate([
  customElement("w3m-downloads-view")
], W3mDownloadsView);
const basic = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get W3mAllWalletsView() {
    return W3mAllWalletsView;
  },
  get W3mConnectingWcBasicView() {
    return W3mConnectingWcBasicView;
  },
  get W3mDownloadsView() {
    return W3mDownloadsView;
  }
}, Symbol.toStringTag, { value: "Module" }));
export {
  W3mConnectingWidget as W,
  W3mAllWalletsView as a,
  W3mConnectingWcView as b,
  W3mConnectingWcBasicView as c,
  W3mDownloadsView as d,
  basic as e
};
