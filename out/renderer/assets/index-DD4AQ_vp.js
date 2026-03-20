import { n as css, q as i, x, r as resetStyles, a as ChainController, a4 as TransactionsController, c as CoreHelperUtil, R as RouterController, O as OptionsController, b as EventsController, u as getPreferredAccountType, W as W3mFrameRpcConstants } from "./walletconnect-BVoLvI4P.js";
import { U as UiHelperUtil, n, r, c as customElement } from "./index-5878y4Sm.js";
import { cU as getDefaultExportFromCjs, e9 as dayjs } from "./index-73GArslZ.js";
import { r as relativeTime } from "./relativeTime-8MZMp0Re.js";
import "./index-Cm7UDlkl.js";
import "./index-Bz3_ZVag.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-SiM7Ib3-.js";
import "./index-xvpTmtDJ.js";
var en$1 = { exports: {} };
var en = en$1.exports;
var hasRequiredEn;
function requireEn() {
  if (hasRequiredEn) return en$1.exports;
  hasRequiredEn = 1;
  (function(module, exports) {
    !(function(e, n2) {
      module.exports = n2();
    })(en, (function() {
      return { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(e) {
        var n2 = ["th", "st", "nd", "rd"], t = e % 100;
        return "[" + e + (n2[(t - 20) % 10] || n2[t] || n2[0]) + "]";
      } };
    }));
  })(en$1);
  return en$1.exports;
}
var enExports = requireEn();
const englishLocale = /* @__PURE__ */ getDefaultExportFromCjs(enExports);
var updateLocale$2 = { exports: {} };
var updateLocale$1 = updateLocale$2.exports;
var hasRequiredUpdateLocale;
function requireUpdateLocale() {
  if (hasRequiredUpdateLocale) return updateLocale$2.exports;
  hasRequiredUpdateLocale = 1;
  (function(module, exports) {
    !(function(e, n2) {
      module.exports = n2();
    })(updateLocale$1, (function() {
      return function(e, n2, t) {
        t.updateLocale = function(e2, n3) {
          var o2 = t.Ls[e2];
          if (o2) return (n3 ? Object.keys(n3) : []).forEach((function(e3) {
            o2[e3] = n3[e3];
          })), o2;
        };
      };
    }));
  })(updateLocale$2);
  return updateLocale$2.exports;
}
var updateLocaleExports = requireUpdateLocale();
const updateLocale = /* @__PURE__ */ getDefaultExportFromCjs(updateLocaleExports);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
const localeObject = {
  ...englishLocale,
  name: "en-web3-modal",
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "%d sec",
    m: "1 min",
    mm: "%d min",
    h: "1 hr",
    hh: "%d hrs",
    d: "1 d",
    dd: "%d d",
    M: "1 mo",
    MM: "%d mo",
    y: "1 yr",
    yy: "%d yr"
  }
};
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
dayjs.locale("en-web3-modal", localeObject);
const DateUtil = {
  getMonthNameByIndex(monthIndex) {
    return MONTH_NAMES[monthIndex];
  },
  getYear(date = (/* @__PURE__ */ new Date()).toISOString()) {
    return dayjs(date).year();
  },
  getRelativeDateFromNow(date) {
    return dayjs(date).locale("en-web3-modal").fromNow(true);
  },
  formatDate(date, format = "DD MMM") {
    return dayjs(date).format(format);
  }
};
const FLOAT_FIXED_VALUE = 3;
const GAS_FEE_THRESHOLD = 0.1;
const plusTypes = ["receive", "deposit", "borrow", "claim"];
const minusTypes = ["withdraw", "repay", "burn"];
const TransactionUtil = {
  getTransactionGroupTitle(year, month) {
    const currentYear = DateUtil.getYear();
    const monthName = DateUtil.getMonthNameByIndex(month);
    const isCurrentYear = year === currentYear;
    const groupTitle = isCurrentYear ? monthName : `${monthName} ${year}`;
    return groupTitle;
  },
  getTransactionImages(transfers) {
    const [transfer] = transfers;
    const hasMultipleTransfers = transfers?.length > 1;
    if (hasMultipleTransfers) {
      return transfers.map((item) => this.getTransactionImage(item));
    }
    return [this.getTransactionImage(transfer)];
  },
  getTransactionImage(transfer) {
    return {
      type: TransactionUtil.getTransactionTransferTokenType(transfer),
      url: TransactionUtil.getTransactionImageURL(transfer)
    };
  },
  getTransactionImageURL(transfer) {
    let imageURL = void 0;
    const isNFT = Boolean(transfer?.nft_info);
    const isFungible = Boolean(transfer?.fungible_info);
    if (transfer && isNFT) {
      imageURL = transfer?.nft_info?.content?.preview?.url;
    } else if (transfer && isFungible) {
      imageURL = transfer?.fungible_info?.icon?.url;
    }
    return imageURL;
  },
  getTransactionTransferTokenType(transfer) {
    if (transfer?.fungible_info) {
      return "FUNGIBLE";
    } else if (transfer?.nft_info) {
      return "NFT";
    }
    return void 0;
  },
  getTransactionDescriptions(transaction, mergedTransfers) {
    const type = transaction?.metadata?.operationType;
    const transfers = mergedTransfers || transaction?.transfers;
    const hasTransfer = transfers && transfers.length > 0;
    const hasMultipleTransfers = transfers && transfers.length > 1;
    const isFungible = hasTransfer && transfers.every((transfer) => Boolean(transfer?.fungible_info));
    const [firstTransfer, secondTransfer] = transfers || [];
    let firstDescription = this.getTransferDescription(firstTransfer);
    let secondDescription = this.getTransferDescription(secondTransfer);
    if (!hasTransfer) {
      const isSendOrReceive = type === "send" || type === "receive";
      if (isSendOrReceive && isFungible) {
        firstDescription = UiHelperUtil.getTruncateString({
          string: transaction?.metadata.sentFrom,
          charsStart: 4,
          charsEnd: 6,
          truncate: "middle"
        });
        secondDescription = UiHelperUtil.getTruncateString({
          string: transaction?.metadata.sentTo,
          charsStart: 4,
          charsEnd: 6,
          truncate: "middle"
        });
        return [firstDescription, secondDescription];
      }
      return [transaction.metadata.status];
    }
    if (hasMultipleTransfers) {
      return transfers?.map((item) => this.getTransferDescription(item));
    }
    let prefix = "";
    if (plusTypes.includes(type)) {
      prefix = "+";
    } else if (minusTypes.includes(type)) {
      prefix = "-";
    }
    firstDescription = prefix.concat(firstDescription);
    return [firstDescription];
  },
  getTransferDescription(transfer) {
    let description = "";
    if (!transfer) {
      return description;
    }
    if (transfer?.nft_info) {
      description = transfer?.nft_info?.name || "-";
    } else if (transfer?.fungible_info) {
      description = this.getFungibleTransferDescription(transfer) || "-";
    }
    return description;
  },
  getFungibleTransferDescription(transfer) {
    if (!transfer) {
      return null;
    }
    const quantity = this.getQuantityFixedValue(transfer?.quantity.numeric);
    const description = [quantity, transfer?.fungible_info?.symbol].join(" ").trim();
    return description;
  },
  mergeTransfers(transfers) {
    if (transfers?.length <= 1) {
      return transfers;
    }
    const filteredTransfers = this.filterGasFeeTransfers(transfers);
    const mergedTransfers = filteredTransfers.reduce((acc, t) => {
      const name = t?.fungible_info?.name;
      const existingTransfer = acc.find(({ fungible_info, direction }) => name && name === fungible_info?.name && direction === t.direction);
      if (existingTransfer) {
        const quantity = Number(existingTransfer.quantity.numeric) + Number(t.quantity.numeric);
        existingTransfer.quantity.numeric = quantity.toString();
        existingTransfer.value = (existingTransfer.value || 0) + (t.value || 0);
      } else {
        acc.push(t);
      }
      return acc;
    }, []);
    let finalTransfers = mergedTransfers;
    if (mergedTransfers.length > 2) {
      finalTransfers = mergedTransfers.sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 2);
    }
    finalTransfers = finalTransfers.sort((a, b) => {
      if (a.direction === "out" && b.direction === "in") {
        return -1;
      }
      if (a.direction === "in" && b.direction === "out") {
        return 1;
      }
      return 0;
    });
    return finalTransfers;
  },
  filterGasFeeTransfers(transfers) {
    const tokenGroups = transfers?.reduce((groups, transfer) => {
      const tokenName = transfer?.fungible_info?.name;
      if (tokenName) {
        if (!groups[tokenName]) {
          groups[tokenName] = [];
        }
        groups[tokenName].push(transfer);
      }
      return groups;
    }, {});
    const filteredTransfers = [];
    Object.values(tokenGroups ?? {}).forEach((tokenTransfers) => {
      if (tokenTransfers.length === 1) {
        const firstTransfer = tokenTransfers[0];
        if (firstTransfer) {
          filteredTransfers.push(firstTransfer);
        }
      } else {
        const inTransfers = tokenTransfers.filter((t) => t.direction === "in");
        const outTransfers = tokenTransfers.filter((t) => t.direction === "out");
        if (inTransfers.length === 1 && outTransfers.length === 1) {
          const inTransfer = inTransfers[0];
          const outTransfer = outTransfers[0];
          let didApplyGasFeeFilter = false;
          if (inTransfer && outTransfer) {
            const inAmount = Number(inTransfer.quantity.numeric);
            const outAmount = Number(outTransfer.quantity.numeric);
            if (outAmount < inAmount * GAS_FEE_THRESHOLD) {
              filteredTransfers.push(inTransfer);
              didApplyGasFeeFilter = true;
            } else if (inAmount < outAmount * GAS_FEE_THRESHOLD) {
              filteredTransfers.push(outTransfer);
              didApplyGasFeeFilter = true;
            }
          }
          if (!didApplyGasFeeFilter) {
            filteredTransfers.push(...tokenTransfers);
          }
        } else {
          const significantTransfers = this.filterGasFeesFromTokenGroup(tokenTransfers);
          filteredTransfers.push(...significantTransfers);
        }
      }
    });
    transfers?.forEach((transfer) => {
      if (!transfer?.fungible_info?.name) {
        filteredTransfers.push(transfer);
      }
    });
    return filteredTransfers;
  },
  filterGasFeesFromTokenGroup(tokenTransfers) {
    if (tokenTransfers.length <= 1) {
      return tokenTransfers;
    }
    const amounts = tokenTransfers?.map((t) => Number(t.quantity.numeric));
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const extremeGasThreshold = 0.01;
    if (minAmount < maxAmount * extremeGasThreshold) {
      const filtered = tokenTransfers?.filter((t) => {
        const amount = Number(t.quantity.numeric);
        return amount >= maxAmount * extremeGasThreshold;
      });
      return filtered;
    }
    const inTransfers = tokenTransfers?.filter((t) => t.direction === "in");
    const outTransfers = tokenTransfers?.filter((t) => t.direction === "out");
    if (inTransfers.length === 1 && outTransfers.length === 1) {
      const inTransfer = inTransfers[0];
      const outTransfer = outTransfers[0];
      if (inTransfer && outTransfer) {
        const inAmount = Number(inTransfer.quantity.numeric);
        const outAmount = Number(outTransfer.quantity.numeric);
        if (outAmount < inAmount * GAS_FEE_THRESHOLD) {
          return [inTransfer];
        } else if (inAmount < outAmount * GAS_FEE_THRESHOLD) {
          return [outTransfer];
        }
      }
    }
    return tokenTransfers;
  },
  getQuantityFixedValue(value) {
    if (!value) {
      return null;
    }
    const parsedValue = parseFloat(value);
    return parsedValue.toFixed(FLOAT_FIXED_VALUE);
  }
};
var TransactionTypePastTense;
(function(TransactionTypePastTense2) {
  TransactionTypePastTense2["approve"] = "approved";
  TransactionTypePastTense2["bought"] = "bought";
  TransactionTypePastTense2["borrow"] = "borrowed";
  TransactionTypePastTense2["burn"] = "burnt";
  TransactionTypePastTense2["cancel"] = "canceled";
  TransactionTypePastTense2["claim"] = "claimed";
  TransactionTypePastTense2["deploy"] = "deployed";
  TransactionTypePastTense2["deposit"] = "deposited";
  TransactionTypePastTense2["execute"] = "executed";
  TransactionTypePastTense2["mint"] = "minted";
  TransactionTypePastTense2["receive"] = "received";
  TransactionTypePastTense2["repay"] = "repaid";
  TransactionTypePastTense2["send"] = "sent";
  TransactionTypePastTense2["sell"] = "sold";
  TransactionTypePastTense2["stake"] = "staked";
  TransactionTypePastTense2["trade"] = "swapped";
  TransactionTypePastTense2["unstake"] = "unstaked";
  TransactionTypePastTense2["withdraw"] = "withdrawn";
})(TransactionTypePastTense || (TransactionTypePastTense = {}));
const styles$4 = css`
  :host > wui-flex {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 40px;
    height: 40px;
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  :host([data-no-images='true']) > wui-flex {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[3]} !important;
  }

  :host > wui-flex wui-image {
    display: block;
  }

  :host > wui-flex,
  :host > wui-flex wui-image,
  .swap-images-container,
  .swap-images-container.nft,
  wui-image.nft {
    border-top-left-radius: var(--local-left-border-radius);
    border-top-right-radius: var(--local-right-border-radius);
    border-bottom-left-radius: var(--local-left-border-radius);
    border-bottom-right-radius: var(--local-right-border-radius);
  }

  .swap-images-container {
    position: relative;
    width: 40px;
    height: 40px;
    overflow: hidden;
  }

  .swap-images-container wui-image:first-child {
    position: absolute;
    width: 40px;
    height: 40px;
    top: 0;
    left: 0%;
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-images-container wui-image:last-child {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  .swap-fallback-container {
    position: absolute;
    inset: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .swap-fallback-container.first {
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-fallback-container.last {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  wui-flex.status-box {
    position: absolute;
    right: 0;
    bottom: 0;
    transform: translate(20%, 20%);
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.theme.backgroundPrimary};
    overflow: hidden;
    width: 16px;
    height: 16px;
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTransactionVisual = class WuiTransactionVisual2 extends i {
  constructor() {
    super(...arguments);
    this.images = [];
    this.secondImage = {
      type: void 0,
      url: ""
    };
    this.failedImageUrls = /* @__PURE__ */ new Set();
  }
  handleImageError(url) {
    return (event) => {
      event.stopPropagation();
      this.failedImageUrls.add(url);
      this.requestUpdate();
    };
  }
  render() {
    const [firstImage, secondImage] = this.images;
    if (!this.images.length) {
      this.dataset["noImages"] = "true";
    }
    const isLeftNFT = firstImage?.type === "NFT";
    const isRightNFT = secondImage?.url ? secondImage.type === "NFT" : isLeftNFT;
    const leftRadius = isLeftNFT ? "var(--apkt-borderRadius-3)" : "var(--apkt-borderRadius-5)";
    const rightRadius = isRightNFT ? "var(--apkt-borderRadius-3)" : "var(--apkt-borderRadius-5)";
    this.style.cssText = `
    --local-left-border-radius: ${leftRadius};
    --local-right-border-radius: ${rightRadius};
    `;
    return x`<wui-flex> ${this.templateVisual()} ${this.templateIcon()} </wui-flex>`;
  }
  templateVisual() {
    const [firstImage, secondImage] = this.images;
    const hasTwoImages = this.images.length === 2;
    if (hasTwoImages && (firstImage?.url || secondImage?.url)) {
      return this.renderSwapImages(firstImage, secondImage);
    }
    if (firstImage?.url && !this.failedImageUrls.has(firstImage.url)) {
      return this.renderSingleImage(firstImage);
    }
    if (firstImage?.type === "NFT") {
      return this.renderPlaceholderIcon("nftPlaceholder");
    }
    return this.renderPlaceholderIcon("coinPlaceholder");
  }
  renderSwapImages(firstImage, secondImage) {
    return x`<div class="swap-images-container">
      ${firstImage?.url ? this.renderImageOrFallback(firstImage, "first", true) : null}
      ${secondImage?.url ? this.renderImageOrFallback(secondImage, "last", true) : null}
    </div>`;
  }
  renderSingleImage(image) {
    return this.renderImageOrFallback(image, void 0, false);
  }
  renderImageOrFallback(image, position, isInSwapContainer = false) {
    if (!image.url) {
      return null;
    }
    if (this.failedImageUrls.has(image.url)) {
      if (isInSwapContainer && position) {
        return this.renderFallbackIconInContainer(position);
      }
      return this.renderFallbackIcon();
    }
    return x`<wui-image
      src=${image.url}
      alt="Transaction image"
      @onLoadError=${this.handleImageError(image.url)}
    ></wui-image>`;
  }
  renderFallbackIconInContainer(position) {
    return x`<div class="swap-fallback-container ${position}">${this.renderFallbackIcon()}</div>`;
  }
  renderFallbackIcon() {
    return x`<wui-icon
      size="xl"
      weight="regular"
      color="default"
      name="networkPlaceholder"
    ></wui-icon>`;
  }
  renderPlaceholderIcon(iconName) {
    return x`<wui-icon size="xl" weight="regular" color="default" name=${iconName}></wui-icon>`;
  }
  templateIcon() {
    let color = "accent-primary";
    let icon = void 0;
    icon = this.getIcon();
    if (this.status) {
      color = this.getStatusColor();
    }
    if (!icon) {
      return null;
    }
    return x`
      <wui-flex alignItems="center" justifyContent="center" class="status-box">
        <wui-icon-box size="sm" color=${color} icon=${icon}></wui-icon-box>
      </wui-flex>
    `;
  }
  getDirectionIcon() {
    switch (this.direction) {
      case "in":
        return "arrowBottom";
      case "out":
        return "arrowTop";
      default:
        return void 0;
    }
  }
  getIcon() {
    if (this.onlyDirectionIcon) {
      return this.getDirectionIcon();
    }
    if (this.type === "trade") {
      return "swapHorizontal";
    } else if (this.type === "approve") {
      return "checkmark";
    } else if (this.type === "cancel") {
      return "close";
    }
    return this.getDirectionIcon();
  }
  getStatusColor() {
    switch (this.status) {
      case "confirmed":
        return "success";
      case "failed":
        return "error";
      case "pending":
        return "inverse";
      default:
        return "accent-primary";
    }
  }
};
WuiTransactionVisual.styles = [styles$4];
__decorate$4([
  n()
], WuiTransactionVisual.prototype, "type", void 0);
__decorate$4([
  n()
], WuiTransactionVisual.prototype, "status", void 0);
__decorate$4([
  n()
], WuiTransactionVisual.prototype, "direction", void 0);
__decorate$4([
  n({ type: Boolean })
], WuiTransactionVisual.prototype, "onlyDirectionIcon", void 0);
__decorate$4([
  n({ type: Array })
], WuiTransactionVisual.prototype, "images", void 0);
__decorate$4([
  n({ type: Object })
], WuiTransactionVisual.prototype, "secondImage", void 0);
__decorate$4([
  r()
], WuiTransactionVisual.prototype, "failedImageUrls", void 0);
WuiTransactionVisual = __decorate$4([
  customElement("wui-transaction-visual")
], WuiTransactionVisual);
const styles$3 = css`
  :host {
    width: 100%;
  }

  :host > wui-flex:first-child {
    align-items: center;
    column-gap: ${({ spacing }) => spacing[2]};
    padding: ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[2]};
    width: 100%;
  }

  :host > wui-flex:first-child wui-text:nth-child(1) {
    text-transform: capitalize;
  }

  wui-transaction-visual {
    width: 40px;
    height: 40px;
  }

  wui-flex {
    flex: 1;
  }

  :host wui-flex wui-flex {
    overflow: hidden;
  }

  :host .description-container wui-text span {
    word-break: break-all;
  }

  :host .description-container wui-text {
    overflow: hidden;
  }

  :host .description-separator-icon {
    margin: 0px 6px;
  }

  :host wui-text > span {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTransactionListItem = class WuiTransactionListItem2 extends i {
  constructor() {
    super(...arguments);
    this.type = "approve";
    this.onlyDirectionIcon = false;
    this.images = [];
  }
  render() {
    return x`
      <wui-flex>
        <wui-transaction-visual
          .status=${this.status}
          direction=${o(this.direction)}
          type=${this.type}
          .onlyDirectionIcon=${this.onlyDirectionIcon}
          .images=${this.images}
        ></wui-transaction-visual>
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="lg-medium" color="primary">
            ${TransactionTypePastTense[this.type] || this.type}
          </wui-text>
          <wui-flex class="description-container">
            ${this.templateDescription()} ${this.templateSecondDescription()}
          </wui-flex>
        </wui-flex>
        <wui-text variant="sm-medium" color="secondary"><span>${this.date}</span></wui-text>
      </wui-flex>
    `;
  }
  templateDescription() {
    const description = this.descriptions?.[0];
    return description ? x`
          <wui-text variant="md-regular" color="secondary">
            <span>${description}</span>
          </wui-text>
        ` : null;
  }
  templateSecondDescription() {
    const description = this.descriptions?.[1];
    return description ? x`
          <wui-icon class="description-separator-icon" size="sm" name="arrowRight"></wui-icon>
          <wui-text variant="md-regular" color="secondary">
            <span>${description}</span>
          </wui-text>
        ` : null;
  }
};
WuiTransactionListItem.styles = [resetStyles, styles$3];
__decorate$3([
  n()
], WuiTransactionListItem.prototype, "type", void 0);
__decorate$3([
  n({ type: Array })
], WuiTransactionListItem.prototype, "descriptions", void 0);
__decorate$3([
  n()
], WuiTransactionListItem.prototype, "date", void 0);
__decorate$3([
  n({ type: Boolean })
], WuiTransactionListItem.prototype, "onlyDirectionIcon", void 0);
__decorate$3([
  n()
], WuiTransactionListItem.prototype, "status", void 0);
__decorate$3([
  n()
], WuiTransactionListItem.prototype, "direction", void 0);
__decorate$3([
  n({ type: Array })
], WuiTransactionListItem.prototype, "images", void 0);
WuiTransactionListItem = __decorate$3([
  customElement("wui-transaction-list-item")
], WuiTransactionListItem);
const styles$2 = css`
  wui-flex {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius[128]};
  }

  .fallback-icon {
    color: ${({ tokens }) => tokens.theme.iconInverse};
    border-radius: ${({ borderRadius }) => borderRadius[3]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .direction-icon,
  .status-image {
    position: absolute;
    right: 0;
    bottom: 0;
    border-radius: ${({ borderRadius }) => borderRadius[128]};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  .direction-icon {
    padding: ${({ spacing }) => spacing["01"]};
    color: ${({ tokens }) => tokens.core.iconSuccess};

    background-color: color-mix(
      in srgb,
      ${({ tokens }) => tokens.core.textSuccess} 30%,
      ${({ tokens }) => tokens.theme.backgroundPrimary} 70%
    );
  }

  /* -- Sizes --------------------------------------------------- */
  :host([data-size='sm']) > wui-image:not(.status-image),
  :host([data-size='sm']) > wui-flex {
    width: 24px;
    height: 24px;
  }

  :host([data-size='lg']) > wui-image:not(.status-image),
  :host([data-size='lg']) > wui-flex {
    width: 40px;
    height: 40px;
  }

  :host([data-size='sm']) .fallback-icon {
    height: 16px;
    width: 16px;
    padding: ${({ spacing }) => spacing[1]};
  }

  :host([data-size='lg']) .fallback-icon {
    height: 32px;
    width: 32px;
    padding: ${({ spacing }) => spacing[1]};
  }

  :host([data-size='sm']) .direction-icon,
  :host([data-size='sm']) .status-image {
    transform: translate(40%, 30%);
  }

  :host([data-size='lg']) .direction-icon,
  :host([data-size='lg']) .status-image {
    transform: translate(40%, 10%);
  }

  :host([data-size='sm']) .status-image {
    height: 14px;
    width: 14px;
  }

  :host([data-size='lg']) .status-image {
    height: 20px;
    width: 20px;
  }

  /* -- Crop effects --------------------------------------------------- */
  .swap-crop-left-image,
  .swap-crop-right-image {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .swap-crop-left-image {
    left: 0;
    clip-path: inset(0px calc(50% + 1.5px) 0px 0%);
  }

  .swap-crop-right-image {
    right: 0;
    clip-path: inset(0px 0px 0px calc(50% + 1.5px));
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const ICON_SIZE = {
  sm: "xxs",
  lg: "md"
};
let WuiTransactionThumbnail = class WuiTransactionThumbnail2 extends i {
  constructor() {
    super(...arguments);
    this.type = "approve";
    this.size = "lg";
    this.statusImageUrl = "";
    this.images = [];
  }
  render() {
    return x`<wui-flex>${this.templateVisual()} ${this.templateIcon()}</wui-flex>`;
  }
  templateVisual() {
    this.dataset["size"] = this.size;
    switch (this.type) {
      case "trade":
        return this.swapTemplate();
      case "fiat":
        return this.fiatTemplate();
      case "unknown":
        return this.unknownTemplate();
      default:
        return this.tokenTemplate();
    }
  }
  swapTemplate() {
    const [firstImageUrl, secondImageUrl] = this.images;
    const twoImages = this.images.length === 2 && (firstImageUrl || secondImageUrl);
    if (twoImages) {
      return x`
        <wui-image class="swap-crop-left-image" src=${firstImageUrl} alt="Swap image"></wui-image>
        <wui-image class="swap-crop-right-image" src=${secondImageUrl} alt="Swap image"></wui-image>
      `;
    }
    if (firstImageUrl) {
      return x`<wui-image src=${firstImageUrl} alt="Swap image"></wui-image>`;
    }
    return null;
  }
  fiatTemplate() {
    return x`<wui-icon
      class="fallback-icon"
      size=${ICON_SIZE[this.size]}
      name="dollar"
    ></wui-icon>`;
  }
  unknownTemplate() {
    return x`<wui-icon
      class="fallback-icon"
      size=${ICON_SIZE[this.size]}
      name="questionMark"
    ></wui-icon>`;
  }
  tokenTemplate() {
    const [imageUrl] = this.images;
    if (imageUrl) {
      return x`<wui-image src=${imageUrl} alt="Token image"></wui-image> `;
    }
    return x`<wui-icon
      class="fallback-icon"
      name=${this.type === "nft" ? "image" : "coinPlaceholder"}
    ></wui-icon>`;
  }
  templateIcon() {
    if (this.statusImageUrl) {
      return x`<wui-image
        class="status-image"
        src=${this.statusImageUrl}
        alt="Status image"
      ></wui-image>`;
    }
    return x`<wui-icon
      class="direction-icon"
      size=${ICON_SIZE[this.size]}
      name=${this.getTemplateIcon()}
    ></wui-icon>`;
  }
  getTemplateIcon() {
    if (this.type === "trade") {
      return "arrowClockWise";
    }
    return "arrowBottom";
  }
};
WuiTransactionThumbnail.styles = [styles$2];
__decorate$2([
  n()
], WuiTransactionThumbnail.prototype, "type", void 0);
__decorate$2([
  n()
], WuiTransactionThumbnail.prototype, "size", void 0);
__decorate$2([
  n()
], WuiTransactionThumbnail.prototype, "statusImageUrl", void 0);
__decorate$2([
  n({ type: Array })
], WuiTransactionThumbnail.prototype, "images", void 0);
WuiTransactionThumbnail = __decorate$2([
  customElement("wui-transaction-thumbnail")
], WuiTransactionThumbnail);
const styles$1 = css`
  :host > wui-flex:first-child {
    gap: ${({ spacing }) => spacing[2]};
    padding: ${({ spacing }) => spacing[3]};
    width: 100%;
  }

  wui-flex {
    display: flex;
    flex: 1;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTransactionListItemLoader = class WuiTransactionListItemLoader2 extends i {
  render() {
    return x`
      <wui-flex alignItems="center" .padding=${["1", "2", "1", "2"]}>
        <wui-shimmer width="40px" height="40px" rounded></wui-shimmer>
        <wui-flex flexDirection="column" gap="1">
          <wui-shimmer width="124px" height="16px" rounded></wui-shimmer>
          <wui-shimmer width="60px" height="14px" rounded></wui-shimmer>
        </wui-flex>
        <wui-shimmer width="24px" height="12px" rounded></wui-shimmer>
      </wui-flex>
    `;
  }
};
WuiTransactionListItemLoader.styles = [resetStyles, styles$1];
WuiTransactionListItemLoader = __decorate$1([
  customElement("wui-transaction-list-item-loader")
], WuiTransactionListItemLoader);
const styles = css`
  :host {
    min-height: 100%;
  }

  .group-container[last-group='true'] {
    padding-bottom: ${({ spacing }) => spacing["3"]};
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }

  .emptyContainer {
    height: 100%;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const PAGINATOR_ID = "last-transaction";
const LOADING_ITEM_COUNT = 7;
let W3mActivityList = class W3mActivityList2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.paginationObserver = void 0;
    this.page = "activity";
    this.caipAddress = ChainController.state.activeCaipAddress;
    this.transactionsByYear = TransactionsController.state.transactionsByYear;
    this.loading = TransactionsController.state.loading;
    this.empty = TransactionsController.state.empty;
    this.next = TransactionsController.state.next;
    TransactionsController.clearCursor();
    this.unsubscribe.push(...[
      ChainController.subscribeKey("activeCaipAddress", (val) => {
        if (val) {
          if (this.caipAddress !== val) {
            TransactionsController.resetTransactions();
            TransactionsController.fetchTransactions(val);
          }
        }
        this.caipAddress = val;
      }),
      ChainController.subscribeKey("activeCaipNetwork", () => {
        this.updateTransactionView();
      }),
      TransactionsController.subscribe((val) => {
        this.transactionsByYear = val.transactionsByYear;
        this.loading = val.loading;
        this.empty = val.empty;
        this.next = val.next;
      })
    ]);
  }
  firstUpdated() {
    this.updateTransactionView();
    this.createPaginationObserver();
  }
  updated() {
    this.setPaginationObserver();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x` ${this.empty ? null : this.templateTransactionsByYear()}
    ${this.loading ? this.templateLoading() : null}
    ${!this.loading && this.empty ? this.templateEmpty() : null}`;
  }
  updateTransactionView() {
    TransactionsController.resetTransactions();
    if (this.caipAddress) {
      TransactionsController.fetchTransactions(CoreHelperUtil.getPlainAddress(this.caipAddress));
    }
  }
  templateTransactionsByYear() {
    const sortedYearKeys = Object.keys(this.transactionsByYear).sort().reverse();
    return sortedYearKeys.map((year) => {
      const yearInt = parseInt(year, 10);
      const sortedMonthIndexes = new Array(12).fill(null).map((_, idx) => {
        const groupTitle = TransactionUtil.getTransactionGroupTitle(yearInt, idx);
        const transactions = this.transactionsByYear[yearInt]?.[idx];
        return {
          groupTitle,
          transactions
        };
      }).filter(({ transactions }) => transactions).reverse();
      return sortedMonthIndexes.map(({ groupTitle, transactions }, index) => {
        const isLastGroup = index === sortedMonthIndexes.length - 1;
        if (!transactions) {
          return null;
        }
        return x`
          <wui-flex
            flexDirection="column"
            class="group-container"
            last-group="${isLastGroup ? "true" : "false"}"
            data-testid="month-indexes"
          >
            <wui-flex
              alignItems="center"
              flexDirection="row"
              .padding=${["2", "3", "3", "3"]}
            >
              <wui-text variant="md-medium" color="secondary" data-testid="group-title">
                ${groupTitle}
              </wui-text>
            </wui-flex>
            <wui-flex flexDirection="column" gap="2">
              ${this.templateTransactions(transactions, isLastGroup)}
            </wui-flex>
          </wui-flex>
        `;
      });
    });
  }
  templateRenderTransaction(transaction, isLastTransaction) {
    const { date, descriptions, direction, images, status, type, transfers, isAllNFT } = this.getTransactionListItemProps(transaction);
    return x`
      <wui-transaction-list-item
        date=${date}
        .direction=${direction}
        id=${isLastTransaction && this.next ? PAGINATOR_ID : ""}
        status=${status}
        type=${type}
        .images=${images}
        .onlyDirectionIcon=${isAllNFT || transfers.length === 1}
        .descriptions=${descriptions}
      ></wui-transaction-list-item>
    `;
  }
  templateTransactions(transactions, isLastGroup) {
    return transactions.map((transaction, index) => {
      const isLastTransaction = isLastGroup && index === transactions.length - 1;
      return x`${this.templateRenderTransaction(transaction, isLastTransaction)}`;
    });
  }
  emptyStateActivity() {
    return x`<wui-flex
      class="emptyContainer"
      flexGrow="1"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      .padding=${["10", "5", "10", "5"]}
      gap="5"
      data-testid="empty-activity-state"
    >
      <wui-icon-box color="default" icon="wallet" size="xl"></wui-icon-box>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="lg-medium" color="primary">No Transactions yet</wui-text>
        <wui-text align="center" variant="lg-regular" color="secondary"
          >Start trading on dApps <br />
          to grow your wallet!</wui-text
        >
      </wui-flex>
    </wui-flex>`;
  }
  emptyStateAccount() {
    return x`<wui-flex
      class="contentContainer"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap="4"
      data-testid="empty-account-state"
    >
      <wui-icon-box icon="swapHorizontal" size="lg" color="default"></wui-icon-box>
      <wui-flex
        class="textContent"
        gap="2"
        flexDirection="column"
        justifyContent="center"
        flexDirection="column"
      >
        <wui-text variant="md-regular" align="center" color="primary">No activity yet</wui-text>
        <wui-text variant="sm-regular" align="center" color="secondary"
          >Your next transactions will appear here</wui-text
        >
      </wui-flex>
      <wui-link @click=${this.onReceiveClick.bind(this)}>Trade</wui-link>
    </wui-flex>`;
  }
  templateEmpty() {
    if (this.page === "account") {
      return x`${this.emptyStateAccount()}`;
    }
    return x`${this.emptyStateActivity()}`;
  }
  templateLoading() {
    if (this.page === "activity") {
      return x` <wui-flex flexDirection="column" width="100%">
        <wui-flex .padding=${["2", "3", "3", "3"]}>
          <wui-shimmer width="70px" height="16px" rounded></wui-shimmer>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2" width="100%">
          ${Array(LOADING_ITEM_COUNT).fill(x` <wui-transaction-list-item-loader></wui-transaction-list-item-loader> `).map((item) => item)}
        </wui-flex>
      </wui-flex>`;
    }
    return null;
  }
  onReceiveClick() {
    RouterController.push("WalletReceive");
  }
  createPaginationObserver() {
    const { projectId } = OptionsController.state;
    this.paginationObserver = new IntersectionObserver(([element]) => {
      if (element?.isIntersecting && !this.loading) {
        TransactionsController.fetchTransactions(CoreHelperUtil.getPlainAddress(this.caipAddress));
        EventsController.sendEvent({
          type: "track",
          event: "LOAD_MORE_TRANSACTIONS",
          properties: {
            address: CoreHelperUtil.getPlainAddress(this.caipAddress),
            projectId,
            cursor: this.next,
            isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
          }
        });
      }
    }, {});
    this.setPaginationObserver();
  }
  setPaginationObserver() {
    this.paginationObserver?.disconnect();
    const lastItem = this.shadowRoot?.querySelector(`#${PAGINATOR_ID}`);
    if (lastItem) {
      this.paginationObserver?.observe(lastItem);
    }
  }
  getTransactionListItemProps(transaction) {
    const date = DateUtil.formatDate(transaction?.metadata?.minedAt);
    const transfers = TransactionUtil.mergeTransfers(transaction?.transfers || []);
    const descriptions = TransactionUtil.getTransactionDescriptions(transaction, transfers);
    const transfer = transfers?.[0];
    const isAllNFT = Boolean(transfer) && transfers?.every((item) => Boolean(item.nft_info));
    const images = TransactionUtil.getTransactionImages(transfers);
    return {
      date,
      direction: transfer?.direction,
      descriptions,
      isAllNFT,
      images,
      status: transaction.metadata?.status,
      transfers,
      type: transaction.metadata?.operationType
    };
  }
};
W3mActivityList.styles = styles;
__decorate([
  n()
], W3mActivityList.prototype, "page", void 0);
__decorate([
  r()
], W3mActivityList.prototype, "caipAddress", void 0);
__decorate([
  r()
], W3mActivityList.prototype, "transactionsByYear", void 0);
__decorate([
  r()
], W3mActivityList.prototype, "loading", void 0);
__decorate([
  r()
], W3mActivityList.prototype, "empty", void 0);
__decorate([
  r()
], W3mActivityList.prototype, "next", void 0);
W3mActivityList = __decorate([
  customElement("w3m-activity-list")
], W3mActivityList);
