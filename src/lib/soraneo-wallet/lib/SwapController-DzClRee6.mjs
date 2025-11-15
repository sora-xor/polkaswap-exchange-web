import {
  N as u,
  w as D,
  p as B,
  R as p,
  S as T,
  o as P,
  q as m,
  E as I,
  t as h,
  W as y,
  C as k,
  B as f,
  a as b,
  u as A,
  A as M,
  y as F,
  d as U,
  e as L,
  z as W,
  s as _,
  i as x,
} from './index-CgrbEUSl.mjs';
const g = {
    getGasPriceInEther(n, o) {
      const t = o * n;
      return Number(t) / 1e18;
    },
    getGasPriceInUSD(n, o, t) {
      const r = g.getGasPriceInEther(o, t);
      return u.bigNumber(n).times(r).toNumber();
    },
    getPriceImpact({ sourceTokenAmount: n, sourceTokenPriceInUSD: o, toTokenPriceInUSD: t, toTokenAmount: r }) {
      const i = u.bigNumber(n).times(o),
        a = u.bigNumber(r).times(t);
      return i.minus(a).div(i).times(100).toNumber();
    },
    getMaxSlippage(n, o) {
      const t = u.bigNumber(n).div(100);
      return u.multiply(o, t).toNumber();
    },
    getProviderFee(n, o = 85e-4) {
      return u.bigNumber(n).times(o).toString();
    },
    isInsufficientNetworkTokenForGas(n, o) {
      const t = o || '0';
      return u.bigNumber(n).eq(0) ? !0 : u.bigNumber(u.bigNumber(t)).gt(n);
    },
    isInsufficientSourceTokenForSwap(n, o, t) {
      const r = t?.find((a) => a.address === o)?.quantity?.numeric;
      return u.bigNumber(r || '0').lt(n);
    },
  },
  E = 15e4,
  G = 6,
  l = {
    // Loading states
    initializing: !1,
    initialized: !1,
    loadingPrices: !1,
    loadingQuote: !1,
    loadingApprovalTransaction: !1,
    loadingBuildTransaction: !1,
    loadingTransaction: !1,
    // Control states
    switchingTokens: !1,
    // Error states
    fetchError: !1,
    // Approval & Swap transaction states
    approvalTransaction: void 0,
    swapTransaction: void 0,
    transactionError: void 0,
    // Input values
    sourceToken: void 0,
    sourceTokenAmount: '',
    sourceTokenPriceInUSD: 0,
    toToken: void 0,
    toTokenAmount: '',
    toTokenPriceInUSD: 0,
    networkPrice: '0',
    networkBalanceInUSD: '0',
    networkTokenSymbol: '',
    inputError: void 0,
    // Request values
    slippage: U.CONVERT_SLIPPAGE_TOLERANCE,
    // Tokens
    tokens: void 0,
    popularTokens: void 0,
    suggestedTokens: void 0,
    foundTokens: void 0,
    myTokensWithBalance: void 0,
    tokensPriceMap: {},
    // Calculations
    gasFee: '0',
    gasPriceInUSD: 0,
    priceImpact: void 0,
    maxSlippage: void 0,
    providerFee: void 0,
  },
  e = B({ ...l }),
  S = {
    state: e,
    subscribe(n) {
      return x(e, () => n(e));
    },
    subscribeKey(n, o) {
      return _(e, n, o);
    },
    getParams() {
      const n = k.state.activeChain,
        o = k.getAccountData(n)?.caipAddress ?? k.state.activeCaipAddress,
        t = b.getPlainAddress(o),
        r = L(),
        i = W.getConnectorId(k.state.activeChain);
      if (!t) throw new Error('No address found to swap the tokens from.');
      const a = !e.toToken?.address || !e.toToken?.decimals,
        c = !e.sourceToken?.address || !e.sourceToken?.decimals || !u.bigNumber(e.sourceTokenAmount).gt(0),
        d = !e.sourceTokenAmount;
      return {
        networkAddress: r,
        fromAddress: t,
        fromCaipAddress: o,
        sourceTokenAddress: e.sourceToken?.address,
        toTokenAddress: e.toToken?.address,
        toTokenAmount: e.toTokenAmount,
        toTokenDecimals: e.toToken?.decimals,
        sourceTokenAmount: e.sourceTokenAmount,
        sourceTokenDecimals: e.sourceToken?.decimals,
        invalidToToken: a,
        invalidSourceToken: c,
        invalidSourceTokenAmount: d,
        availableToSwap: o && !a && !c && !d,
        isAuthConnector: i === m.CONNECTOR_ID.AUTH,
      };
    },
    async setSourceToken(n) {
      if (!n) {
        ((e.sourceToken = n), (e.sourceTokenAmount = ''), (e.sourceTokenPriceInUSD = 0));
        return;
      }
      ((e.sourceToken = n), await s.setTokenPrice(n.address, 'sourceToken'));
    },
    setSourceTokenAmount(n) {
      e.sourceTokenAmount = n;
    },
    async setToToken(n) {
      if (!n) {
        ((e.toToken = n), (e.toTokenAmount = ''), (e.toTokenPriceInUSD = 0));
        return;
      }
      ((e.toToken = n), await s.setTokenPrice(n.address, 'toToken'));
    },
    setToTokenAmount(n) {
      e.toTokenAmount = n ? u.toFixed(n, G) : '';
    },
    async setTokenPrice(n, o) {
      let t = e.tokensPriceMap[n] || 0;
      (t || ((e.loadingPrices = !0), (t = await s.getAddressPrice(n))),
        o === 'sourceToken' ? (e.sourceTokenPriceInUSD = t) : o === 'toToken' && (e.toTokenPriceInUSD = t),
        e.loadingPrices && (e.loadingPrices = !1),
        s.getParams().availableToSwap && !e.switchingTokens && s.swapTokens());
    },
    async switchTokens() {
      if (!(e.initializing || !e.initialized || e.switchingTokens)) {
        e.switchingTokens = !0;
        try {
          const n = e.toToken ? { ...e.toToken } : void 0,
            o = e.sourceToken ? { ...e.sourceToken } : void 0,
            t = n && e.toTokenAmount === '' ? '1' : e.toTokenAmount;
          (s.setSourceTokenAmount(t),
            s.setToTokenAmount(''),
            await s.setSourceToken(n),
            await s.setToToken(o),
            (e.switchingTokens = !1),
            s.swapTokens());
        } catch (n) {
          throw ((e.switchingTokens = !1), n);
        }
      }
    },
    resetState() {
      ((e.myTokensWithBalance = l.myTokensWithBalance),
        (e.tokensPriceMap = l.tokensPriceMap),
        (e.initialized = l.initialized),
        (e.initializing = l.initializing),
        (e.switchingTokens = l.switchingTokens),
        (e.sourceToken = l.sourceToken),
        (e.sourceTokenAmount = l.sourceTokenAmount),
        (e.sourceTokenPriceInUSD = l.sourceTokenPriceInUSD),
        (e.toToken = l.toToken),
        (e.toTokenAmount = l.toTokenAmount),
        (e.toTokenPriceInUSD = l.toTokenPriceInUSD),
        (e.networkPrice = l.networkPrice),
        (e.networkTokenSymbol = l.networkTokenSymbol),
        (e.networkBalanceInUSD = l.networkBalanceInUSD),
        (e.inputError = l.inputError));
    },
    resetValues() {
      const { networkAddress: n } = s.getParams(),
        o = e.tokens?.find((t) => t.address === n);
      (s.setSourceToken(o), s.setToToken(void 0));
    },
    getApprovalLoadingState() {
      return e.loadingApprovalTransaction;
    },
    clearError() {
      e.transactionError = void 0;
    },
    async initializeState() {
      if (!e.initializing) {
        if (((e.initializing = !0), !e.initialized))
          try {
            (await s.fetchTokens(), (e.initialized = !0));
          } catch {
            ((e.initialized = !1), T.showError('Failed to initialize swap'), p.goBack());
          }
        e.initializing = !1;
      }
    },
    async fetchTokens() {
      const { networkAddress: n } = s.getParams();
      (await s.getNetworkTokenPrice(), await s.getMyTokensWithBalance());
      const o = e.myTokensWithBalance?.find((t) => t.address === n);
      o && ((e.networkTokenSymbol = o.symbol), s.setSourceToken(o), s.setSourceTokenAmount('0'));
    },
    async getTokenList() {
      const n = k.state.activeCaipNetwork?.caipNetworkId;
      if (!(e.caipNetworkId === n && e.tokens))
        try {
          e.tokensLoading = !0;
          const o = await A.getTokenList(n);
          ((e.tokens = o),
            (e.caipNetworkId = n),
            (e.popularTokens = o.sort((t, r) => (t.symbol < r.symbol ? -1 : t.symbol > r.symbol ? 1 : 0))),
            (e.suggestedTokens = o.filter((t) => !!U.SWAP_SUGGESTED_TOKENS.includes(t.symbol))));
        } catch {
          ((e.tokens = []), (e.popularTokens = []), (e.suggestedTokens = []));
        } finally {
          e.tokensLoading = !1;
        }
    },
    async getAddressPrice(n) {
      const o = e.tokensPriceMap[n];
      if (o) return o;
      const r =
          (
            await f.fetchTokenPrice({
              addresses: [n],
            })
          )?.fungibles || [],
        a = [...(e.tokens || []), ...(e.myTokensWithBalance || [])]?.find((w) => w.address === n)?.symbol,
        c = r.find((w) => w.symbol.toLowerCase() === a?.toLowerCase())?.price || 0,
        d = parseFloat(c.toString());
      return ((e.tokensPriceMap[n] = d), d);
    },
    async getNetworkTokenPrice() {
      const { networkAddress: n } = s.getParams(),
        t = (
          await f
            .fetchTokenPrice({
              addresses: [n],
            })
            .catch(() => (T.showError('Failed to fetch network token price'), { fungibles: [] }))
        ).fungibles?.[0],
        r = t?.price.toString() || '0';
      ((e.tokensPriceMap[n] = parseFloat(r)), (e.networkTokenSymbol = t?.symbol || ''), (e.networkPrice = r));
    },
    async getMyTokensWithBalance(n) {
      const o = await F.getMyTokensWithBalance(n),
        t = A.mapBalancesToSwapTokens(o);
      t && (await s.getInitialGasPrice(), s.setBalances(t));
    },
    setBalances(n) {
      const { networkAddress: o } = s.getParams(),
        t = k.state.activeCaipNetwork;
      if (!t) return;
      const r = n.find((i) => i.address === o);
      (n.forEach((i) => {
        e.tokensPriceMap[i.address] = i.price || 0;
      }),
        (e.myTokensWithBalance = n.filter((i) => i.address.startsWith(t.caipNetworkId))),
        (e.networkBalanceInUSD = r ? u.multiply(r.quantity.numeric, r.price).toString() : '0'));
    },
    async getInitialGasPrice() {
      const n = await A.fetchGasPrice();
      if (!n) return { gasPrice: null, gasPriceInUSD: null };
      switch (k.state?.activeCaipNetwork?.chainNamespace) {
        case m.CHAIN.SOLANA:
          return (
            (e.gasFee = n.standard ?? '0'),
            (e.gasPriceInUSD = u.multiply(n.standard, e.networkPrice).div(1e9).toNumber()),
            {
              gasPrice: BigInt(e.gasFee),
              gasPriceInUSD: Number(e.gasPriceInUSD),
            }
          );
        case m.CHAIN.EVM:
        default:
          const o = n.standard ?? '0',
            t = BigInt(o),
            r = BigInt(E),
            i = g.getGasPriceInUSD(e.networkPrice, r, t);
          return ((e.gasFee = o), (e.gasPriceInUSD = i), { gasPrice: t, gasPriceInUSD: i });
      }
    },
    // -- Swap -------------------------------------- //
    async swapTokens() {
      const n = k.getAccountData()?.address,
        o = e.sourceToken,
        t = e.toToken,
        r = u.bigNumber(e.sourceTokenAmount).gt(0);
      if ((r || s.setToTokenAmount(''), !t || !o || e.loadingPrices || !r || !n)) return;
      e.loadingQuote = !0;
      const i = u
        .bigNumber(e.sourceTokenAmount)
        .times(10 ** o.decimals)
        .round(0);
      try {
        const a = await f.fetchSwapQuote({
          userAddress: n,
          from: o.address,
          to: t.address,
          gasPrice: e.gasFee,
          amount: i.toString(),
        });
        e.loadingQuote = !1;
        const c = a?.quotes?.[0]?.toAmount;
        if (!c) {
          M.open(
            {
              displayMessage: 'Incorrect amount',
              debugMessage: 'Please enter a valid amount',
            },
            'error'
          );
          return;
        }
        const d = u
          .bigNumber(c)
          .div(10 ** t.decimals)
          .toString();
        (s.setToTokenAmount(d),
          s.hasInsufficientToken(e.sourceTokenAmount, o.address)
            ? (e.inputError = 'Insufficient balance')
            : ((e.inputError = void 0), s.setTransactionDetails()));
      } catch (a) {
        const c = await A.handleSwapError(a);
        ((e.loadingQuote = !1), (e.inputError = c || 'Insufficient balance'));
      }
    },
    // -- Create Transactions -------------------------------------- //
    async getTransaction() {
      const { fromCaipAddress: n, availableToSwap: o } = s.getParams(),
        t = e.sourceToken,
        r = e.toToken;
      if (!(!n || !o || !t || !r || e.loadingQuote))
        try {
          e.loadingBuildTransaction = !0;
          const i = await A.fetchSwapAllowance({
            userAddress: n,
            tokenAddress: t.address,
            sourceTokenAmount: e.sourceTokenAmount,
            sourceTokenDecimals: t.decimals,
          });
          let a;
          return (
            i ? (a = await s.createSwapTransaction()) : (a = await s.createAllowanceTransaction()),
            (e.loadingBuildTransaction = !1),
            (e.fetchError = !1),
            a
          );
        } catch {
          (p.goBack(),
            T.showError('Failed to check allowance'),
            (e.loadingBuildTransaction = !1),
            (e.approvalTransaction = void 0),
            (e.swapTransaction = void 0),
            (e.fetchError = !0));
          return;
        }
    },
    async createAllowanceTransaction() {
      const { fromCaipAddress: n, sourceTokenAddress: o, toTokenAddress: t } = s.getParams();
      if (!(!n || !t)) {
        if (!o) throw new Error('createAllowanceTransaction - No source token address found.');
        try {
          const r = await f.generateApproveCalldata({
              from: o,
              to: t,
              userAddress: n,
            }),
            i = b.getPlainAddress(r.tx.from);
          if (!i) throw new Error('SwapController:createAllowanceTransaction - address is required');
          const a = {
            data: r.tx.data,
            to: i,
            gasPrice: BigInt(r.tx.eip155.gasPrice),
            value: BigInt(r.tx.value),
            toAmount: e.toTokenAmount,
          };
          return (
            (e.swapTransaction = void 0),
            (e.approvalTransaction = {
              data: a.data,
              to: a.to,
              gasPrice: a.gasPrice,
              value: a.value,
              toAmount: a.toAmount,
            }),
            {
              data: a.data,
              to: a.to,
              gasPrice: a.gasPrice,
              value: a.value,
              toAmount: a.toAmount,
            }
          );
        } catch {
          (p.goBack(),
            T.showError('Failed to create approval transaction'),
            (e.approvalTransaction = void 0),
            (e.swapTransaction = void 0),
            (e.fetchError = !0));
          return;
        }
      }
    },
    async createSwapTransaction() {
      const { networkAddress: n, fromCaipAddress: o, sourceTokenAmount: t } = s.getParams(),
        r = e.sourceToken,
        i = e.toToken;
      if (!o || !t || !r || !i) return;
      const a = P.parseUnits(t, r.decimals)?.toString();
      try {
        const c = await f.generateSwapCalldata({
            userAddress: o,
            from: r.address,
            to: i.address,
            amount: a,
            disableEstimate: !0,
          }),
          d = r.address === n,
          w = BigInt(c.tx.eip155.gas),
          C = BigInt(c.tx.eip155.gasPrice),
          v = b.getPlainAddress(c.tx.to);
        if (!v) throw new Error('SwapController:createSwapTransaction - address is required');
        const N = {
          data: c.tx.data,
          to: v,
          gas: w,
          gasPrice: C,
          value: BigInt(d ? (a ?? '0') : '0'),
          toAmount: e.toTokenAmount,
        };
        return (
          (e.gasPriceInUSD = g.getGasPriceInUSD(e.networkPrice, w, C)),
          (e.approvalTransaction = void 0),
          (e.swapTransaction = N),
          N
        );
      } catch {
        (p.goBack(),
          T.showError('Failed to create transaction'),
          (e.approvalTransaction = void 0),
          (e.swapTransaction = void 0),
          (e.fetchError = !0));
        return;
      }
    },
    onEmbeddedWalletApprovalSuccess() {
      (T.showLoading('Approve limit increase in your wallet'), p.replace('SwapPreview'));
    },
    // -- Send Transactions --------------------------------- //
    async sendTransactionForApproval(n) {
      const { fromAddress: o, isAuthConnector: t } = s.getParams();
      ((e.loadingApprovalTransaction = !0),
        t
          ? p.pushTransactionStack({
              onSuccess: s.onEmbeddedWalletApprovalSuccess,
            })
          : T.showLoading('Approve limit increase in your wallet'));
      try {
        (await P.sendTransaction({
          address: o,
          to: n.to,
          data: n.data,
          value: n.value,
          chainNamespace: m.CHAIN.EVM,
        }),
          await s.swapTokens(),
          await s.getTransaction(),
          (e.approvalTransaction = void 0),
          (e.loadingApprovalTransaction = !1));
      } catch (i) {
        const a = i;
        ((e.transactionError = a?.displayMessage),
          (e.loadingApprovalTransaction = !1),
          T.showError(a?.displayMessage || 'Transaction error'),
          I.sendEvent({
            type: 'track',
            event: 'SWAP_APPROVAL_ERROR',
            properties: {
              message: a?.displayMessage || a?.message || 'Unknown',
              network: k.state.activeCaipNetwork?.caipNetworkId || '',
              swapFromToken: s.state.sourceToken?.symbol || '',
              swapToToken: s.state.toToken?.symbol || '',
              swapFromAmount: s.state.sourceTokenAmount || '',
              swapToAmount: s.state.toTokenAmount || '',
              isSmartAccount: h(m.CHAIN.EVM) === y.ACCOUNT_TYPES.SMART_ACCOUNT,
            },
          }));
      }
    },
    async sendTransactionForSwap(n) {
      if (!n) return;
      const { fromAddress: o, toTokenAmount: t, isAuthConnector: r } = s.getParams();
      e.loadingTransaction = !0;
      const i = `Swapping ${e.sourceToken?.symbol} to ${u.formatNumberToLocalString(t, 3)} ${e.toToken?.symbol}`,
        a = `Swapped ${e.sourceToken?.symbol} to ${u.formatNumberToLocalString(t, 3)} ${e.toToken?.symbol}`;
      r
        ? p.pushTransactionStack({
            onSuccess() {
              (p.replace('Account'), T.showLoading(i), S.resetState());
            },
          })
        : T.showLoading('Confirm transaction in your wallet');
      try {
        const c = [e.sourceToken?.address, e.toToken?.address].join(','),
          d = await P.sendTransaction({
            address: o,
            to: n.to,
            data: n.data,
            value: n.value,
            chainNamespace: m.CHAIN.EVM,
          });
        return (
          (e.loadingTransaction = !1),
          T.showSuccess(a),
          I.sendEvent({
            type: 'track',
            event: 'SWAP_SUCCESS',
            properties: {
              network: k.state.activeCaipNetwork?.caipNetworkId || '',
              swapFromToken: s.state.sourceToken?.symbol || '',
              swapToToken: s.state.toToken?.symbol || '',
              swapFromAmount: s.state.sourceTokenAmount || '',
              swapToAmount: s.state.toTokenAmount || '',
              isSmartAccount: h(m.CHAIN.EVM) === y.ACCOUNT_TYPES.SMART_ACCOUNT,
            },
          }),
          S.resetState(),
          r || p.replace('Account'),
          S.getMyTokensWithBalance(c),
          d
        );
      } catch (c) {
        const d = c;
        ((e.transactionError = d?.displayMessage),
          (e.loadingTransaction = !1),
          T.showError(d?.displayMessage || 'Transaction error'),
          I.sendEvent({
            type: 'track',
            event: 'SWAP_ERROR',
            properties: {
              message: d?.displayMessage || d?.message || 'Unknown',
              network: k.state.activeCaipNetwork?.caipNetworkId || '',
              swapFromToken: s.state.sourceToken?.symbol || '',
              swapToToken: s.state.toToken?.symbol || '',
              swapFromAmount: s.state.sourceTokenAmount || '',
              swapToAmount: s.state.toTokenAmount || '',
              isSmartAccount: h(m.CHAIN.EVM) === y.ACCOUNT_TYPES.SMART_ACCOUNT,
            },
          }));
        return;
      }
    },
    // -- Checks -------------------------------------------- //
    hasInsufficientToken(n, o) {
      return g.isInsufficientSourceTokenForSwap(n, o, e.myTokensWithBalance);
    },
    // -- Calculations -------------------------------------- //
    setTransactionDetails() {
      const { toTokenAddress: n, toTokenDecimals: o } = s.getParams();
      !n ||
        !o ||
        ((e.gasPriceInUSD = g.getGasPriceInUSD(e.networkPrice, BigInt(e.gasFee), BigInt(E))),
        (e.priceImpact = g.getPriceImpact({
          sourceTokenAmount: e.sourceTokenAmount,
          sourceTokenPriceInUSD: e.sourceTokenPriceInUSD,
          toTokenPriceInUSD: e.toTokenPriceInUSD,
          toTokenAmount: e.toTokenAmount,
        })),
        (e.maxSlippage = g.getMaxSlippage(e.slippage, e.toTokenAmount)),
        (e.providerFee = g.getProviderFee(e.sourceTokenAmount)));
    },
  },
  s = D(S);
export { s as S };
//# sourceMappingURL=SwapController-DzClRee6.mjs.map
