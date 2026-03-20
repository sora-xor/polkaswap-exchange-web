import { n as css, r as resetStyles, o as elementStyles, q as i, x, C as ConstantsUtil, a8 as ProviderController, m as ConnectionController, a9 as ContractUtil, aa as ParseUtil, c as CoreHelperUtil, ab as FetchUtil, ac as HelpersUtil, O as OptionsController, N as NumberUtil, ad as getNativeTokenAddress, a as ChainController, p as proxy, G as AssetUtil, b as EventsController, S as SnackController, D as BalanceUtil, M as ModalController, s as subscribeKey, k as subscribe, l as ConnectorController, R as RouterController, v as vars, t as i$1 } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r, U as UiHelperUtil, b as e } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-Bag94m_F.js";
import "./index-W8RzVVH7.js";
import "./index-SiM7Ib3-.js";
import "./index-B80WMNJI.js";
import "./index-DAKl5XGv.js";
import "./index-FTJ7N_Mw.js";
import "./index-B9aMMm-V.js";
import "./index-Cztg-IpD.js";
import "./index-xvpTmtDJ.js";
import { M as MathUtil } from "./MathUtil-BspOY7Kj.js";
const styles$9 = css`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({ spacing }) => spacing[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({ tokens }) => tokens.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({ tokens }) => tokens.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({ tokens }) => tokens.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({ tokens }) => tokens.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({ tokens }) => tokens.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
var __decorate$9 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiIconButton = class WuiIconButton2 extends i {
  constructor() {
    super(...arguments);
    this.icon = "card";
    this.variant = "primary";
    this.type = "accent";
    this.size = "md";
    this.iconSize = void 0;
    this.fullWidth = false;
    this.disabled = false;
  }
  render() {
    return x`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${o(this.iconSize)}></wui-icon>
    </button>`;
  }
};
WuiIconButton.styles = [resetStyles, elementStyles, styles$9];
__decorate$9([
  n()
], WuiIconButton.prototype, "icon", void 0);
__decorate$9([
  n()
], WuiIconButton.prototype, "variant", void 0);
__decorate$9([
  n()
], WuiIconButton.prototype, "type", void 0);
__decorate$9([
  n()
], WuiIconButton.prototype, "size", void 0);
__decorate$9([
  n()
], WuiIconButton.prototype, "iconSize", void 0);
__decorate$9([
  n({ type: Boolean })
], WuiIconButton.prototype, "fullWidth", void 0);
__decorate$9([
  n({ type: Boolean })
], WuiIconButton.prototype, "disabled", void 0);
WuiIconButton = __decorate$9([
  customElement("wui-icon-button")
], WuiIconButton);
const AppKitPayErrorCodes = {
  INVALID_PAYMENT_CONFIG: "INVALID_PAYMENT_CONFIG",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  INVALID_ASSET: "INVALID_ASSET",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  UNABLE_TO_INITIATE_PAYMENT: "UNABLE_TO_INITIATE_PAYMENT",
  INVALID_CHAIN_NAMESPACE: "INVALID_CHAIN_NAMESPACE",
  GENERIC_PAYMENT_ERROR: "GENERIC_PAYMENT_ERROR",
  UNABLE_TO_GET_EXCHANGES: "UNABLE_TO_GET_EXCHANGES",
  ASSET_NOT_SUPPORTED: "ASSET_NOT_SUPPORTED",
  UNABLE_TO_GET_PAY_URL: "UNABLE_TO_GET_PAY_URL",
  UNABLE_TO_GET_BUY_STATUS: "UNABLE_TO_GET_BUY_STATUS",
  UNABLE_TO_GET_TOKEN_BALANCES: "UNABLE_TO_GET_TOKEN_BALANCES",
  UNABLE_TO_GET_QUOTE: "UNABLE_TO_GET_QUOTE",
  UNABLE_TO_GET_QUOTE_STATUS: "UNABLE_TO_GET_QUOTE_STATUS",
  INVALID_RECIPIENT_ADDRESS_FOR_ASSET: "INVALID_RECIPIENT_ADDRESS_FOR_ASSET"
};
const AppKitPayErrorMessages = {
  [AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG]: "Invalid payment configuration",
  [AppKitPayErrorCodes.INVALID_RECIPIENT]: "Invalid recipient address",
  [AppKitPayErrorCodes.INVALID_ASSET]: "Invalid asset specified",
  [AppKitPayErrorCodes.INVALID_AMOUNT]: "Invalid payment amount",
  [AppKitPayErrorCodes.INVALID_RECIPIENT_ADDRESS_FOR_ASSET]: "Invalid recipient address for the asset selected",
  [AppKitPayErrorCodes.UNKNOWN_ERROR]: "Unknown payment error occurred",
  [AppKitPayErrorCodes.UNABLE_TO_INITIATE_PAYMENT]: "Unable to initiate payment",
  [AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE]: "Invalid chain namespace",
  [AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR]: "Unable to process payment",
  [AppKitPayErrorCodes.UNABLE_TO_GET_EXCHANGES]: "Unable to get exchanges",
  [AppKitPayErrorCodes.ASSET_NOT_SUPPORTED]: "Asset not supported by the selected exchange",
  [AppKitPayErrorCodes.UNABLE_TO_GET_PAY_URL]: "Unable to get payment URL",
  [AppKitPayErrorCodes.UNABLE_TO_GET_BUY_STATUS]: "Unable to get buy status",
  [AppKitPayErrorCodes.UNABLE_TO_GET_TOKEN_BALANCES]: "Unable to get token balances",
  [AppKitPayErrorCodes.UNABLE_TO_GET_QUOTE]: "Unable to get quote. Please choose a different token",
  [AppKitPayErrorCodes.UNABLE_TO_GET_QUOTE_STATUS]: "Unable to get quote status"
};
class AppKitPayError extends Error {
  get message() {
    return AppKitPayErrorMessages[this.code];
  }
  constructor(code, details) {
    super(AppKitPayErrorMessages[code]);
    this.name = "AppKitPayError";
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppKitPayError);
    }
  }
}
const API_URL = "https://rpc.walletconnect.org/v1/json-rpc";
const REOWN_TEST_EXCHANGE_ID = "reown_test";
function ensureCorrectAddress() {
  const { chainNamespace } = ParseUtil.parseCaipNetworkId(PayController.state.paymentAsset.network);
  const isAddress = CoreHelperUtil.isAddress(PayController.state.recipient, chainNamespace);
  if (!isAddress) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_RECIPIENT_ADDRESS_FOR_ASSET, `Provide valid recipient address for namespace "${chainNamespace}"`);
  }
}
async function processEvmNativePayment(paymentAsset, chainNamespace, params) {
  if (chainNamespace !== ConstantsUtil.CHAIN.EVM) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE);
  }
  if (!params.fromAddress) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, "fromAddress is required for native EVM payments.");
  }
  const amountValue = typeof params.amount === "string" ? parseFloat(params.amount) : params.amount;
  if (isNaN(amountValue)) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG);
  }
  const decimals = paymentAsset.metadata?.decimals ?? 18;
  const amountBigInt = ConnectionController.parseUnits(amountValue.toString(), decimals);
  if (typeof amountBigInt !== "bigint") {
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR);
  }
  const txResponse = await ConnectionController.sendTransaction({
    chainNamespace,
    to: params.recipient,
    address: params.fromAddress,
    value: amountBigInt,
    data: "0x"
  });
  return txResponse ?? void 0;
}
async function processEvmErc20Payment(paymentAsset, params) {
  if (!params.fromAddress) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, "fromAddress is required for ERC20 EVM payments.");
  }
  const tokenAddress = paymentAsset.asset;
  const recipientAddress = params.recipient;
  const decimals = Number(paymentAsset.metadata.decimals);
  const amountBigInt = ConnectionController.parseUnits(params.amount.toString(), decimals);
  if (amountBigInt === void 0) {
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR);
  }
  const txResponse = await ConnectionController.writeContract({
    fromAddress: params.fromAddress,
    tokenAddress,
    args: [recipientAddress, amountBigInt],
    method: "transfer",
    abi: ContractUtil.getERC20Abi(tokenAddress),
    chainNamespace: ConstantsUtil.CHAIN.EVM
  });
  return txResponse ?? void 0;
}
async function processSolanaPayment(chainNamespace, params) {
  if (chainNamespace !== ConstantsUtil.CHAIN.SOLANA) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE);
  }
  if (!params.fromAddress) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, "fromAddress is required for Solana payments.");
  }
  const amountValue = typeof params.amount === "string" ? parseFloat(params.amount) : params.amount;
  if (isNaN(amountValue) || amountValue <= 0) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, "Invalid payment amount.");
  }
  try {
    const provider = ProviderController.getProvider(chainNamespace);
    if (!provider) {
      throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, "No Solana provider available.");
    }
    const txResponse = await ConnectionController.sendTransaction({
      chainNamespace: ConstantsUtil.CHAIN.SOLANA,
      to: params.recipient,
      value: amountValue,
      tokenMint: params.tokenMint
    });
    if (!txResponse) {
      throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, "Transaction failed.");
    }
    return txResponse;
  } catch (error) {
    if (error instanceof AppKitPayError) {
      throw error;
    }
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, `Solana payment failed: ${error}`);
  }
}
async function getDirectTransferQuote({ sourceToken, toToken, amount, recipient }) {
  const originalAmount = ConnectionController.parseUnits(amount, sourceToken.metadata.decimals);
  const destinationAmount = ConnectionController.parseUnits(amount, toToken.metadata.decimals);
  return Promise.resolve({
    type: DIRECT_TRANSFER_REQUEST_ID,
    origin: {
      amount: originalAmount?.toString() ?? "0",
      currency: sourceToken
    },
    destination: {
      amount: destinationAmount?.toString() ?? "0",
      currency: toToken
    },
    fees: [
      {
        id: "service",
        label: "Service Fee",
        amount: "0",
        currency: toToken
      }
    ],
    steps: [
      {
        requestId: DIRECT_TRANSFER_REQUEST_ID,
        type: "deposit",
        deposit: {
          amount: originalAmount?.toString() ?? "0",
          currency: sourceToken.asset,
          receiver: recipient
        }
      }
    ],
    timeInSeconds: 6
  });
}
function getTransferStep(quote) {
  if (!quote) {
    return null;
  }
  const step = quote.steps[0];
  if (!step || step.type !== DIRECT_TRANSFER_DEPOSIT_TYPE) {
    return null;
  }
  return step;
}
function getTransactionsSteps(quote, completedTransactionsCount = 0) {
  if (!quote) {
    return [];
  }
  const steps = quote.steps.filter((step) => step.type === DIRECT_TRANSFER_TRANSACTION_TYPE);
  const stepsToShow = steps.filter((_, idx) => {
    const incrementedIdx = idx + 1;
    return incrementedIdx > completedTransactionsCount;
  });
  return steps.length > 0 && steps.length < 3 ? stepsToShow : [];
}
const api = new FetchUtil({ baseUrl: CoreHelperUtil.getApiUrl(), clientId: null });
class JsonRpcError extends Error {
}
function getApiUrl() {
  const projectId = OptionsController.getSnapshot().projectId;
  return `${API_URL}?projectId=${projectId}`;
}
function getSdkProperties() {
  const { projectId, sdkType, sdkVersion } = OptionsController.state;
  return {
    projectId,
    st: sdkType || "appkit",
    sv: sdkVersion || "html-wagmi-4.2.2"
  };
}
async function sendRequest(method, params) {
  const url = getApiUrl();
  const { sdkType: st, sdkVersion: sv, projectId } = OptionsController.getSnapshot();
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params || {},
      st,
      sv,
      projectId
    }
  };
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: { "Content-Type": "application/json" }
  });
  const json = await response.json();
  if (json.error) {
    throw new JsonRpcError(json.error.message);
  }
  return json;
}
async function getExchanges(params) {
  const response = await sendRequest("reown_getExchanges", params);
  return response.result;
}
async function getPayUrl(params) {
  const response = await sendRequest("reown_getExchangePayUrl", params);
  return response.result;
}
async function getBuyStatus(params) {
  const response = await sendRequest("reown_getExchangeBuyStatus", params);
  return response.result;
}
async function getTransfersQuote(params) {
  const amount = NumberUtil.bigNumber(params.amount).times(10 ** params.toToken.metadata.decimals).toString();
  const { chainId: originChainId, chainNamespace: originChainNamespace } = ParseUtil.parseCaipNetworkId(params.sourceToken.network);
  const { chainId: destinationChainId, chainNamespace: destinationChainNamespace } = ParseUtil.parseCaipNetworkId(params.toToken.network);
  const originCurrency = params.sourceToken.asset === "native" ? getNativeTokenAddress(originChainNamespace) : params.sourceToken.asset;
  const destinationCurrency = params.toToken.asset === "native" ? getNativeTokenAddress(destinationChainNamespace) : params.toToken.asset;
  const response = await api.post({
    path: "/appkit/v1/transfers/quote",
    body: {
      user: params.address,
      originChainId: originChainId.toString(),
      originCurrency,
      destinationChainId: destinationChainId.toString(),
      destinationCurrency,
      recipient: params.recipient,
      amount
    },
    params: getSdkProperties()
  });
  return response;
}
async function getQuote(params) {
  const isSameChain = HelpersUtil.isLowerCaseMatch(params.sourceToken.network, params.toToken.network);
  const isSameAsset = HelpersUtil.isLowerCaseMatch(params.sourceToken.asset, params.toToken.asset);
  if (isSameChain && isSameAsset) {
    return getDirectTransferQuote(params);
  }
  return getTransfersQuote(params);
}
async function getQuoteStatus(params) {
  const response = await api.get({
    path: "/appkit/v1/transfers/status",
    params: {
      requestId: params.requestId,
      ...getSdkProperties()
    }
  });
  return response;
}
async function getAssetsForExchange(exchangeId) {
  const response = await api.get({
    path: `/appkit/v1/transfers/assets/exchanges/${exchangeId}`,
    params: getSdkProperties()
  });
  return response;
}
const SUPPORT_PAY_WITH_WALLET_CHAIN_NAMESPACES = ["eip155", "solana"];
const CHAIN_ASSET_INFO_MAP = {
  eip155: {
    native: { assetNamespace: "slip44", assetReference: "60" },
    defaultTokenNamespace: "erc20"
  },
  solana: {
    native: { assetNamespace: "slip44", assetReference: "501" },
    defaultTokenNamespace: "token"
  }
};
function formatCaip19Asset(caipNetworkId, asset) {
  const { chainNamespace, chainId } = ParseUtil.parseCaipNetworkId(caipNetworkId);
  const chainInfo = CHAIN_ASSET_INFO_MAP[chainNamespace];
  if (!chainInfo) {
    throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${chainNamespace}`);
  }
  let assetNamespace = chainInfo.native.assetNamespace;
  let assetReference = chainInfo.native.assetReference;
  if (asset !== "native") {
    assetNamespace = chainInfo.defaultTokenNamespace;
    assetReference = asset;
  }
  const networkPart = `${chainNamespace}:${chainId}`;
  return `${networkPart}/${assetNamespace}:${assetReference}`;
}
function isPayWithWalletSupported(networkId) {
  const { chainNamespace } = ParseUtil.parseCaipNetworkId(networkId);
  return SUPPORT_PAY_WITH_WALLET_CHAIN_NAMESPACES.includes(chainNamespace);
}
function formatBalanceToPaymentAsset(balance) {
  const allNetworks = ChainController.getAllRequestedCaipNetworks();
  const targetNetwork = allNetworks.find((net) => net.caipNetworkId === balance.chainId);
  let asset = balance.address;
  if (!targetNetwork) {
    throw new Error(`Target network not found for balance chainId "${balance.chainId}"`);
  }
  if (HelpersUtil.isLowerCaseMatch(balance.symbol, targetNetwork.nativeCurrency.symbol)) {
    asset = "native";
  } else if (CoreHelperUtil.isCaipAddress(asset)) {
    const { address } = ParseUtil.parseCaipAddress(asset);
    asset = address;
  } else if (!asset) {
    throw new Error(`Balance address not found for balance symbol "${balance.symbol}"`);
  }
  return {
    network: targetNetwork.caipNetworkId,
    asset,
    metadata: {
      name: balance.name,
      symbol: balance.symbol,
      decimals: Number(balance.quantity.decimals),
      logoURI: balance.iconUrl
    },
    amount: balance.quantity.numeric
  };
}
function formatPaymentAssetToBalance(paymentAsset) {
  return {
    chainId: paymentAsset.network,
    address: `${paymentAsset.network}:${paymentAsset.asset}`,
    symbol: paymentAsset.metadata.symbol,
    name: paymentAsset.metadata.name,
    iconUrl: paymentAsset.metadata.logoURI || "",
    price: 0,
    quantity: {
      numeric: "0",
      decimals: paymentAsset.metadata.decimals.toString()
    }
  };
}
function formatAmount(amount) {
  const num = NumberUtil.bigNumber(amount, { safe: true });
  if (num.lt(1e-3)) {
    return "<0.001";
  }
  return num.round(4).toString();
}
function isTestnetAsset(paymentAsset) {
  const allNetworks = ChainController.getAllRequestedCaipNetworks();
  const targetNetwork = allNetworks.find((net) => net.caipNetworkId === paymentAsset.network);
  if (!targetNetwork) {
    return false;
  }
  return Boolean(targetNetwork.testnet);
}
const DEFAULT_PAGE = 0;
const DEFAULT_PAYMENT_ID = "unknown";
const DIRECT_TRANSFER_REQUEST_ID = "direct-transfer";
const DIRECT_TRANSFER_DEPOSIT_TYPE = "deposit";
const DIRECT_TRANSFER_TRANSACTION_TYPE = "transaction";
const state = proxy({
  paymentAsset: {
    network: "eip155:1",
    asset: "0x0",
    metadata: {
      name: "0x0",
      symbol: "0x0",
      decimals: 0
    }
  },
  recipient: "0x0",
  amount: 0,
  isConfigured: false,
  error: null,
  isPaymentInProgress: false,
  exchanges: [],
  isLoading: false,
  openInNewTab: true,
  redirectUrl: void 0,
  payWithExchange: void 0,
  currentPayment: void 0,
  analyticsSet: false,
  paymentId: void 0,
  choice: "pay",
  tokenBalances: {
    [ConstantsUtil.CHAIN.EVM]: [],
    [ConstantsUtil.CHAIN.SOLANA]: []
  },
  isFetchingTokenBalances: false,
  selectedPaymentAsset: null,
  quote: void 0,
  quoteStatus: "waiting",
  quoteError: null,
  isFetchingQuote: false,
  selectedExchange: void 0,
  exchangeUrlForQuote: void 0,
  requestId: void 0
});
const PayController = {
  state,
  subscribe(callback) {
    return subscribe(state, () => callback(state));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state, key, callback);
  },
  async handleOpenPay(options) {
    this.resetState();
    this.setPaymentConfig(options);
    this.initializeAnalytics();
    ensureCorrectAddress();
    await this.prepareTokenLogo();
    state.isConfigured = true;
    EventsController.sendEvent({
      type: "track",
      event: "PAY_MODAL_OPEN",
      properties: {
        exchanges: state.exchanges,
        configuration: {
          network: state.paymentAsset.network,
          asset: state.paymentAsset.asset,
          recipient: state.recipient,
          amount: state.amount
        }
      }
    });
    await ModalController.open({
      view: "Pay"
    });
  },
  resetState() {
    state.paymentAsset = {
      network: "eip155:1",
      asset: "0x0",
      metadata: { name: "0x0", symbol: "0x0", decimals: 0 }
    };
    state.recipient = "0x0";
    state.amount = 0;
    state.isConfigured = false;
    state.error = null;
    state.isPaymentInProgress = false;
    state.isLoading = false;
    state.currentPayment = void 0;
    state.selectedExchange = void 0;
    state.exchangeUrlForQuote = void 0;
    state.requestId = void 0;
  },
  resetQuoteState() {
    state.quote = void 0;
    state.quoteStatus = "waiting";
    state.quoteError = null;
    state.isFetchingQuote = false;
    state.requestId = void 0;
  },
  setPaymentConfig(config) {
    if (!config.paymentAsset) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG);
    }
    try {
      state.choice = config.choice ?? "pay";
      state.paymentAsset = config.paymentAsset;
      state.recipient = config.recipient;
      state.amount = config.amount;
      state.openInNewTab = config.openInNewTab ?? true;
      state.redirectUrl = config.redirectUrl;
      state.payWithExchange = config.payWithExchange;
      state.error = null;
    } catch (error) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, error.message);
    }
  },
  setSelectedPaymentAsset(paymentAsset) {
    state.selectedPaymentAsset = paymentAsset;
  },
  setSelectedExchange(exchange) {
    state.selectedExchange = exchange;
  },
  setRequestId(requestId) {
    state.requestId = requestId;
  },
  setPaymentInProgress(isPaymentInProgress) {
    state.isPaymentInProgress = isPaymentInProgress;
  },
  getPaymentAsset() {
    return state.paymentAsset;
  },
  getExchanges() {
    return state.exchanges;
  },
  async fetchExchanges() {
    try {
      state.isLoading = true;
      const response = await getExchanges({
        page: DEFAULT_PAGE
      });
      state.exchanges = response.exchanges.slice(0, 2);
    } catch (error) {
      SnackController.showError(AppKitPayErrorMessages.UNABLE_TO_GET_EXCHANGES);
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_EXCHANGES);
    } finally {
      state.isLoading = false;
    }
  },
  async getAvailableExchanges(params) {
    try {
      const asset = params?.asset && params?.network ? formatCaip19Asset(params.network, params.asset) : void 0;
      const response = await getExchanges({
        page: params?.page ?? DEFAULT_PAGE,
        asset,
        amount: params?.amount?.toString()
      });
      return response;
    } catch (error) {
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_EXCHANGES);
    }
  },
  async getPayUrl(exchangeId, params, headless = false) {
    try {
      const numericAmount = Number(params.amount);
      const response = await getPayUrl({
        exchangeId,
        asset: formatCaip19Asset(params.network, params.asset),
        amount: numericAmount.toString(),
        recipient: `${params.network}:${params.recipient}`
      });
      EventsController.sendEvent({
        type: "track",
        event: "PAY_EXCHANGE_SELECTED",
        properties: {
          source: "pay",
          exchange: {
            id: exchangeId
          },
          configuration: {
            network: params.network,
            asset: params.asset,
            recipient: params.recipient,
            amount: numericAmount
          },
          currentPayment: {
            type: "exchange",
            exchangeId
          },
          headless
        }
      });
      if (headless) {
        this.initiatePayment();
        EventsController.sendEvent({
          type: "track",
          event: "PAY_INITIATED",
          properties: {
            source: "pay",
            paymentId: state.paymentId || DEFAULT_PAYMENT_ID,
            configuration: {
              network: params.network,
              asset: params.asset,
              recipient: params.recipient,
              amount: numericAmount
            },
            currentPayment: {
              type: "exchange",
              exchangeId
            }
          }
        });
      }
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes("is not supported")) {
        throw new AppKitPayError(AppKitPayErrorCodes.ASSET_NOT_SUPPORTED);
      }
      throw new Error(error.message);
    }
  },
  async generateExchangeUrlForQuote({ exchangeId, paymentAsset, amount, recipient }) {
    const response = await getPayUrl({
      exchangeId,
      asset: formatCaip19Asset(paymentAsset.network, paymentAsset.asset),
      amount: amount.toString(),
      recipient
    });
    state.exchangeSessionId = response.sessionId;
    state.exchangeUrlForQuote = response.url;
  },
  async openPayUrl(openParams, params, headless = false) {
    try {
      const payUrl = await this.getPayUrl(openParams.exchangeId, params, headless);
      if (!payUrl) {
        throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_PAY_URL);
      }
      const shouldOpenInNewTab = openParams.openInNewTab ?? true;
      const target = shouldOpenInNewTab ? "_blank" : "_self";
      CoreHelperUtil.openHref(payUrl.url, target);
      return payUrl;
    } catch (error) {
      if (error instanceof AppKitPayError) {
        state.error = error.message;
      } else {
        state.error = AppKitPayErrorMessages.GENERIC_PAYMENT_ERROR;
      }
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_PAY_URL);
    }
  },
  async onTransfer({ chainNamespace, fromAddress, toAddress, amount, paymentAsset }) {
    state.currentPayment = {
      type: "wallet",
      status: "IN_PROGRESS"
    };
    if (state.isPaymentInProgress) {
      return;
    }
    try {
      this.initiatePayment();
      const allNetworks = ChainController.getAllRequestedCaipNetworks();
      const targetNetwork = allNetworks.find((net) => net.caipNetworkId === paymentAsset.network);
      if (!targetNetwork) {
        throw new Error("Target network not found");
      }
      const caipNetwork = ChainController.state.activeCaipNetwork;
      if (!HelpersUtil.isLowerCaseMatch(caipNetwork?.caipNetworkId, targetNetwork.caipNetworkId)) {
        await ChainController.switchActiveNetwork(targetNetwork);
      }
      switch (chainNamespace) {
        case ConstantsUtil.CHAIN.EVM:
          if (paymentAsset.asset === "native") {
            state.currentPayment.result = await processEvmNativePayment(paymentAsset, chainNamespace, {
              recipient: toAddress,
              amount,
              fromAddress
            });
          }
          if (paymentAsset.asset.startsWith("0x")) {
            state.currentPayment.result = await processEvmErc20Payment(paymentAsset, {
              recipient: toAddress,
              amount,
              fromAddress
            });
          }
          state.currentPayment.status = "SUCCESS";
          break;
        case ConstantsUtil.CHAIN.SOLANA:
          state.currentPayment.result = await processSolanaPayment(chainNamespace, {
            recipient: toAddress,
            amount,
            fromAddress,
            tokenMint: paymentAsset.asset === "native" ? void 0 : paymentAsset.asset
          });
          state.currentPayment.status = "SUCCESS";
          break;
        default:
          throw new AppKitPayError(AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE);
      }
    } catch (error) {
      if (error instanceof AppKitPayError) {
        state.error = error.message;
      } else {
        state.error = AppKitPayErrorMessages.GENERIC_PAYMENT_ERROR;
      }
      state.currentPayment.status = "FAILED";
      SnackController.showError(state.error);
      throw error;
    } finally {
      state.isPaymentInProgress = false;
    }
  },
  async onSendTransaction(params) {
    try {
      const { namespace, transactionStep } = params;
      PayController.initiatePayment();
      const allNetworks = ChainController.getAllRequestedCaipNetworks();
      const targetNetwork = allNetworks.find((net) => net.caipNetworkId === state.paymentAsset?.network);
      if (!targetNetwork) {
        throw new Error("Target network not found");
      }
      const caipNetwork = ChainController.state.activeCaipNetwork;
      if (!HelpersUtil.isLowerCaseMatch(caipNetwork?.caipNetworkId, targetNetwork.caipNetworkId)) {
        await ChainController.switchActiveNetwork(targetNetwork);
      }
      if (namespace === ConstantsUtil.CHAIN.EVM) {
        const { from, to, data, value } = transactionStep.transaction;
        await ConnectionController.sendTransaction({
          address: from,
          to,
          data,
          value: BigInt(value),
          chainNamespace: namespace
        });
      } else if (namespace === ConstantsUtil.CHAIN.SOLANA) {
        const { instructions } = transactionStep.transaction;
        await ConnectionController.writeSolanaTransaction({
          instructions
        });
      }
    } catch (error) {
      if (error instanceof AppKitPayError) {
        state.error = error.message;
      } else {
        state.error = AppKitPayErrorMessages.GENERIC_PAYMENT_ERROR;
      }
      SnackController.showError(state.error);
      throw error;
    } finally {
      state.isPaymentInProgress = false;
    }
  },
  getExchangeById(exchangeId) {
    return state.exchanges.find((exchange) => exchange.id === exchangeId);
  },
  validatePayConfig(config) {
    const { paymentAsset, recipient, amount } = config;
    if (!paymentAsset) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG);
    }
    if (!recipient) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_RECIPIENT);
    }
    if (!paymentAsset.asset) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_ASSET);
    }
    if (amount === void 0 || amount === null || amount <= 0) {
      throw new AppKitPayError(AppKitPayErrorCodes.INVALID_AMOUNT);
    }
  },
  async handlePayWithExchange(exchangeId) {
    try {
      state.currentPayment = {
        type: "exchange",
        exchangeId
      };
      const { network, asset } = state.paymentAsset;
      const payUrlParams = {
        network,
        asset,
        amount: state.amount,
        recipient: state.recipient
      };
      const payUrl = await this.getPayUrl(exchangeId, payUrlParams);
      if (!payUrl) {
        throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_INITIATE_PAYMENT);
      }
      state.currentPayment.sessionId = payUrl.sessionId;
      state.currentPayment.status = "IN_PROGRESS";
      state.currentPayment.exchangeId = exchangeId;
      this.initiatePayment();
      return {
        url: payUrl.url,
        openInNewTab: state.openInNewTab
      };
    } catch (error) {
      if (error instanceof AppKitPayError) {
        state.error = error.message;
      } else {
        state.error = AppKitPayErrorMessages.GENERIC_PAYMENT_ERROR;
      }
      state.isPaymentInProgress = false;
      SnackController.showError(state.error);
      return null;
    }
  },
  async getBuyStatus(exchangeId, sessionId) {
    try {
      const status = await getBuyStatus({ sessionId, exchangeId });
      if (status.status === "SUCCESS" || status.status === "FAILED") {
        EventsController.sendEvent({
          type: "track",
          event: status.status === "SUCCESS" ? "PAY_SUCCESS" : "PAY_ERROR",
          properties: {
            message: status.status === "FAILED" ? CoreHelperUtil.parseError(state.error) : void 0,
            source: "pay",
            paymentId: state.paymentId || DEFAULT_PAYMENT_ID,
            configuration: {
              network: state.paymentAsset.network,
              asset: state.paymentAsset.asset,
              recipient: state.recipient,
              amount: state.amount
            },
            currentPayment: {
              type: "exchange",
              exchangeId: state.currentPayment?.exchangeId,
              sessionId: state.currentPayment?.sessionId,
              result: status.txHash
            }
          }
        });
      }
      return status;
    } catch (error) {
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_BUY_STATUS);
    }
  },
  async fetchTokensFromEOA({ caipAddress, caipNetwork, namespace }) {
    if (!caipAddress) {
      return [];
    }
    const { address } = ParseUtil.parseCaipAddress(caipAddress);
    let overideCaipNetwork = caipNetwork;
    if (namespace === ConstantsUtil.CHAIN.EVM) {
      overideCaipNetwork = void 0;
    }
    const balances = await BalanceUtil.getMyTokensWithBalance({
      address,
      caipNetwork: overideCaipNetwork
    });
    return balances;
  },
  async fetchTokensFromExchange() {
    if (!state.selectedExchange) {
      return [];
    }
    const assets = await getAssetsForExchange(state.selectedExchange.id);
    const allAssets = Object.values(assets.assets).flat();
    const balanceWithImages = await Promise.all(allAssets.map(async (token) => {
      const balance = formatPaymentAssetToBalance(token);
      const { chainNamespace } = ParseUtil.parseCaipNetworkId(balance.chainId);
      let address = balance.address;
      if (CoreHelperUtil.isCaipAddress(address)) {
        const { address: parsedAddress } = ParseUtil.parseCaipAddress(address);
        address = parsedAddress;
      }
      const image = await AssetUtil.getImageByToken(address ?? "", chainNamespace).catch(() => void 0);
      balance.iconUrl = image ?? "";
      return balance;
    }));
    return balanceWithImages;
  },
  async fetchTokens({ caipAddress, caipNetwork, namespace }) {
    try {
      state.isFetchingTokenBalances = true;
      const isUsingExchange = Boolean(state.selectedExchange);
      const balancesFnPromise = isUsingExchange ? this.fetchTokensFromExchange() : this.fetchTokensFromEOA({ caipAddress, caipNetwork, namespace });
      const balances = await balancesFnPromise;
      state.tokenBalances = { ...state.tokenBalances, [namespace]: balances };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to get token balances";
      SnackController.showError(message);
    } finally {
      state.isFetchingTokenBalances = false;
    }
  },
  async fetchQuote({ amount, address, sourceToken, toToken, recipient }) {
    try {
      PayController.resetQuoteState();
      state.isFetchingQuote = true;
      const quote = await getQuote({
        amount,
        address: state.selectedExchange ? void 0 : address,
        sourceToken,
        toToken,
        recipient
      });
      if (state.selectedExchange) {
        const transferStep = getTransferStep(quote);
        if (transferStep) {
          const caipDepositAddress = `${sourceToken.network}:${transferStep.deposit.receiver}`;
          const depositAmount = NumberUtil.formatNumber(transferStep.deposit.amount, {
            decimals: sourceToken.metadata.decimals ?? 0,
            round: 8
          });
          await PayController.generateExchangeUrlForQuote({
            exchangeId: state.selectedExchange.id,
            paymentAsset: sourceToken,
            amount: depositAmount.toString(),
            recipient: caipDepositAddress
          });
        }
      }
      state.quote = quote;
    } catch (err) {
      let errMessage = AppKitPayErrorMessages.UNABLE_TO_GET_QUOTE;
      if (err instanceof Error && err.cause && err.cause instanceof Response) {
        try {
          const errorData = await err.cause.json();
          if (errorData.error && typeof errorData.error === "string") {
            errMessage = errorData.error;
          }
        } catch {
        }
      }
      state.quoteError = errMessage;
      SnackController.showError(errMessage);
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_QUOTE);
    } finally {
      state.isFetchingQuote = false;
    }
  },
  async fetchQuoteStatus({ requestId }) {
    try {
      if (requestId === DIRECT_TRANSFER_REQUEST_ID) {
        const selectedExchange = state.selectedExchange;
        const sessionId = state.exchangeSessionId;
        if (selectedExchange && sessionId) {
          const status2 = await this.getBuyStatus(selectedExchange.id, sessionId);
          switch (status2.status) {
            case "IN_PROGRESS":
              state.quoteStatus = "waiting";
              break;
            case "SUCCESS":
              state.quoteStatus = "success";
              state.isPaymentInProgress = false;
              break;
            case "FAILED":
              state.quoteStatus = "failure";
              state.isPaymentInProgress = false;
              break;
            case "UNKNOWN":
              state.quoteStatus = "waiting";
              break;
            default:
              state.quoteStatus = "waiting";
              break;
          }
          return;
        }
        state.quoteStatus = "success";
        return;
      }
      const { status } = await getQuoteStatus({ requestId });
      state.quoteStatus = status;
    } catch {
      state.quoteStatus = "failure";
      throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_GET_QUOTE_STATUS);
    }
  },
  initiatePayment() {
    state.isPaymentInProgress = true;
    state.paymentId = crypto.randomUUID();
  },
  initializeAnalytics() {
    if (state.analyticsSet) {
      return;
    }
    state.analyticsSet = true;
    this.subscribeKey("isPaymentInProgress", (_) => {
      if (state.currentPayment?.status && state.currentPayment.status !== "UNKNOWN") {
        const eventType = {
          IN_PROGRESS: "PAY_INITIATED",
          SUCCESS: "PAY_SUCCESS",
          FAILED: "PAY_ERROR"
        }[state.currentPayment.status];
        EventsController.sendEvent({
          type: "track",
          event: eventType,
          properties: {
            message: state.currentPayment.status === "FAILED" ? CoreHelperUtil.parseError(state.error) : void 0,
            source: "pay",
            paymentId: state.paymentId || DEFAULT_PAYMENT_ID,
            configuration: {
              network: state.paymentAsset.network,
              asset: state.paymentAsset.asset,
              recipient: state.recipient,
              amount: state.amount
            },
            currentPayment: {
              type: state.currentPayment.type,
              exchangeId: state.currentPayment.exchangeId,
              sessionId: state.currentPayment.sessionId,
              result: state.currentPayment.result
            }
          }
        });
      }
    });
  },
  async prepareTokenLogo() {
    if (!state.paymentAsset.metadata.logoURI) {
      try {
        const { chainNamespace } = ParseUtil.parseCaipNetworkId(state.paymentAsset.network);
        const imageUrl = await AssetUtil.getImageByToken(state.paymentAsset.asset, chainNamespace);
        state.paymentAsset.metadata.logoURI = imageUrl;
      } catch {
      }
    }
  }
};
const styles$8 = css`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
    width: 40px;
    height: 40px;
  }

  .chain-image {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({ borderRadius }) => borderRadius.round};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  .payment-methods-container {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-top-right-radius: ${({ borderRadius }) => borderRadius[8]};
    border-top-left-radius: ${({ borderRadius }) => borderRadius[8]};
  }
`;
var __decorate$8 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayView = class W3mPayView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.amount = PayController.state.amount;
    this.namespace = void 0;
    this.paymentAsset = PayController.state.paymentAsset;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.caipAddress = void 0;
    this.exchanges = PayController.state.exchanges;
    this.isLoading = PayController.state.isLoading;
    this.initializeNamespace();
    this.unsubscribe.push(PayController.subscribeKey("amount", (val) => this.amount = val));
    this.unsubscribe.push(ConnectorController.subscribeKey("activeConnectorIds", (ids) => this.activeConnectorIds = ids));
    this.unsubscribe.push(PayController.subscribeKey("exchanges", (val) => this.exchanges = val));
    this.unsubscribe.push(PayController.subscribeKey("isLoading", (val) => this.isLoading = val));
    PayController.fetchExchanges();
    PayController.setSelectedExchange(void 0);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex flexDirection="column">
        ${this.paymentDetailsTemplate()} ${this.paymentMethodsTemplate()}
      </wui-flex>
    `;
  }
  paymentMethodsTemplate() {
    return x`
      <wui-flex flexDirection="column" padding="3" gap="2" class="payment-methods-container">
        ${this.payWithWalletTemplate()} ${this.templateSeparator()}
        ${this.templateExchangeOptions()}
      </wui-flex>
    `;
  }
  initializeNamespace() {
    const namespace = ChainController.state.activeChain;
    this.namespace = namespace;
    this.caipAddress = ChainController.getAccountData(namespace)?.caipAddress;
    this.unsubscribe.push(ChainController.subscribeChainProp("accountState", (accountState) => {
      this.caipAddress = accountState?.caipAddress;
    }, namespace));
  }
  paymentDetailsTemplate() {
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    const targetNetwork = allNetworks.find((net) => net.caipNetworkId === this.paymentAsset.network);
    return x`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        .padding=${["6", "8", "6", "8"]}
        gap="2"
      >
        <wui-flex alignItems="center" gap="1">
          <wui-text variant="h1-regular" color="primary">
            ${formatAmount(this.amount || "0")}
          </wui-text>

          <wui-flex flexDirection="column">
            <wui-text variant="h6-regular" color="secondary">
              ${this.paymentAsset.metadata.symbol || "Unknown"}
            </wui-text>
            <wui-text variant="md-medium" color="secondary"
              >on ${targetNetwork?.name || "Unknown"}</wui-text
            >
          </wui-flex>
        </wui-flex>

        <wui-flex class="left-image-container">
          <wui-image
            src=${o(this.paymentAsset.metadata.logoURI)}
            class="token-image"
          ></wui-image>
          <wui-image
            src=${o(AssetUtil.getNetworkImage(targetNetwork))}
            class="chain-image"
          ></wui-image>
        </wui-flex>
      </wui-flex>
    `;
  }
  payWithWalletTemplate() {
    if (!isPayWithWalletSupported(this.paymentAsset.network)) {
      return x``;
    }
    return this.caipAddress ? this.connectedWalletTemplate() : this.disconnectedWalletTemplate();
  }
  connectedWalletTemplate() {
    const { name, image } = this.getWalletProperties({
      namespace: this.namespace
    });
    return x`
      <wui-flex flexDirection="column" gap="3">
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${this.onWalletPayment}
          .boxed=${false}
          ?chevron=${true}
          ?fullSize=${false}
          ?rounded=${true}
          data-testid="wallet-payment-option"
          imageSrc=${o(image)}
          imageSize="3xl"
        >
          <wui-text variant="lg-regular" color="primary">Pay with ${name}</wui-text>
        </wui-list-item>

        <wui-list-item
          type="secondary"
          icon="power"
          iconColor="error"
          @click=${this.onDisconnect}
          data-testid="disconnect-button"
          ?chevron=${false}
          boxColor="foregroundSecondary"
        >
          <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>
    `;
  }
  disconnectedWalletTemplate() {
    return x`<wui-list-item
      type="secondary"
      boxColor="foregroundSecondary"
      variant="icon"
      iconColor="default"
      iconVariant="overlay"
      icon="wallet"
      @click=${this.onWalletPayment}
      ?chevron=${true}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="primary">Pay with wallet</wui-text>
    </wui-list-item>`;
  }
  templateExchangeOptions() {
    if (this.isLoading) {
      return x`<wui-flex justifyContent="center" alignItems="center">
        <wui-loading-spinner size="md"></wui-loading-spinner>
      </wui-flex>`;
    }
    const exchangesToShow = this.exchanges.filter((exchange) => {
      if (isTestnetAsset(this.paymentAsset)) {
        return exchange.id === REOWN_TEST_EXCHANGE_ID;
      }
      return exchange.id !== REOWN_TEST_EXCHANGE_ID;
    });
    if (exchangesToShow.length === 0) {
      return x`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`;
    }
    return exchangesToShow.map((exchange) => x`
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${() => this.onExchangePayment(exchange)}
          data-testid="exchange-option-${exchange.id}"
          ?chevron=${true}
          imageSrc=${o(exchange.imageUrl)}
        >
          <wui-text flexGrow="1" variant="lg-regular" color="primary">
            Pay with ${exchange.name}
          </wui-text>
        </wui-list-item>
      `);
  }
  templateSeparator() {
    return x`<wui-separator text="or" bgColor="secondary"></wui-separator>`;
  }
  async onWalletPayment() {
    if (!this.namespace) {
      throw new Error("Namespace not found");
    }
    if (this.caipAddress) {
      RouterController.push("PayQuote");
    } else {
      await ConnectorController.connect();
      await ModalController.open({ view: "PayQuote" });
    }
  }
  onExchangePayment(exchange) {
    PayController.setSelectedExchange(exchange);
    RouterController.push("PayQuote");
  }
  async onDisconnect() {
    try {
      await ConnectionController.disconnect();
      await ModalController.open({ view: "Pay" });
    } catch {
      console.error("Failed to disconnect");
      SnackController.showError("Failed to disconnect");
    }
  }
  getWalletProperties({ namespace }) {
    if (!namespace) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorId = this.activeConnectorIds[namespace];
    if (!connectorId) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connector = ConnectorController.getConnector({ id: connectorId, namespace });
    if (!connector) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorImage = AssetUtil.getConnectorImage(connector);
    return {
      name: connector.name,
      image: connectorImage
    };
  }
};
W3mPayView.styles = styles$8;
__decorate$8([
  r()
], W3mPayView.prototype, "amount", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "namespace", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "paymentAsset", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "activeConnectorIds", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "caipAddress", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "exchanges", void 0);
__decorate$8([
  r()
], W3mPayView.prototype, "isLoading", void 0);
W3mPayView = __decorate$8([
  customElement("w3m-pay-view")
], W3mPayView);
const styles$7 = css`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-container {
    position: relative;
    width: var(--pulse-size);
    height: var(--pulse-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--pulse-color);
    opacity: 0;
    animation: pulse var(--pulse-duration, 2s) ease-out infinite;
  }

  .pulse-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: var(--pulse-opacity, 0.3);
    }
    50% {
      opacity: calc(var(--pulse-opacity, 0.3) * 0.5);
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const DEFAULT_RINGS = 3;
const DEFAULT_DURATION = 2;
const DEFAULT_OPACITY = 0.3;
const DEFAULT_SIZE = "200px";
const COLOR_BY_VARIANT = {
  "accent-primary": vars.tokens.core.backgroundAccentPrimary
};
let WuiPulse = class WuiPulse2 extends i {
  constructor() {
    super(...arguments);
    this.rings = DEFAULT_RINGS;
    this.duration = DEFAULT_DURATION;
    this.opacity = DEFAULT_OPACITY;
    this.size = DEFAULT_SIZE;
    this.variant = "accent-primary";
  }
  render() {
    const color = COLOR_BY_VARIANT[this.variant];
    this.style.cssText = `
      --pulse-size: ${this.size};
      --pulse-duration: ${this.duration}s;
      --pulse-color: ${color};
      --pulse-opacity: ${this.opacity};
    `;
    const ringElements = Array.from({ length: this.rings }, (_, i2) => this.renderRing(i2, this.rings));
    return x`
      <div class="pulse-container">
        <div class="pulse-rings">${ringElements}</div>
        <div class="pulse-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
  renderRing(index, total) {
    const delay = index / total * this.duration;
    const style = `animation-delay: ${delay}s;`;
    return x`<div class="pulse-ring" style=${style}></div>`;
  }
};
WuiPulse.styles = [resetStyles, styles$7];
__decorate$7([
  n({ type: Number })
], WuiPulse.prototype, "rings", void 0);
__decorate$7([
  n({ type: Number })
], WuiPulse.prototype, "duration", void 0);
__decorate$7([
  n({ type: Number })
], WuiPulse.prototype, "opacity", void 0);
__decorate$7([
  n()
], WuiPulse.prototype, "size", void 0);
__decorate$7([
  n()
], WuiPulse.prototype, "variant", void 0);
WuiPulse = __decorate$7([
  customElement("wui-pulse")
], WuiPulse);
const STEPS = [
  {
    id: "received",
    title: "Receiving funds",
    icon: "dollar"
  },
  {
    id: "processing",
    title: "Swapping asset",
    icon: "recycleHorizontal"
  },
  {
    id: "sending",
    title: "Sending asset to the recipient address",
    icon: "send"
  }
];
const TERMINAL_STATES = [
  "success",
  "submitted",
  "failure",
  "timeout",
  "refund"
];
const styles$6 = css`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
  }

  .token-badge-container {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    z-index: 3;
    min-width: 105px;
  }

  .token-badge-container.loading {
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    border: 3px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  .token-badge-container.success {
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    border: 3px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  .token-image-container {
    position: relative;
  }

  .token-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
    width: 64px;
    height: 64px;
  }

  .token-image.success {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .token-image.error {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .token-image.loading {
    background: ${({ colors }) => colors.accent010};
  }

  .token-image wui-icon {
    width: 32px;
    height: 32px;
  }

  .token-badge {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  .token-badge wui-text {
    white-space: nowrap;
  }

  .payment-lifecycle-container {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-top-right-radius: ${({ borderRadius }) => borderRadius[6]};
    border-top-left-radius: ${({ borderRadius }) => borderRadius[6]};
  }

  .payment-step-badge {
    padding: ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  .payment-step-badge.loading {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  .payment-step-badge.error {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
  }

  .payment-step-badge.success {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
  }

  .step-icon-container {
    position: relative;
    height: 40px;
    width: 40px;
    border-radius: ${({ borderRadius }) => borderRadius.round};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  .step-icon-box {
    position: absolute;
    right: -4px;
    bottom: -1px;
    padding: 2px;
    border-radius: ${({ borderRadius }) => borderRadius.round};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .step-icon-box.success {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const STEP_COMPLETED_STATUSES = {
  received: ["pending", "success", "submitted"],
  processing: ["success", "submitted"],
  sending: ["success", "submitted"]
};
const POLLING_INTERVAL_MS = 3e3;
let W3mPayLoadingView = class W3mPayLoadingView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.pollingInterval = null;
    this.paymentAsset = PayController.state.paymentAsset;
    this.quoteStatus = PayController.state.quoteStatus;
    this.quote = PayController.state.quote;
    this.amount = PayController.state.amount;
    this.namespace = void 0;
    this.caipAddress = void 0;
    this.profileName = null;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.selectedExchange = PayController.state.selectedExchange;
    this.initializeNamespace();
    this.unsubscribe.push(...[
      PayController.subscribeKey("quoteStatus", (val) => this.quoteStatus = val),
      PayController.subscribeKey("quote", (val) => this.quote = val),
      ConnectorController.subscribeKey("activeConnectorIds", (ids) => this.activeConnectorIds = ids),
      PayController.subscribeKey("selectedExchange", (val) => this.selectedExchange = val)
    ]);
  }
  connectedCallback() {
    super.connectedCallback();
    this.startPolling();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["3", "0", "0", "0"]} gap="2">
        ${this.tokenTemplate()} ${this.paymentTemplate()} ${this.paymentLifecycleTemplate()}
      </wui-flex>
    `;
  }
  tokenTemplate() {
    const amount = formatAmount(this.amount || "0");
    const symbol = this.paymentAsset.metadata.symbol ?? "Unknown";
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    const targetNetwork = allNetworks.find((net) => net.caipNetworkId === this.paymentAsset.network);
    const hasTransactionFailed = this.quoteStatus === "failure" || this.quoteStatus === "timeout" || this.quoteStatus === "refund";
    const hasTransactionSucceeded = this.quoteStatus === "success" || this.quoteStatus === "submitted";
    if (hasTransactionSucceeded) {
      return x`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image success">
          <wui-icon name="checkmark" color="success" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`;
    }
    if (hasTransactionFailed) {
      return x`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image error">
          <wui-icon name="close" color="error" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`;
    }
    return x`
      <wui-flex alignItems="center" justifyContent="center">
        <wui-flex class="token-image-container">
          <wui-pulse size="125px" rings="3" duration="4" opacity="0.5" variant="accent-primary">
            <wui-flex justifyContent="center" alignItems="center" class="token-image loading">
              <wui-icon name="paperPlaneTitle" color="accent-primary" size="inherit"></wui-icon>
            </wui-flex>
          </wui-pulse>

          <wui-flex
            justifyContent="center"
            alignItems="center"
            class="token-badge-container loading"
          >
            <wui-flex
              alignItems="center"
              justifyContent="center"
              gap="01"
              padding="1"
              class="token-badge"
            >
              <wui-image
                src=${o(AssetUtil.getNetworkImage(targetNetwork))}
                class="chain-image"
                size="mdl"
              ></wui-image>

              <wui-text variant="lg-regular" color="primary">${amount} ${symbol}</wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `;
  }
  paymentTemplate() {
    return x`
      <wui-flex flexDirection="column" gap="2" .padding=${["0", "6", "0", "6"]}>
        ${this.renderPayment()}
        <wui-separator></wui-separator>
        ${this.renderWallet()}
      </wui-flex>
    `;
  }
  paymentLifecycleTemplate() {
    const stepsWithStatus = this.getStepsWithStatus();
    return x`
      <wui-flex flexDirection="column" padding="4" gap="2" class="payment-lifecycle-container">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">PAYMENT CYCLE</wui-text>

          ${this.renderPaymentCycleBadge()}
        </wui-flex>

        <wui-flex flexDirection="column" gap="5" .padding=${["2", "0", "2", "0"]}>
          ${stepsWithStatus.map((step) => this.renderStep(step))}
        </wui-flex>
      </wui-flex>
    `;
  }
  renderPaymentCycleBadge() {
    const hasTransactionFailed = this.quoteStatus === "failure" || this.quoteStatus === "timeout" || this.quoteStatus === "refund";
    const hasTransactionSucceeded = this.quoteStatus === "success" || this.quoteStatus === "submitted";
    if (hasTransactionFailed) {
      return x`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge error"
          gap="1"
        >
          <wui-icon name="close" color="error" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="error">Failed</wui-text>
        </wui-flex>
      `;
    }
    if (hasTransactionSucceeded) {
      return x`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge success"
          gap="1"
        >
          <wui-icon name="checkmark" color="success" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="success">Completed</wui-text>
        </wui-flex>
      `;
    }
    const timeEstimate = this.quote?.timeInSeconds ?? 0;
    return x`
      <wui-flex alignItems="center" justifyContent="space-between" gap="3">
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge loading"
          gap="1"
        >
          <wui-icon name="clock" color="default" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="primary">Est. ${timeEstimate} sec</wui-text>
        </wui-flex>

        <wui-icon name="chevronBottom" color="default" size="xxs"></wui-icon>
      </wui-flex>
    `;
  }
  renderPayment() {
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    const targetNetwork = allNetworks.find((net) => {
      const network = this.quote?.origin.currency.network;
      if (!network) {
        return false;
      }
      const { chainId } = ParseUtil.parseCaipNetworkId(network);
      return HelpersUtil.isLowerCaseMatch(net.id.toString(), chainId.toString());
    });
    const formatBigNumber = NumberUtil.formatNumber(this.quote?.origin.amount || "0", {
      decimals: this.quote?.origin.currency.metadata.decimals ?? 0
    }).toString();
    const formattedAmount = formatAmount(formatBigNumber);
    const symbol = this.quote?.origin.currency.metadata.symbol ?? "Unknown";
    return x`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3", "0", "3", "0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Payment Method</wui-text>

        <wui-flex flexDirection="column" alignItems="flex-end" gap="1">
          <wui-flex alignItems="center" gap="01">
            <wui-text variant="lg-regular" color="primary">${formattedAmount}</wui-text>
            <wui-text variant="lg-regular" color="secondary">${symbol}</wui-text>
          </wui-flex>

          <wui-flex alignItems="center" gap="1">
            <wui-text variant="md-regular" color="secondary">on</wui-text>
            <wui-image
              src=${o(AssetUtil.getNetworkImage(targetNetwork))}
              size="xs"
            ></wui-image>
            <wui-text variant="md-regular" color="secondary">${targetNetwork?.name}</wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `;
  }
  renderWallet() {
    return x`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3", "0", "3", "0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Wallet</wui-text>

        ${this.renderWalletText()}
      </wui-flex>
    `;
  }
  renderWalletText() {
    const { image } = this.getWalletProperties({ namespace: this.namespace });
    const { address } = this.caipAddress ? ParseUtil.parseCaipAddress(this.caipAddress) : {};
    const exchangeName = this.selectedExchange?.name;
    if (this.selectedExchange) {
      return x`
        <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
          <wui-text variant="lg-regular" color="primary">${exchangeName}</wui-text>
          <wui-image src=${o(this.selectedExchange.imageUrl)} size="mdl"></wui-image>
        </wui-flex>
      `;
    }
    return x`
      <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
        <wui-text variant="lg-regular" color="primary">
          ${UiHelperUtil.getTruncateString({
      string: this.profileName || address || exchangeName || "",
      charsStart: this.profileName ? 16 : 4,
      charsEnd: this.profileName ? 0 : 6,
      truncate: this.profileName ? "end" : "middle"
    })}
        </wui-text>

        <wui-image src=${o(image)} size="mdl"></wui-image>
      </wui-flex>
    `;
  }
  getStepsWithStatus() {
    const hasTransactionFailed = this.quoteStatus === "failure" || this.quoteStatus === "timeout" || this.quoteStatus === "refund";
    if (hasTransactionFailed) {
      return STEPS.map((step) => ({ ...step, status: "failed" }));
    }
    return STEPS.map((step) => {
      const completedStatuses = STEP_COMPLETED_STATUSES[step.id] ?? [];
      const status = completedStatuses.includes(this.quoteStatus) ? "completed" : "pending";
      return { ...step, status };
    });
  }
  renderStep({ title, icon, status }) {
    const classes = {
      "step-icon-box": true,
      success: status === "completed"
    };
    return x`
      <wui-flex alignItems="center" gap="3">
        <wui-flex justifyContent="center" alignItems="center" class="step-icon-container">
          <wui-icon name=${icon} color="default" size="mdl"></wui-icon>

          <wui-flex alignItems="center" justifyContent="center" class=${e(classes)}>
            ${this.renderStatusIndicator(status)}
          </wui-flex>
        </wui-flex>

        <wui-text variant="md-regular" color="primary">${title}</wui-text>
      </wui-flex>
    `;
  }
  renderStatusIndicator(status) {
    if (status === "completed") {
      return x`<wui-icon size="sm" color="success" name="checkmark"></wui-icon>`;
    }
    if (status === "failed") {
      return x`<wui-icon size="sm" color="error" name="close"></wui-icon>`;
    }
    if (status === "pending") {
      return x`<wui-loading-spinner color="accent-primary" size="sm"></wui-loading-spinner>`;
    }
    return null;
  }
  startPolling() {
    if (!this.pollingInterval) {
      this.fetchQuoteStatus();
      this.pollingInterval = setInterval(() => {
        this.fetchQuoteStatus();
      }, POLLING_INTERVAL_MS);
    }
  }
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  async fetchQuoteStatus() {
    const requestId = PayController.state.requestId;
    if (!requestId || TERMINAL_STATES.includes(this.quoteStatus)) {
      this.stopPolling();
    } else {
      try {
        await PayController.fetchQuoteStatus({ requestId });
        if (TERMINAL_STATES.includes(this.quoteStatus)) {
          this.stopPolling();
        }
      } catch {
        this.stopPolling();
      }
    }
  }
  initializeNamespace() {
    const namespace = ChainController.state.activeChain;
    this.namespace = namespace;
    this.caipAddress = ChainController.getAccountData(namespace)?.caipAddress;
    this.profileName = ChainController.getAccountData(namespace)?.profileName ?? null;
    this.unsubscribe.push(ChainController.subscribeChainProp("accountState", (accountState) => {
      this.caipAddress = accountState?.caipAddress;
      this.profileName = accountState?.profileName ?? null;
    }, namespace));
  }
  getWalletProperties({ namespace }) {
    if (!namespace) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorId = this.activeConnectorIds[namespace];
    if (!connectorId) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connector = ConnectorController.getConnector({ id: connectorId, namespace });
    if (!connector) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorImage = AssetUtil.getConnectorImage(connector);
    return {
      name: connector.name,
      image: connectorImage
    };
  }
};
W3mPayLoadingView.styles = styles$6;
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "paymentAsset", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "quoteStatus", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "quote", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "amount", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "namespace", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "caipAddress", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "profileName", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "activeConnectorIds", void 0);
__decorate$6([
  r()
], W3mPayLoadingView.prototype, "selectedExchange", void 0);
W3mPayLoadingView = __decorate$6([
  customElement("w3m-pay-loading-view")
], W3mPayLoadingView);
const styles$5 = i$1`
  :host {
    display: block;
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayFeesSkeleton = class W3mPayFeesSkeleton2 extends i {
  render() {
    return x`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-shimmer width="60px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Network Fee</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-shimmer
              width="75px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>

            <wui-flex alignItems="center" gap="01">
              <wui-shimmer width="14px" height="14px" rounded variant="light"></wui-shimmer>
              <wui-shimmer
                width="49px"
                height="14px"
                borderRadius="4xs"
                variant="light"
              ></wui-shimmer>
            </wui-flex>
          </wui-flex>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Service Fee</wui-text>
          <wui-shimmer width="75px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `;
  }
};
W3mPayFeesSkeleton.styles = [styles$5];
W3mPayFeesSkeleton = __decorate$5([
  customElement("w3m-pay-fees-skeleton")
], W3mPayFeesSkeleton);
const styles$4 = css`
  :host {
    display: block;
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayFees = class W3mPayFees2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.quote = PayController.state.quote;
    this.unsubscribe.push(PayController.subscribeKey("quote", (val) => this.quote = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const amount = NumberUtil.formatNumber(this.quote?.origin.amount || "0", {
      decimals: this.quote?.origin.currency.metadata.decimals ?? 0,
      round: 6
    }).toString();
    return x`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-text variant="md-regular" color="primary">
            ${amount} ${this.quote?.origin.currency.metadata.symbol || "Unknown"}
          </wui-text>
        </wui-flex>

        ${this.quote && this.quote.fees.length > 0 ? this.quote.fees.map((fee) => this.renderFee(fee)) : null}
      </wui-flex>
    `;
  }
  renderFee(fee) {
    const isNetworkFee = fee.id === "network";
    const feeAmount = NumberUtil.formatNumber(fee.amount || "0", {
      decimals: fee.currency.metadata.decimals ?? 0,
      round: 6
    }).toString();
    if (isNetworkFee) {
      const allNetworks = ChainController.getAllRequestedCaipNetworks();
      const targetNetwork = allNetworks.find((net) => HelpersUtil.isLowerCaseMatch(net.caipNetworkId, fee.currency.network));
      return x`
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">${fee.label}</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-text variant="md-regular" color="primary">
              ${feeAmount} ${fee.currency.metadata.symbol || "Unknown"}
            </wui-text>

            <wui-flex alignItems="center" gap="01">
              <wui-image
                src=${o(AssetUtil.getNetworkImage(targetNetwork))}
                size="xs"
              ></wui-image>
              <wui-text variant="sm-regular" color="secondary">
                ${targetNetwork?.name || "Unknown"}
              </wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      `;
    }
    return x`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-text variant="md-regular" color="secondary">${fee.label}</wui-text>
        <wui-text variant="md-regular" color="primary">
          ${feeAmount} ${fee.currency.metadata.symbol || "Unknown"}
        </wui-text>
      </wui-flex>
    `;
  }
};
W3mPayFees.styles = [styles$4];
__decorate$4([
  r()
], W3mPayFees.prototype, "quote", void 0);
W3mPayFees = __decorate$4([
  customElement("w3m-pay-fees")
], W3mPayFees);
const styles$3 = css`
  :host {
    display: block;
    width: 100%;
  }

  .disabled-container {
    padding: ${({ spacing }) => spacing[2]};
    min-height: 168px;
  }

  wui-icon {
    width: ${({ spacing }) => spacing[8]};
    height: ${({ spacing }) => spacing[8]};
  }

  wui-flex > wui-text {
    max-width: 273px;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayOptionsEmpty = class W3mPayOptionsEmpty2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.selectedExchange = PayController.state.selectedExchange;
    this.unsubscribe.push(PayController.subscribeKey("selectedExchange", (val) => this.selectedExchange = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const isUsingExchange = Boolean(this.selectedExchange);
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
        class="disabled-container"
      >
        <wui-icon name="coins" color="default" size="inherit"></wui-icon>

        <wui-text variant="md-regular" color="primary" align="center">
          You don't have enough funds to complete this transaction
        </wui-text>

        ${isUsingExchange ? null : x`<wui-button
              size="md"
              variant="neutral-secondary"
              @click=${this.dispatchConnectOtherWalletEvent.bind(this)}
              >Connect other wallet</wui-button
            >`}
      </wui-flex>
    `;
  }
  dispatchConnectOtherWalletEvent() {
    this.dispatchEvent(new CustomEvent("connectOtherWallet", {
      detail: true,
      bubbles: true,
      composed: true
    }));
  }
};
W3mPayOptionsEmpty.styles = [styles$3];
__decorate$3([
  n({ type: Array })
], W3mPayOptionsEmpty.prototype, "selectedExchange", void 0);
W3mPayOptionsEmpty = __decorate$3([
  customElement("w3m-pay-options-empty")
], W3mPayOptionsEmpty);
const styles$2 = css`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    padding: ${({ spacing }) => spacing[3]};
    min-height: 60px;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    bottom: -3px;
    right: -5px;
    border: 2px solid ${({ tokens }) => tokens.theme.foregroundSecondary};
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayOptionsSkeleton = class W3mPayOptionsSkeleton2 extends i {
  render() {
    return x`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.renderOptionEntry()} ${this.renderOptionEntry()} ${this.renderOptionEntry()}
      </wui-flex>
    `;
  }
  renderOptionEntry() {
    return x`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-shimmer
              width="32px"
              height="32px"
              rounded
              variant="light"
              class="token-image"
            ></wui-shimmer>
            <wui-shimmer
              width="16px"
              height="16px"
              rounded
              variant="light"
              class="chain-image"
            ></wui-shimmer>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-shimmer
              width="74px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
            <wui-shimmer
              width="46px"
              height="14px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `;
  }
};
W3mPayOptionsSkeleton.styles = [styles$2];
W3mPayOptionsSkeleton = __decorate$2([
  customElement("w3m-pay-options-skeleton")
], W3mPayOptionsSkeleton);
const styles$1 = css`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    mask-image: var(--options-mask-image);
    -webkit-mask-image: var(--options-mask-image);
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    cursor: pointer;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    padding: ${({ spacing }) => spacing[3]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: background-color;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
    width: 32px;
    height: 32px;
  }

  .chain-image {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({ borderRadius }) => borderRadius.round};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  @media (hover: hover) and (pointer: fine) {
    .pay-option-container:hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const SCROLL_THRESHOLD = 300;
let W3mPayOptions = class W3mPayOptions2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.options = [];
    this.selectedPaymentAsset = null;
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.resizeObserver?.disconnect();
    const optionsEl = this.shadowRoot?.querySelector(".pay-options-container");
    optionsEl?.removeEventListener("scroll", this.handleOptionsListScroll.bind(this));
  }
  firstUpdated() {
    const optionsEl = this.shadowRoot?.querySelector(".pay-options-container");
    if (optionsEl) {
      requestAnimationFrame(this.handleOptionsListScroll.bind(this));
      optionsEl?.addEventListener("scroll", this.handleOptionsListScroll.bind(this));
      this.resizeObserver = new ResizeObserver(() => {
        this.handleOptionsListScroll();
      });
      this.resizeObserver?.observe(optionsEl);
      this.handleOptionsListScroll();
    }
  }
  render() {
    return x`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.options.map((option) => this.payOptionTemplate(option))}
      </wui-flex>
    `;
  }
  payOptionTemplate(paymentAsset) {
    const { network, metadata, asset, amount = "0" } = paymentAsset;
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    const targetNetwork = allNetworks.find((net) => net.caipNetworkId === network);
    const paymentCaipAddress = `${network}:${asset}`;
    const selectedPaymentCaipAddress = `${this.selectedPaymentAsset?.network}:${this.selectedPaymentAsset?.asset}`;
    const isSelected = paymentCaipAddress === selectedPaymentCaipAddress;
    const bigAmount = NumberUtil.bigNumber(amount, { safe: true });
    const hasEnoughBalance = bigAmount.gt(0);
    return x`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        @click=${() => this.onSelect?.(paymentAsset)}
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-image
              src=${o(metadata.logoURI)}
              class="token-image"
              size="3xl"
            ></wui-image>
            <wui-image
              src=${o(AssetUtil.getNetworkImage(targetNetwork))}
              class="chain-image"
              size="md"
            ></wui-image>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="lg-regular" color="primary">${metadata.symbol}</wui-text>
            ${hasEnoughBalance ? x`<wui-text variant="sm-regular" color="secondary">
                  ${bigAmount.round(6).toString()} ${metadata.symbol}
                </wui-text>` : null}
          </wui-flex>
        </wui-flex>

        ${isSelected ? x`<wui-icon name="checkmark" size="md" color="success"></wui-icon>` : null}
      </wui-flex>
    `;
  }
  handleOptionsListScroll() {
    const optionsEl = this.shadowRoot?.querySelector(".pay-options-container");
    if (!optionsEl) {
      return;
    }
    const shouldApplyMask = optionsEl.scrollHeight > SCROLL_THRESHOLD;
    if (shouldApplyMask) {
      optionsEl.style.setProperty("--options-mask-image", `linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--options-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--options-scroll--top-opacity))) 1px,
          black 50px,
          black calc(100% - 50px),
          rgba(155, 155, 155, calc(1 - var(--options-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--options-scroll--bottom-opacity))) 100%
        )`);
      optionsEl.style.setProperty("--options-scroll--top-opacity", MathUtil.interpolate([0, 50], [0, 1], optionsEl.scrollTop).toString());
      optionsEl.style.setProperty("--options-scroll--bottom-opacity", MathUtil.interpolate([0, 50], [0, 1], optionsEl.scrollHeight - optionsEl.scrollTop - optionsEl.offsetHeight).toString());
    } else {
      optionsEl.style.setProperty("--options-mask-image", "none");
      optionsEl.style.setProperty("--options-scroll--top-opacity", "0");
      optionsEl.style.setProperty("--options-scroll--bottom-opacity", "0");
    }
  }
};
W3mPayOptions.styles = [styles$1];
__decorate$1([
  n({ type: Array })
], W3mPayOptions.prototype, "options", void 0);
__decorate$1([
  n()
], W3mPayOptions.prototype, "selectedPaymentAsset", void 0);
__decorate$1([
  n()
], W3mPayOptions.prototype, "onSelect", void 0);
W3mPayOptions = __decorate$1([
  customElement("w3m-pay-options")
], W3mPayOptions);
const styles = css`
  .payment-methods-container {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-top-right-radius: ${({ borderRadius }) => borderRadius[5]};
    border-top-left-radius: ${({ borderRadius }) => borderRadius[5]};
  }

  .pay-options-container {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[5]};
    padding: ${({ spacing }) => spacing[1]};
  }

  w3m-tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: fit-content;
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
  }

  w3m-pay-options.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const NAMESPACE_ICONS = {
  eip155: "ethereum",
  solana: "solana",
  bip122: "bitcoin",
  ton: "ton"
};
const NAMESPACE_LABELS = {
  eip155: { icon: NAMESPACE_ICONS.eip155, label: "EVM" },
  solana: { icon: NAMESPACE_ICONS.solana, label: "Solana" },
  bip122: { icon: NAMESPACE_ICONS.bip122, label: "Bitcoin" },
  ton: { icon: NAMESPACE_ICONS.ton, label: "Ton" }
};
let W3mPayQuoteView = class W3mPayQuoteView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.profileName = null;
    this.paymentAsset = PayController.state.paymentAsset;
    this.namespace = void 0;
    this.caipAddress = void 0;
    this.amount = PayController.state.amount;
    this.recipient = PayController.state.recipient;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.selectedPaymentAsset = PayController.state.selectedPaymentAsset;
    this.selectedExchange = PayController.state.selectedExchange;
    this.isFetchingQuote = PayController.state.isFetchingQuote;
    this.quoteError = PayController.state.quoteError;
    this.quote = PayController.state.quote;
    this.isFetchingTokenBalances = PayController.state.isFetchingTokenBalances;
    this.tokenBalances = PayController.state.tokenBalances;
    this.isPaymentInProgress = PayController.state.isPaymentInProgress;
    this.exchangeUrlForQuote = PayController.state.exchangeUrlForQuote;
    this.completedTransactionsCount = 0;
    this.unsubscribe.push(PayController.subscribeKey("paymentAsset", (val) => this.paymentAsset = val));
    this.unsubscribe.push(PayController.subscribeKey("tokenBalances", (val) => this.onTokenBalancesChanged(val)));
    this.unsubscribe.push(PayController.subscribeKey("isFetchingTokenBalances", (val) => this.isFetchingTokenBalances = val));
    this.unsubscribe.push(ConnectorController.subscribeKey("activeConnectorIds", (newActiveConnectorIds) => this.activeConnectorIds = newActiveConnectorIds));
    this.unsubscribe.push(PayController.subscribeKey("selectedPaymentAsset", (val) => this.selectedPaymentAsset = val));
    this.unsubscribe.push(PayController.subscribeKey("isFetchingQuote", (val) => this.isFetchingQuote = val));
    this.unsubscribe.push(PayController.subscribeKey("quoteError", (val) => this.quoteError = val));
    this.unsubscribe.push(PayController.subscribeKey("quote", (val) => this.quote = val));
    this.unsubscribe.push(PayController.subscribeKey("amount", (val) => this.amount = val));
    this.unsubscribe.push(PayController.subscribeKey("recipient", (val) => this.recipient = val));
    this.unsubscribe.push(PayController.subscribeKey("isPaymentInProgress", (val) => this.isPaymentInProgress = val));
    this.unsubscribe.push(PayController.subscribeKey("selectedExchange", (val) => this.selectedExchange = val));
    this.unsubscribe.push(PayController.subscribeKey("exchangeUrlForQuote", (val) => this.exchangeUrlForQuote = val));
    this.resetQuoteState();
    this.initializeNamespace();
    this.fetchTokens();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.resetAssetsState();
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    const shouldFetchQuote = changedProperties.has("selectedPaymentAsset");
    if (shouldFetchQuote) {
      this.fetchQuote();
    }
  }
  render() {
    return x`
      <wui-flex flexDirection="column">
        ${this.profileTemplate()}

        <wui-flex
          flexDirection="column"
          gap="4"
          class="payment-methods-container"
          .padding=${["4", "4", "5", "4"]}
        >
          ${this.paymentOptionsViewTemplate()} ${this.amountWithFeeTemplate()}

          <wui-flex
            alignItems="center"
            justifyContent="space-between"
            .padding=${["1", "0", "1", "0"]}
          >
            <wui-separator></wui-separator>
          </wui-flex>

          ${this.paymentActionsTemplate()}
        </wui-flex>
      </wui-flex>
    `;
  }
  profileTemplate() {
    if (this.selectedExchange) {
      const amount = NumberUtil.formatNumber(this.quote?.origin.amount, {
        decimals: this.quote?.origin.currency.metadata.decimals ?? 0
      }).toString();
      return x`
        <wui-flex
          .padding=${["4", "3", "4", "3"]}
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-text variant="lg-regular" color="secondary">Paying with</wui-text>

          ${this.quote ? x`<wui-text variant="lg-regular" color="primary">
                ${NumberUtil.bigNumber(amount, { safe: true }).round(6).toString()}
                ${this.quote.origin.currency.metadata.symbol}
              </wui-text>` : x`<wui-shimmer width="80px" height="18px" variant="light"></wui-shimmer>`}
        </wui-flex>
      `;
    }
    const address = CoreHelperUtil.getPlainAddress(this.caipAddress) ?? "";
    const { name, image } = this.getWalletProperties({ namespace: this.namespace });
    const { icon: chainIcon, label: chainLabel } = NAMESPACE_LABELS[this.namespace] ?? {};
    return x`
      <wui-flex
        .padding=${["4", "3", "4", "3"]}
        alignItems="center"
        justifyContent="space-between"
        gap="2"
      >
        <wui-wallet-switch
          profileName=${o(this.profileName)}
          address=${o(address)}
          imageSrc=${o(image)}
          alt=${o(name)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        <wui-wallet-switch
          profileName=${o(chainLabel)}
          address=${o(address)}
          icon=${o(chainIcon)}
          iconSize="xs"
          .enableGreenCircle=${false}
          alt=${o(chainLabel)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
      </wui-flex>
    `;
  }
  initializeNamespace() {
    const namespace = ChainController.state.activeChain;
    this.namespace = namespace;
    this.caipAddress = ChainController.getAccountData(namespace)?.caipAddress;
    this.profileName = ChainController.getAccountData(namespace)?.profileName ?? null;
    this.unsubscribe.push(ChainController.subscribeChainProp("accountState", (accountState) => this.onAccountStateChanged(accountState), namespace));
  }
  async fetchTokens() {
    if (this.namespace) {
      let caipNetwork = void 0;
      if (this.caipAddress) {
        const { chainId, chainNamespace } = ParseUtil.parseCaipAddress(this.caipAddress);
        const caipNetworkId = `${chainNamespace}:${chainId}`;
        const allNetworks = ChainController.getAllRequestedCaipNetworks();
        caipNetwork = allNetworks.find((net) => net.caipNetworkId === caipNetworkId);
      }
      await PayController.fetchTokens({
        caipAddress: this.caipAddress,
        caipNetwork,
        namespace: this.namespace
      });
    }
  }
  fetchQuote() {
    if (this.amount && this.recipient && this.selectedPaymentAsset && this.paymentAsset) {
      const { address } = this.caipAddress ? ParseUtil.parseCaipAddress(this.caipAddress) : {};
      PayController.fetchQuote({
        amount: this.amount.toString(),
        address,
        sourceToken: this.selectedPaymentAsset,
        toToken: this.paymentAsset,
        recipient: this.recipient
      });
    }
  }
  getWalletProperties({ namespace }) {
    if (!namespace) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorId = this.activeConnectorIds[namespace];
    if (!connectorId) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connector = ConnectorController.getConnector({ id: connectorId, namespace });
    if (!connector) {
      return {
        name: void 0,
        image: void 0
      };
    }
    const connectorImage = AssetUtil.getConnectorImage(connector);
    return {
      name: connector.name,
      image: connectorImage
    };
  }
  paymentOptionsViewTemplate() {
    return x`
      <wui-flex flexDirection="column" gap="2">
        <wui-text variant="sm-regular" color="secondary">CHOOSE PAYMENT OPTION</wui-text>
        <wui-flex class="pay-options-container">${this.paymentOptionsTemplate()}</wui-flex>
      </wui-flex>
    `;
  }
  paymentOptionsTemplate() {
    const paymentAssets = this.getPaymentAssetFromTokenBalances();
    if (this.isFetchingTokenBalances) {
      return x`<w3m-pay-options-skeleton></w3m-pay-options-skeleton>`;
    }
    if (paymentAssets.length === 0) {
      return x`<w3m-pay-options-empty
        @connectOtherWallet=${this.onConnectOtherWallet.bind(this)}
      ></w3m-pay-options-empty>`;
    }
    const classes = {
      disabled: this.isFetchingQuote
    };
    return x`<w3m-pay-options
      class=${e(classes)}
      .options=${paymentAssets}
      .selectedPaymentAsset=${o(this.selectedPaymentAsset)}
      .onSelect=${this.onSelectedPaymentAssetChanged.bind(this)}
    ></w3m-pay-options>`;
  }
  amountWithFeeTemplate() {
    if (this.isFetchingQuote || !this.selectedPaymentAsset || this.quoteError) {
      return x`<w3m-pay-fees-skeleton></w3m-pay-fees-skeleton>`;
    }
    return x`<w3m-pay-fees></w3m-pay-fees>`;
  }
  paymentActionsTemplate() {
    const isLoading = this.isFetchingQuote || this.isFetchingTokenBalances;
    const isDisabled = this.isFetchingQuote || this.isFetchingTokenBalances || !this.selectedPaymentAsset || Boolean(this.quoteError);
    const amount = NumberUtil.formatNumber(this.quote?.origin.amount ?? 0, {
      decimals: this.quote?.origin.currency.metadata.decimals ?? 0
    }).toString();
    if (this.selectedExchange) {
      if (isLoading || isDisabled) {
        return x`
          <wui-shimmer width="100%" height="48px" variant="light" ?rounded=${true}></wui-shimmer>
        `;
      }
      return x`<wui-button
        size="lg"
        fullWidth
        variant="accent-secondary"
        @click=${this.onPayWithExchange.bind(this)}
      >
        ${`Continue in ${this.selectedExchange.name}`}

        <wui-icon name="arrowRight" color="inherit" size="sm" slot="iconRight"></wui-icon>
      </wui-button>`;
    }
    return x`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="md-regular" color="secondary">Order Total</wui-text>

          ${isLoading || isDisabled ? x`<wui-shimmer width="58px" height="32px" variant="light"></wui-shimmer>` : x`<wui-flex alignItems="center" gap="01">
                <wui-text variant="h4-regular" color="primary">${formatAmount(amount)}</wui-text>

                <wui-text variant="lg-regular" color="secondary">
                  ${this.quote?.origin.currency.metadata.symbol || "Unknown"}
                </wui-text>
              </wui-flex>`}
        </wui-flex>

        ${this.actionButtonTemplate({ isLoading, isDisabled })}
      </wui-flex>
    `;
  }
  actionButtonTemplate(params) {
    const allTransactionSteps = getTransactionsSteps(this.quote);
    const { isLoading, isDisabled } = params;
    let label = "Pay";
    const isApprovalRequired = allTransactionSteps.length > 1 && this.completedTransactionsCount === 0;
    if (isApprovalRequired) {
      label = "Approve";
    }
    return x`
      <wui-button
        size="lg"
        variant="accent-primary"
        ?loading=${isLoading || this.isPaymentInProgress}
        ?disabled=${isDisabled || this.isPaymentInProgress}
        @click=${() => {
      if (allTransactionSteps.length > 0) {
        this.onSendTransactions();
      } else {
        this.onTransfer();
      }
    }}
      >
        ${label}
        ${isLoading ? null : x`<wui-icon
              name="arrowRight"
              color="inherit"
              size="sm"
              slot="iconRight"
            ></wui-icon>`}
      </wui-button>
    `;
  }
  getPaymentAssetFromTokenBalances() {
    if (!this.namespace) {
      return [];
    }
    const balances = this.tokenBalances[this.namespace] ?? [];
    const paymentOptionsWithFormattedBalances = balances.map((balance) => {
      try {
        return formatBalanceToPaymentAsset(balance);
      } catch (err) {
        return null;
      }
    }).filter((option) => Boolean(option));
    const paymentOptionsToShow = paymentOptionsWithFormattedBalances.filter((option) => {
      const { chainId: optionChainId } = ParseUtil.parseCaipNetworkId(option.network);
      const { chainId: paymentAssetChainId } = ParseUtil.parseCaipNetworkId(this.paymentAsset.network);
      if (HelpersUtil.isLowerCaseMatch(option.asset, this.paymentAsset.asset)) {
        return true;
      }
      if (this.selectedExchange) {
        return !HelpersUtil.isLowerCaseMatch(optionChainId.toString(), paymentAssetChainId.toString());
      }
      return true;
    });
    return paymentOptionsToShow;
  }
  onTokenBalancesChanged(tokenBalances) {
    this.tokenBalances = tokenBalances;
    const [paymentAsset] = this.getPaymentAssetFromTokenBalances();
    if (paymentAsset) {
      PayController.setSelectedPaymentAsset(paymentAsset);
    }
  }
  async onConnectOtherWallet() {
    await ConnectorController.connect();
    await ModalController.open({ view: "PayQuote" });
  }
  onAccountStateChanged(accountState) {
    const { address: oldAddress } = this.caipAddress ? ParseUtil.parseCaipAddress(this.caipAddress) : {};
    this.caipAddress = accountState?.caipAddress;
    this.profileName = accountState?.profileName ?? null;
    if (oldAddress) {
      const { address: newAddress } = this.caipAddress ? ParseUtil.parseCaipAddress(this.caipAddress) : {};
      if (!newAddress) {
        ModalController.close();
      } else if (!HelpersUtil.isLowerCaseMatch(newAddress, oldAddress)) {
        this.resetAssetsState();
        this.resetQuoteState();
        this.fetchTokens();
      }
    }
  }
  onSelectedPaymentAssetChanged(paymentAsset) {
    if (!this.isFetchingQuote) {
      PayController.setSelectedPaymentAsset(paymentAsset);
    }
  }
  async onTransfer() {
    const transferStep = getTransferStep(this.quote);
    if (transferStep) {
      const isQuoteAssetSameAsSelectedPaymentAsset = HelpersUtil.isLowerCaseMatch(this.selectedPaymentAsset?.asset, transferStep.deposit.currency);
      if (!isQuoteAssetSameAsSelectedPaymentAsset) {
        throw new Error("Quote asset is not the same as the selected payment asset");
      }
      const currentAmount = this.selectedPaymentAsset?.amount ?? "0";
      const amountToTransfer = NumberUtil.formatNumber(transferStep.deposit.amount, {
        decimals: this.selectedPaymentAsset?.metadata.decimals ?? 0
      }).toString();
      const hasEnoughFunds = NumberUtil.bigNumber(currentAmount).gte(amountToTransfer);
      if (!hasEnoughFunds) {
        SnackController.showError("Insufficient funds");
        return;
      }
      if (this.quote && this.selectedPaymentAsset && this.caipAddress && this.namespace) {
        const { address: fromAddress } = ParseUtil.parseCaipAddress(this.caipAddress);
        await PayController.onTransfer({
          chainNamespace: this.namespace,
          fromAddress,
          toAddress: transferStep.deposit.receiver,
          amount: amountToTransfer,
          paymentAsset: this.selectedPaymentAsset
        });
        PayController.setRequestId(transferStep.requestId);
        RouterController.push("PayLoading");
      }
    }
  }
  async onSendTransactions() {
    const currentAmount = this.selectedPaymentAsset?.amount ?? "0";
    const amountToSwap = NumberUtil.formatNumber(this.quote?.origin.amount ?? 0, {
      decimals: this.selectedPaymentAsset?.metadata.decimals ?? 0
    }).toString();
    const hasEnoughFunds = NumberUtil.bigNumber(currentAmount).gte(amountToSwap);
    if (!hasEnoughFunds) {
      SnackController.showError("Insufficient funds");
      return;
    }
    const allTransactionSteps = getTransactionsSteps(this.quote);
    const [transactionStep] = getTransactionsSteps(this.quote, this.completedTransactionsCount);
    if (transactionStep && this.namespace) {
      await PayController.onSendTransaction({
        namespace: this.namespace,
        transactionStep
      });
      this.completedTransactionsCount += 1;
      const hasCompletedAllTransactions = this.completedTransactionsCount === allTransactionSteps.length;
      if (hasCompletedAllTransactions) {
        PayController.setRequestId(transactionStep.requestId);
        RouterController.push("PayLoading");
      }
    }
  }
  onPayWithExchange() {
    if (this.exchangeUrlForQuote) {
      const popupWindow = CoreHelperUtil.returnOpenHref("", "popupWindow", "scrollbar=yes,width=480,height=720");
      if (!popupWindow) {
        throw new Error("Could not create popup window");
      }
      popupWindow.location.href = this.exchangeUrlForQuote;
      const transactionStep = getTransferStep(this.quote);
      if (transactionStep) {
        PayController.setRequestId(transactionStep.requestId);
      }
      PayController.initiatePayment();
      RouterController.push("PayLoading");
    }
  }
  resetAssetsState() {
    PayController.setSelectedPaymentAsset(null);
  }
  resetQuoteState() {
    PayController.resetQuoteState();
  }
};
W3mPayQuoteView.styles = styles;
__decorate([
  r()
], W3mPayQuoteView.prototype, "profileName", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "paymentAsset", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "namespace", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "caipAddress", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "amount", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "recipient", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "activeConnectorIds", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "selectedPaymentAsset", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "selectedExchange", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "isFetchingQuote", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "quoteError", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "quote", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "isFetchingTokenBalances", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "tokenBalances", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "isPaymentInProgress", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "exchangeUrlForQuote", void 0);
__decorate([
  r()
], W3mPayQuoteView.prototype, "completedTransactionsCount", void 0);
W3mPayQuoteView = __decorate([
  customElement("w3m-pay-quote-view")
], W3mPayQuoteView);
export {
  AppKitPayError as A,
  PayController as P,
  W3mPayView as W,
  AppKitPayErrorCodes as a,
  W3mPayLoadingView as b,
  W3mPayQuoteView as c
};
