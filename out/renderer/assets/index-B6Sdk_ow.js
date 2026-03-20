import { w as withErrorBoundary, p as proxy, s as subscribeKey, k as subscribe, t as i, q as i$1, R as RouterController, M as ModalController, x, n as css } from "./walletconnect-BVoLvI4P.js";
import { n, r, c as customElement } from "./index-5878y4Sm.js";
const state = proxy({
  message: "",
  open: false,
  triggerRect: {
    width: 0,
    height: 0,
    top: 0,
    left: 0
  },
  variant: "shade"
});
const controller = {
  state,
  subscribe(callback) {
    return subscribe(state, () => callback(state));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state, key, callback);
  },
  showTooltip({ message, triggerRect, variant }) {
    state.open = true;
    state.message = message;
    state.triggerRect = triggerRect;
    state.variant = variant;
  },
  hide() {
    state.open = false;
    state.message = "";
    state.triggerRect = {
      width: 0,
      height: 0,
      top: 0,
      left: 0
    };
  }
};
const TooltipController = withErrorBoundary(controller);
const styles$1 = i`
  :host {
    width: 100%;
    display: block;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTooltipTrigger = class WuiTooltipTrigger2 extends i$1 {
  constructor() {
    super();
    this.unsubscribe = [];
    this.text = "";
    this.open = TooltipController.state.open;
    this.unsubscribe.push(RouterController.subscribeKey("view", () => {
      TooltipController.hide();
    }), ModalController.subscribeKey("open", (modalOpen) => {
      if (!modalOpen) {
        TooltipController.hide();
      }
    }), TooltipController.subscribeKey("open", (tooltipOpen) => {
      this.open = tooltipOpen;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    TooltipController.hide();
  }
  render() {
    return x`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `;
  }
  renderChildren() {
    return x`<slot></slot> `;
  }
  onMouseEnter() {
    const rect = this.getBoundingClientRect();
    if (!this.open) {
      const modalContainer = document.querySelector("w3m-modal");
      const triggerRect = {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top
      };
      if (modalContainer) {
        const containerRect = modalContainer.getBoundingClientRect();
        triggerRect.left = rect.left - (window.innerWidth - containerRect.width) / 2;
        triggerRect.top = rect.top - (window.innerHeight - containerRect.height) / 2;
      }
      TooltipController.showTooltip({
        message: this.text,
        triggerRect,
        variant: "shade"
      });
    }
  }
  onMouseLeave(event) {
    if (!this.contains(event.relatedTarget)) {
      TooltipController.hide();
    }
  }
};
WuiTooltipTrigger.styles = [styles$1];
__decorate$1([
  n()
], WuiTooltipTrigger.prototype, "text", void 0);
__decorate$1([
  r()
], WuiTooltipTrigger.prototype, "open", void 0);
WuiTooltipTrigger = __decorate$1([
  customElement("w3m-tooltip-trigger")
], WuiTooltipTrigger);
const styles = css`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({ spacing }) => spacing["3"]} 10px ${({ spacing }) => spacing["3"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({ spacing }) => spacing["5"]});
    transition: opacity ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({ durations }) => durations["xl"]};
    animation-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
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
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mTooltip = class W3mTooltip2 extends i$1 {
  constructor() {
    super();
    this.unsubscribe = [];
    this.open = TooltipController.state.open;
    this.message = TooltipController.state.message;
    this.triggerRect = TooltipController.state.triggerRect;
    this.variant = TooltipController.state.variant;
    this.unsubscribe.push(...[
      TooltipController.subscribe((newState) => {
        this.open = newState.open;
        this.message = newState.message;
        this.triggerRect = newState.triggerRect;
        this.variant = newState.variant;
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    this.dataset["variant"] = this.variant;
    const topValue = this.triggerRect.top;
    const leftValue = this.triggerRect.left;
    this.style.cssText = `
    --w3m-tooltip-top: ${topValue}px;
    --w3m-tooltip-left: ${leftValue}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width / 2}px;
    --w3m-tooltip-display: ${this.open ? "flex" : "none"};
    --w3m-tooltip-opacity: ${this.open ? 1 : 0};
    `;
    return x`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`;
  }
};
W3mTooltip.styles = [styles];
__decorate([
  r()
], W3mTooltip.prototype, "open", void 0);
__decorate([
  r()
], W3mTooltip.prototype, "message", void 0);
__decorate([
  r()
], W3mTooltip.prototype, "triggerRect", void 0);
__decorate([
  r()
], W3mTooltip.prototype, "variant", void 0);
W3mTooltip = __decorate([
  customElement("w3m-tooltip")
], W3mTooltip);
