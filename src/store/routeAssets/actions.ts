import { defineActions } from 'direct-vuex';

import { routeAssetsActionContext } from '@/store/routeAssets';
import Papa from 'papaparse';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { RouteAssetsSubscription } from './types';
import { FPNumber, Operation } from '@sora-substrate/util/build';
const actions = defineActions({
  updateRecipients(context, file?: File): void {
    const { commit, rootGetters, dispatch } = routeAssetsActionContext(context);
    if (!file) {
      commit.clearData();
      return;
    }
    const assetsTable = rootGetters.assets.assetsDataTable;
    const findAsset = (assetName: string) => {
      return Object.values(assetsTable)?.find((item: Asset) => item.symbol === assetName.toUpperCase());
    };

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      comments: '//',
      complete: (results) => {
        const result = results.data.map((data) => {
          return {
            name: data[0],
            wallet: data[1],
            usd: data[2],
            asset: findAsset(data[3]),
            amount: data[4],
          };
        });
        commit.setData({ file, recipients: result });
        dispatch.subscribeOnReserves();
      },
    });
  },

  subscribeOnReserves(context, sourceToken: Asset = XOR): void {
    const { commit, rootGetters, getters, dispatch } = routeAssetsActionContext(context);
    const liquiditySources = rootGetters.swap.swapLiquiditySource;
    const tokens = [...new Set<Asset>(getters.recipients.map((item) => item.asset))].map((item: Asset) => item.address);
    const currentsPulls = [] as Array<RouteAssetsSubscription>;

    dispatch.cleanSwapReservesSubscription();
    tokens.forEach(async (tokenAddress) => {
      const reservesSubscribe = api.swap
        .subscribeOnReserves(sourceToken.address, tokenAddress, liquiditySources as LiquiditySourceTypes)
        .subscribe((value) =>
          dispatch.setSubscriptionPayload({
            payload: value,
            inputAssetId: sourceToken.address,
            outputAssetId: tokenAddress,
          })
        );
      currentsPulls.push({
        liquidityReservesSubscription: reservesSubscribe,
        payload: null,
        paths: null,
        liquiditySources: null,
        assetAddress: tokenAddress,
      });
    });
    commit.setSubscriptions(currentsPulls);
  },

  async setSubscriptionPayload(context, { payload, inputAssetId, outputAssetId }): Promise<void> {
    const { state, rootState } = routeAssetsActionContext(context);

    const { paths, liquiditySources } = api.swap.getPathsAndPairLiquiditySources(
      inputAssetId,
      outputAssetId,
      payload,
      rootState.swap.enabledAssets
    );

    const subscription = state.subscriptions.find((item) => item.assetAddress === outputAssetId);
    subscription.paths = paths;
    subscription.liquiditySources = liquiditySources;
    subscription.payload = payload;
  },

  async runAssetsRouting(context, inputAsset): Promise<void> {
    const { state, rootState, getters, rootGetters, commit } = routeAssetsActionContext(context);
    commit.setProcessed(true);
    const inputAssetId = inputAsset.address;
    const numberOfSwapTransactions = getters.recipients.filter((item) => item.asset.address !== inputAsset.address);
    const numberOfTransferTransactions = 0;

    const numberOfTransactions = 0;
    const subscriptions = getters.subscriptions;

    const transactions = getters.recipients.map((recipient) => {
      const swapAndSend = recipient.asset.address === inputAsset.address;
      const to = recipient.wallet;
      const tokenFrom = inputAsset;
      const fromValue = 0;
      if (!swapAndSend) {
        const subscription = getters.subscriptions.find((sub) => sub.assetAddress === recipient.asset.address);
        const { paths, payload, liquiditySources } = subscription;
        const tokenTo = recipient.asset;
        const toValue = 0;
        const slippageTolerance = 0;
        const isExchangeB = false;

        const value = recipient.amount;
        // return () => api.swap.executeSwapAndSend(to, tokenFrom, tokenTo, fromValue, toValue, slippageTolerance, isExchangeB);
        return api.apiRx.tx.assets.transfer(tokenFrom, to, new FPNumber(fromValue, tokenFrom.decimals).toCodecString());
      } else {
        // return api.transfer(tokenFrom as Asset, to, fromValue);
        return api.apiRx.tx.assets.transfer(tokenFrom, to, new FPNumber(fromValue, tokenFrom.decimals).toCodecString());
      }
    });
    // commit.setProcessed(true);
    await api.submitExtrinsic(api.apiRx.tx.utility.batchAll(transactions) as any, api.account.pair, {
      symbol: inputAsset.symbol,
      assetAddress: inputAsset.address,
      type: Operation.Transfer,
    });
  },

  cleanSwapReservesSubscription(context): void {
    const { state, commit } = routeAssetsActionContext(context);
    const subscriptions = state.subscriptions;

    subscriptions.forEach((sub) => {
      sub.liquidityReservesSubscribtion.unsubscribe();
    });

    commit.setSubscriptions([]);
  },
});

function getSendTransaction() {}

function getSwapAndSendTransaction() {}

export default actions;
