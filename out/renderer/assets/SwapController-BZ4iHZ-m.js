import { N as NumberUtil, w as withErrorBoundary, p as proxy, R as RouterController, S as SnackController, m as ConnectionController, C as ConstantsUtil, b as EventsController, u as getPreferredAccountType, W as W3mFrameRpcConstants, a as ChainController, B as BlockchainApiController, c as CoreHelperUtil, y as SwapApiUtil, z as AlertController, D as BalanceUtil, h as ConstantsUtil$1, i as getActiveNetworkTokenAddress, l as ConnectorController, s as subscribeKey, k as subscribe } from "./walletconnect-BVoLvI4P.js";
const SwapCalculationUtil = {
  getGasPriceInEther(gas, gasPrice) {
    const totalGasCostInWei = gasPrice * gas;
    const totalGasCostInEther = Number(totalGasCostInWei) / 1e18;
    return totalGasCostInEther;
  },
  getGasPriceInUSD(networkPrice, gas, gasPrice) {
    const totalGasCostInEther = SwapCalculationUtil.getGasPriceInEther(gas, gasPrice);
    const networkPriceInUSD = NumberUtil.bigNumber(networkPrice);
    const gasCostInUSD = networkPriceInUSD.times(totalGasCostInEther);
    return gasCostInUSD.toNumber();
  },
  getPriceImpact({ sourceTokenAmount, sourceTokenPriceInUSD, toTokenPriceInUSD, toTokenAmount }) {
    const inputValue = NumberUtil.bigNumber(sourceTokenAmount).times(sourceTokenPriceInUSD);
    const outputValue = NumberUtil.bigNumber(toTokenAmount).times(toTokenPriceInUSD);
    const priceImpact = inputValue.minus(outputValue).div(inputValue).times(100);
    return priceImpact.toNumber();
  },
  getMaxSlippage(slippage, toTokenAmount) {
    const slippageToleranceDecimal = NumberUtil.bigNumber(slippage).div(100);
    const maxSlippageAmount = NumberUtil.multiply(toTokenAmount, slippageToleranceDecimal);
    return maxSlippageAmount.toNumber();
  },
  getProviderFee(sourceTokenAmount, feePercentage = 85e-4) {
    const providerFee = NumberUtil.bigNumber(sourceTokenAmount).times(feePercentage);
    return providerFee.toString();
  },
  isInsufficientNetworkTokenForGas(networkBalanceInUSD, gasPriceInUSD) {
    const gasPrice = gasPriceInUSD || "0";
    if (NumberUtil.bigNumber(networkBalanceInUSD).eq(0)) {
      return true;
    }
    return NumberUtil.bigNumber(NumberUtil.bigNumber(gasPrice)).gt(networkBalanceInUSD);
  },
  isInsufficientSourceTokenForSwap(sourceTokenAmount, sourceTokenAddress, balance) {
    const sourceTokenBalance = balance?.find((token) => token.address === sourceTokenAddress)?.quantity?.numeric;
    const isInSufficientBalance = NumberUtil.bigNumber(sourceTokenBalance || "0").lt(sourceTokenAmount);
    return isInSufficientBalance;
  }
};
const INITIAL_GAS_LIMIT = 15e4;
const TO_AMOUNT_DECIMALS = 6;
const initialState = {
  // Loading states
  initializing: false,
  initialized: false,
  loadingPrices: false,
  loadingQuote: false,
  loadingApprovalTransaction: false,
  loadingBuildTransaction: false,
  loadingTransaction: false,
  // Control states
  switchingTokens: false,
  // Error states
  fetchError: false,
  // Approval & Swap transaction states
  approvalTransaction: void 0,
  swapTransaction: void 0,
  transactionError: void 0,
  // Input values
  sourceToken: void 0,
  sourceTokenAmount: "",
  sourceTokenPriceInUSD: 0,
  toToken: void 0,
  toTokenAmount: "",
  toTokenPriceInUSD: 0,
  networkPrice: "0",
  networkBalanceInUSD: "0",
  networkTokenSymbol: "",
  inputError: void 0,
  // Request values
  slippage: ConstantsUtil$1.CONVERT_SLIPPAGE_TOLERANCE,
  // Tokens
  tokens: void 0,
  popularTokens: void 0,
  suggestedTokens: void 0,
  foundTokens: void 0,
  myTokensWithBalance: void 0,
  tokensPriceMap: {},
  // Calculations
  gasFee: "0",
  gasPriceInUSD: 0,
  priceImpact: void 0,
  maxSlippage: void 0,
  providerFee: void 0
};
const state = proxy({ ...initialState });
const controller = {
  state,
  subscribe(callback) {
    return subscribe(state, () => callback(state));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state, key, callback);
  },
  getParams() {
    const namespace = ChainController.state.activeChain;
    const caipAddress = ChainController.getAccountData(namespace)?.caipAddress ?? ChainController.state.activeCaipAddress;
    const address = CoreHelperUtil.getPlainAddress(caipAddress);
    const networkAddress = getActiveNetworkTokenAddress();
    const connectorId = ConnectorController.getConnectorId(ChainController.state.activeChain);
    if (!address) {
      throw new Error("No address found to swap the tokens from.");
    }
    const invalidToToken = !state.toToken?.address || !state.toToken?.decimals;
    const invalidSourceToken = !state.sourceToken?.address || !state.sourceToken?.decimals || !NumberUtil.bigNumber(state.sourceTokenAmount).gt(0);
    const invalidSourceTokenAmount = !state.sourceTokenAmount;
    return {
      networkAddress,
      fromAddress: address,
      fromCaipAddress: caipAddress,
      sourceTokenAddress: state.sourceToken?.address,
      toTokenAddress: state.toToken?.address,
      toTokenAmount: state.toTokenAmount,
      toTokenDecimals: state.toToken?.decimals,
      sourceTokenAmount: state.sourceTokenAmount,
      sourceTokenDecimals: state.sourceToken?.decimals,
      invalidToToken,
      invalidSourceToken,
      invalidSourceTokenAmount,
      availableToSwap: caipAddress && !invalidToToken && !invalidSourceToken && !invalidSourceTokenAmount,
      isAuthConnector: connectorId === ConstantsUtil.CONNECTOR_ID.AUTH
    };
  },
  async setSourceToken(sourceToken) {
    if (!sourceToken) {
      state.sourceToken = sourceToken;
      state.sourceTokenAmount = "";
      state.sourceTokenPriceInUSD = 0;
      return;
    }
    state.sourceToken = sourceToken;
    await SwapController.setTokenPrice(sourceToken.address, "sourceToken");
  },
  setSourceTokenAmount(amount) {
    state.sourceTokenAmount = amount;
  },
  async setToToken(toToken) {
    if (!toToken) {
      state.toToken = toToken;
      state.toTokenAmount = "";
      state.toTokenPriceInUSD = 0;
      return;
    }
    state.toToken = toToken;
    await SwapController.setTokenPrice(toToken.address, "toToken");
  },
  setToTokenAmount(amount) {
    state.toTokenAmount = amount ? NumberUtil.toFixed(amount, TO_AMOUNT_DECIMALS) : "";
  },
  async setTokenPrice(address, target) {
    let price = state.tokensPriceMap[address] || 0;
    if (!price) {
      state.loadingPrices = true;
      price = await SwapController.getAddressPrice(address);
    }
    if (target === "sourceToken") {
      state.sourceTokenPriceInUSD = price;
    } else if (target === "toToken") {
      state.toTokenPriceInUSD = price;
    }
    if (state.loadingPrices) {
      state.loadingPrices = false;
    }
    if (SwapController.getParams().availableToSwap && !state.switchingTokens) {
      SwapController.swapTokens();
    }
  },
  async switchTokens() {
    if (state.initializing || !state.initialized || state.switchingTokens) {
      return;
    }
    state.switchingTokens = true;
    try {
      const newSourceToken = state.toToken ? { ...state.toToken } : void 0;
      const newToToken = state.sourceToken ? { ...state.sourceToken } : void 0;
      const newSourceTokenAmount = newSourceToken && state.toTokenAmount === "" ? "1" : state.toTokenAmount;
      SwapController.setSourceTokenAmount(newSourceTokenAmount);
      SwapController.setToTokenAmount("");
      await SwapController.setSourceToken(newSourceToken);
      await SwapController.setToToken(newToToken);
      state.switchingTokens = false;
      SwapController.swapTokens();
    } catch (error) {
      state.switchingTokens = false;
      throw error;
    }
  },
  resetState() {
    state.myTokensWithBalance = initialState.myTokensWithBalance;
    state.tokensPriceMap = initialState.tokensPriceMap;
    state.initialized = initialState.initialized;
    state.initializing = initialState.initializing;
    state.switchingTokens = initialState.switchingTokens;
    state.sourceToken = initialState.sourceToken;
    state.sourceTokenAmount = initialState.sourceTokenAmount;
    state.sourceTokenPriceInUSD = initialState.sourceTokenPriceInUSD;
    state.toToken = initialState.toToken;
    state.toTokenAmount = initialState.toTokenAmount;
    state.toTokenPriceInUSD = initialState.toTokenPriceInUSD;
    state.networkPrice = initialState.networkPrice;
    state.networkTokenSymbol = initialState.networkTokenSymbol;
    state.networkBalanceInUSD = initialState.networkBalanceInUSD;
    state.inputError = initialState.inputError;
  },
  resetValues() {
    const { networkAddress } = SwapController.getParams();
    const networkToken = state.tokens?.find((token) => token.address === networkAddress);
    SwapController.setSourceToken(networkToken);
    SwapController.setToToken(void 0);
  },
  getApprovalLoadingState() {
    return state.loadingApprovalTransaction;
  },
  clearError() {
    state.transactionError = void 0;
  },
  async initializeState() {
    if (state.initializing) {
      return;
    }
    state.initializing = true;
    if (!state.initialized) {
      try {
        await SwapController.fetchTokens();
        state.initialized = true;
      } catch (error) {
        state.initialized = false;
        SnackController.showError("Failed to initialize swap");
        RouterController.goBack();
      }
    }
    state.initializing = false;
  },
  async fetchTokens() {
    const { networkAddress } = SwapController.getParams();
    await SwapController.getNetworkTokenPrice();
    await SwapController.getMyTokensWithBalance();
    const networkToken = state.myTokensWithBalance?.find((token) => token.address === networkAddress);
    if (networkToken) {
      state.networkTokenSymbol = networkToken.symbol;
      SwapController.setSourceToken(networkToken);
      SwapController.setSourceTokenAmount("0");
    }
  },
  async getTokenList() {
    const activeCaipNetworkId = ChainController.state.activeCaipNetwork?.caipNetworkId;
    if (state.caipNetworkId === activeCaipNetworkId && state.tokens) {
      return;
    }
    try {
      state.tokensLoading = true;
      const tokens = await SwapApiUtil.getTokenList(activeCaipNetworkId);
      state.tokens = tokens;
      state.caipNetworkId = activeCaipNetworkId;
      state.popularTokens = tokens.sort((aTokenInfo, bTokenInfo) => {
        if (aTokenInfo.symbol < bTokenInfo.symbol) {
          return -1;
        }
        if (aTokenInfo.symbol > bTokenInfo.symbol) {
          return 1;
        }
        return 0;
      });
      const suggestedTokensByChain = activeCaipNetworkId && ConstantsUtil$1.SUGGESTED_TOKENS_BY_CHAIN?.[activeCaipNetworkId] || [];
      const suggestedTokenObjects = suggestedTokensByChain.map((symbol) => tokens.find((t) => t.symbol === symbol)).filter((t) => Boolean(t));
      const allSuggestedTokens = ConstantsUtil$1.SWAP_SUGGESTED_TOKENS || [];
      const allSuggestedTokenObjects = allSuggestedTokens.map((symbol) => tokens.find((t) => t.symbol === symbol)).filter((t) => Boolean(t)).filter((t) => !suggestedTokenObjects.some((ct) => ct.address === t.address));
      state.suggestedTokens = [...suggestedTokenObjects, ...allSuggestedTokenObjects];
    } catch (error) {
      state.tokens = [];
      state.popularTokens = [];
      state.suggestedTokens = [];
    } finally {
      state.tokensLoading = false;
    }
  },
  async getAddressPrice(address) {
    const existPrice = state.tokensPriceMap[address];
    if (existPrice) {
      return existPrice;
    }
    const response = await BlockchainApiController.fetchTokenPrice({
      addresses: [address]
    });
    const fungibles = response?.fungibles || [];
    const allTokens = [...state.tokens || [], ...state.myTokensWithBalance || []];
    const symbol = allTokens?.find((token) => token.address === address)?.symbol;
    const price = fungibles.find((p) => p.symbol.toLowerCase() === symbol?.toLowerCase())?.price || 0;
    const priceAsFloat = parseFloat(price.toString());
    state.tokensPriceMap[address] = priceAsFloat;
    return priceAsFloat;
  },
  async getNetworkTokenPrice() {
    const { networkAddress } = SwapController.getParams();
    const response = await BlockchainApiController.fetchTokenPrice({
      addresses: [networkAddress]
    }).catch(() => {
      SnackController.showError("Failed to fetch network token price");
      return { fungibles: [] };
    });
    const token = response.fungibles?.[0];
    const price = token?.price.toString() || "0";
    state.tokensPriceMap[networkAddress] = parseFloat(price);
    state.networkTokenSymbol = token?.symbol || "";
    state.networkPrice = price;
  },
  async getMyTokensWithBalance(forceUpdate) {
    const balances = await BalanceUtil.getMyTokensWithBalance({
      forceUpdate,
      caipNetwork: ChainController.state.activeCaipNetwork,
      address: ChainController.getAccountData()?.address
    });
    const swapBalances = SwapApiUtil.mapBalancesToSwapTokens(balances);
    if (!swapBalances) {
      return;
    }
    await SwapController.getInitialGasPrice();
    SwapController.setBalances(swapBalances);
  },
  setBalances(balances) {
    const { networkAddress } = SwapController.getParams();
    const caipNetwork = ChainController.state.activeCaipNetwork;
    if (!caipNetwork) {
      return;
    }
    const networkToken = balances.find((token) => token.address === networkAddress);
    balances.forEach((token) => {
      state.tokensPriceMap[token.address] = token.price || 0;
    });
    state.myTokensWithBalance = balances.filter((token) => token.address.startsWith(caipNetwork.caipNetworkId));
    state.networkBalanceInUSD = networkToken ? NumberUtil.multiply(networkToken.quantity.numeric, networkToken.price).toString() : "0";
  },
  async getInitialGasPrice() {
    const res = await SwapApiUtil.fetchGasPrice();
    if (!res) {
      return { gasPrice: null, gasPriceInUSD: null };
    }
    switch (ChainController.state?.activeCaipNetwork?.chainNamespace) {
      case ConstantsUtil.CHAIN.SOLANA:
        state.gasFee = res.standard ?? "0";
        state.gasPriceInUSD = NumberUtil.multiply(res.standard, state.networkPrice).div(1e9).toNumber();
        return {
          gasPrice: BigInt(state.gasFee),
          gasPriceInUSD: Number(state.gasPriceInUSD)
        };
      case ConstantsUtil.CHAIN.EVM:
      default:
        const value = res.standard ?? "0";
        const gasFee = BigInt(value);
        const gasLimit = BigInt(INITIAL_GAS_LIMIT);
        const gasPrice = SwapCalculationUtil.getGasPriceInUSD(state.networkPrice, gasLimit, gasFee);
        state.gasFee = value;
        state.gasPriceInUSD = gasPrice;
        return { gasPrice: gasFee, gasPriceInUSD: gasPrice };
    }
  },
  // -- Swap -------------------------------------- //
  async swapTokens() {
    const address = ChainController.getAccountData()?.address;
    const sourceToken = state.sourceToken;
    const toToken = state.toToken;
    const haveSourceTokenAmount = NumberUtil.bigNumber(state.sourceTokenAmount).gt(0);
    if (!haveSourceTokenAmount) {
      SwapController.setToTokenAmount("");
    }
    if (!toToken || !sourceToken || state.loadingPrices || !haveSourceTokenAmount || !address) {
      return;
    }
    state.loadingQuote = true;
    const amountDecimal = NumberUtil.bigNumber(state.sourceTokenAmount).times(10 ** sourceToken.decimals).round(0).toFixed(0);
    try {
      const quoteResponse = await BlockchainApiController.fetchSwapQuote({
        userAddress: address,
        from: sourceToken.address,
        to: toToken.address,
        gasPrice: state.gasFee,
        amount: amountDecimal.toString()
      });
      state.loadingQuote = false;
      const quoteToAmount = quoteResponse?.quotes?.[0]?.toAmount;
      if (!quoteToAmount) {
        AlertController.open({
          displayMessage: "Incorrect amount",
          debugMessage: "Please enter a valid amount"
        }, "error");
        return;
      }
      const toTokenAmount = NumberUtil.bigNumber(quoteToAmount).div(10 ** toToken.decimals).toString();
      SwapController.setToTokenAmount(toTokenAmount);
      const isInsufficientToken = SwapController.hasInsufficientToken(state.sourceTokenAmount, sourceToken.address);
      if (isInsufficientToken) {
        state.inputError = "Insufficient balance";
      } else {
        state.inputError = void 0;
        SwapController.setTransactionDetails();
      }
    } catch (error) {
      const response = await SwapApiUtil.handleSwapError(error);
      state.loadingQuote = false;
      state.inputError = response || "Insufficient balance";
    }
  },
  // -- Create Transactions -------------------------------------- //
  async getTransaction() {
    const { fromCaipAddress, availableToSwap } = SwapController.getParams();
    const sourceToken = state.sourceToken;
    const toToken = state.toToken;
    if (!fromCaipAddress || !availableToSwap || !sourceToken || !toToken || state.loadingQuote) {
      return void 0;
    }
    try {
      state.loadingBuildTransaction = true;
      const hasAllowance = await SwapApiUtil.fetchSwapAllowance({
        userAddress: fromCaipAddress,
        tokenAddress: sourceToken.address,
        sourceTokenAmount: state.sourceTokenAmount,
        sourceTokenDecimals: sourceToken.decimals
      });
      let transaction = void 0;
      if (hasAllowance) {
        transaction = await SwapController.createSwapTransaction();
      } else {
        transaction = await SwapController.createAllowanceTransaction();
      }
      state.loadingBuildTransaction = false;
      state.fetchError = false;
      return transaction;
    } catch (error) {
      RouterController.goBack();
      SnackController.showError("Failed to check allowance");
      state.loadingBuildTransaction = false;
      state.approvalTransaction = void 0;
      state.swapTransaction = void 0;
      state.fetchError = true;
      return void 0;
    }
  },
  async createAllowanceTransaction() {
    const { fromCaipAddress, sourceTokenAddress, toTokenAddress } = SwapController.getParams();
    if (!fromCaipAddress || !toTokenAddress) {
      return void 0;
    }
    if (!sourceTokenAddress) {
      throw new Error("createAllowanceTransaction - No source token address found.");
    }
    try {
      const response = await BlockchainApiController.generateApproveCalldata({
        from: sourceTokenAddress,
        to: toTokenAddress,
        userAddress: fromCaipAddress
      });
      const address = CoreHelperUtil.getPlainAddress(response.tx.from);
      if (!address) {
        throw new Error("SwapController:createAllowanceTransaction - address is required");
      }
      const transaction = {
        data: response.tx.data,
        to: address,
        gasPrice: BigInt(response.tx.eip155.gasPrice),
        value: BigInt(response.tx.value),
        toAmount: state.toTokenAmount
      };
      state.swapTransaction = void 0;
      state.approvalTransaction = {
        data: transaction.data,
        to: transaction.to,
        gasPrice: transaction.gasPrice,
        value: transaction.value,
        toAmount: transaction.toAmount
      };
      return {
        data: transaction.data,
        to: transaction.to,
        gasPrice: transaction.gasPrice,
        value: transaction.value,
        toAmount: transaction.toAmount
      };
    } catch (error) {
      RouterController.goBack();
      SnackController.showError("Failed to create approval transaction");
      state.approvalTransaction = void 0;
      state.swapTransaction = void 0;
      state.fetchError = true;
      return void 0;
    }
  },
  async createSwapTransaction() {
    const { networkAddress, fromCaipAddress, sourceTokenAmount } = SwapController.getParams();
    const sourceToken = state.sourceToken;
    const toToken = state.toToken;
    if (!fromCaipAddress || !sourceTokenAmount || !sourceToken || !toToken) {
      return void 0;
    }
    const amount = ConnectionController.parseUnits(sourceTokenAmount, sourceToken.decimals)?.toString();
    try {
      const response = await BlockchainApiController.generateSwapCalldata({
        userAddress: fromCaipAddress,
        from: sourceToken.address,
        to: toToken.address,
        amount,
        disableEstimate: true
      });
      const isSourceTokenIsNetworkToken = sourceToken.address === networkAddress;
      const gas = BigInt(response.tx.eip155.gas);
      const gasPrice = BigInt(response.tx.eip155.gasPrice);
      const address = CoreHelperUtil.getPlainAddress(response.tx.to);
      if (!address) {
        throw new Error("SwapController:createSwapTransaction - address is required");
      }
      const transaction = {
        data: response.tx.data,
        to: address,
        gas,
        gasPrice,
        value: isSourceTokenIsNetworkToken ? BigInt(amount ?? "0") : BigInt("0"),
        toAmount: state.toTokenAmount
      };
      state.gasPriceInUSD = SwapCalculationUtil.getGasPriceInUSD(state.networkPrice, gas, gasPrice);
      state.approvalTransaction = void 0;
      state.swapTransaction = transaction;
      return transaction;
    } catch (error) {
      RouterController.goBack();
      SnackController.showError("Failed to create transaction");
      state.approvalTransaction = void 0;
      state.swapTransaction = void 0;
      state.fetchError = true;
      return void 0;
    }
  },
  onEmbeddedWalletApprovalSuccess() {
    SnackController.showLoading("Approve limit increase in your wallet");
    RouterController.replace("SwapPreview");
  },
  // -- Send Transactions --------------------------------- //
  async sendTransactionForApproval(data) {
    const { fromAddress, isAuthConnector } = SwapController.getParams();
    state.loadingApprovalTransaction = true;
    const approveLimitMessage = `Approve limit increase in your wallet`;
    if (isAuthConnector) {
      RouterController.pushTransactionStack({
        onSuccess: SwapController.onEmbeddedWalletApprovalSuccess
      });
    } else {
      SnackController.showLoading(approveLimitMessage);
    }
    try {
      await ConnectionController.sendTransaction({
        address: fromAddress,
        to: data.to,
        data: data.data,
        value: data.value,
        chainNamespace: ConstantsUtil.CHAIN.EVM
      });
      await SwapController.swapTokens();
      await SwapController.getTransaction();
      state.approvalTransaction = void 0;
      state.loadingApprovalTransaction = false;
    } catch (err) {
      const error = err;
      state.transactionError = error?.displayMessage;
      state.loadingApprovalTransaction = false;
      SnackController.showError(error?.displayMessage || "Transaction error");
      EventsController.sendEvent({
        type: "track",
        event: "SWAP_APPROVAL_ERROR",
        properties: {
          message: error?.displayMessage || error?.message || "Unknown",
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || "",
          swapFromToken: SwapController.state.sourceToken?.symbol || "",
          swapToToken: SwapController.state.toToken?.symbol || "",
          swapFromAmount: SwapController.state.sourceTokenAmount || "",
          swapToAmount: SwapController.state.toTokenAmount || "",
          isSmartAccount: getPreferredAccountType(ConstantsUtil.CHAIN.EVM) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      });
    }
  },
  async sendTransactionForSwap(data) {
    if (!data) {
      return void 0;
    }
    const { fromAddress, toTokenAmount, isAuthConnector } = SwapController.getParams();
    state.loadingTransaction = true;
    const snackbarPendingMessage = `Swapping ${state.sourceToken?.symbol} to ${NumberUtil.formatNumberToLocalString(toTokenAmount, 3)} ${state.toToken?.symbol}`;
    const snackbarSuccessMessage = `Swapped ${state.sourceToken?.symbol} to ${NumberUtil.formatNumberToLocalString(toTokenAmount, 3)} ${state.toToken?.symbol}`;
    if (isAuthConnector) {
      RouterController.pushTransactionStack({
        onSuccess() {
          RouterController.replace("Account");
          SnackController.showLoading(snackbarPendingMessage);
          controller.resetState();
        }
      });
    } else {
      SnackController.showLoading("Confirm transaction in your wallet");
    }
    try {
      const forceUpdateAddresses = [state.sourceToken?.address, state.toToken?.address].join(",");
      const transactionHash = await ConnectionController.sendTransaction({
        address: fromAddress,
        to: data.to,
        data: data.data,
        value: data.value,
        chainNamespace: ConstantsUtil.CHAIN.EVM
      });
      state.loadingTransaction = false;
      SnackController.showSuccess(snackbarSuccessMessage);
      EventsController.sendEvent({
        type: "track",
        event: "SWAP_SUCCESS",
        properties: {
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || "",
          swapFromToken: SwapController.state.sourceToken?.symbol || "",
          swapToToken: SwapController.state.toToken?.symbol || "",
          swapFromAmount: SwapController.state.sourceTokenAmount || "",
          swapToAmount: SwapController.state.toTokenAmount || "",
          isSmartAccount: getPreferredAccountType(ConstantsUtil.CHAIN.EVM) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      });
      controller.resetState();
      if (!isAuthConnector) {
        RouterController.replace("Account");
      }
      controller.getMyTokensWithBalance(forceUpdateAddresses);
      return transactionHash;
    } catch (err) {
      const error = err;
      state.transactionError = error?.displayMessage;
      state.loadingTransaction = false;
      SnackController.showError(error?.displayMessage || "Transaction error");
      EventsController.sendEvent({
        type: "track",
        event: "SWAP_ERROR",
        properties: {
          message: error?.displayMessage || error?.message || "Unknown",
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || "",
          swapFromToken: SwapController.state.sourceToken?.symbol || "",
          swapToToken: SwapController.state.toToken?.symbol || "",
          swapFromAmount: SwapController.state.sourceTokenAmount || "",
          swapToAmount: SwapController.state.toTokenAmount || "",
          isSmartAccount: getPreferredAccountType(ConstantsUtil.CHAIN.EVM) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      });
      return void 0;
    }
  },
  // -- Checks -------------------------------------------- //
  hasInsufficientToken(sourceTokenAmount, sourceTokenAddress) {
    const isInsufficientSourceTokenForSwap = SwapCalculationUtil.isInsufficientSourceTokenForSwap(sourceTokenAmount, sourceTokenAddress, state.myTokensWithBalance);
    return isInsufficientSourceTokenForSwap;
  },
  // -- Calculations -------------------------------------- //
  setTransactionDetails() {
    const { toTokenAddress, toTokenDecimals } = SwapController.getParams();
    if (!toTokenAddress || !toTokenDecimals) {
      return;
    }
    state.gasPriceInUSD = SwapCalculationUtil.getGasPriceInUSD(state.networkPrice, BigInt(state.gasFee), BigInt(INITIAL_GAS_LIMIT));
    state.priceImpact = SwapCalculationUtil.getPriceImpact({
      sourceTokenAmount: state.sourceTokenAmount,
      sourceTokenPriceInUSD: state.sourceTokenPriceInUSD,
      toTokenPriceInUSD: state.toTokenPriceInUSD,
      toTokenAmount: state.toTokenAmount
    });
    state.maxSlippage = SwapCalculationUtil.getMaxSlippage(state.slippage, state.toTokenAmount);
    state.providerFee = SwapCalculationUtil.getProviderFee(state.sourceTokenAmount);
  }
};
const SwapController = withErrorBoundary(controller);
export {
  SwapController as S
};
