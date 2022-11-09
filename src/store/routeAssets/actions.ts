import { defineActions } from 'direct-vuex';
import { routeAssetsActionContext } from '@/store/routeAssets';
import Papa from 'papaparse';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { RouteAssetsSubscription, RecipientStatus } from './types';
import { FPNumber } from '@sora-substrate/util/build';

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
            status: api.validateAddress(data[1]) ? RecipientStatus.ADDRESS_VALID : RecipientStatus.ADDRESS_INVALID,
            id: (crypto as any).randomUUID(),
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
    const tokens = [...new Set<Asset>(getters.recipients.map((item) => item.asset))]
      .map((item: Asset) => item.address)
      .filter((item) => item !== sourceToken.address);
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
    if (subscription) {
      subscription.paths = paths;
      subscription.liquiditySources = liquiditySources;
      subscription.payload = payload;
    }
  },

  async repeatTransaction(context, { inputAsset, id }): Promise<void> {
    const { getters, commit } = routeAssetsActionContext(context);
    const recipient = getters.recipients.find((recipient) => recipient.id === id);
    if (!recipient) {
      return Promise.reject(new Error('Cant find transaction by this Id'));
    }
    const transferParams = getTransferParams(context, inputAsset, recipient);
    if (!transferParams) return Promise.reject(new Error('Cant find transaction by this Id'));
    const action = transferParams.action;
    await action()
      .then(() => {
        commit.setRecipientStatus({
          id: recipient.id,
          status: RecipientStatus.SUCCESS,
        });
      })
      .catch(() => {
        commit.setRecipientStatus({
          id: recipient.id,
          status: RecipientStatus.FAILED,
        });
      });
  },

  async runAssetsRouting(context, inputAsset): Promise<void> {
    const { getters, commit } = routeAssetsActionContext(context);
    commit.setProcessed(true);
    const data = getters.validRecipients.map((recipient) => {
      return getTransferParams(context, inputAsset, recipient);
    });
    await executeBatchSwapAndSend(context, data);
  },

  cleanSwapReservesSubscription(context): void {
    const { state, commit } = routeAssetsActionContext(context);
    const subscriptions = state.subscriptions;
    subscriptions.forEach((sub) => {
      sub.liquidityReservesSubscription.unsubscribe();
    });
    commit.setSubscriptions([]);
  },
});

function getAssetUSDPrice(asset, fiatPriceAndApyObject) {
  return FPNumber.fromCodecValue(fiatPriceAndApyObject[asset.address]?.price, 18).toFixed(2);
}

function getTransferParams(context, inputAsset, recipient) {
  const { rootState, getters, rootGetters } = routeAssetsActionContext(context);
  if (recipient.asset.address === inputAsset.address) {
    const priceObject = rootState.wallet.account.fiatPriceAndApyObject;
    const amount = Number(recipient.usd) / Number(getAssetUSDPrice(recipient.asset, priceObject));
    return {
      action: async () => await api.transfer(recipient.asset, recipient.wallet, amount),
      recipient,
    };
  } else {
    const subscription = getters.subscriptions.find((sub) => sub.assetAddress === recipient.asset.address);
    if (!subscription) return null;
    const { paths, payload, liquiditySources } = subscription;
    const tokenEquivalent =
      Number(recipient.usd) /
      Number(
        FPNumber.fromCodecValue(rootState.wallet.account.fiatPriceAndApyObject[recipient.asset.address]?.price, 18)
      );
    const { amount, fee, rewards, amountWithoutImpact } = getSwapParams(
      inputAsset,
      recipient.asset,
      tokenEquivalent,
      true,
      rootGetters.swap.swapLiquiditySource,
      paths,
      payload
    );
    return {
      action: async () =>
        await api.swap.executeSwapAndSend(
          recipient.wallet,
          inputAsset,
          recipient.asset,
          amount,
          tokenEquivalent,
          undefined,
          true
        ),
      recipient,
    };
  }
}

async function executeBatchSwapAndSend(context, data: Array<any>): Promise<any> {
  const { commit } = routeAssetsActionContext(context);

  async function processArray() {
    for (const tx of data) {
      await tx
        .action()
        .then(() => {
          commit.setRecipientStatus({
            id: tx.recipient.id,
            status: RecipientStatus.SUCCESS,
          });
        })
        .catch(() => {
          commit.setRecipientStatus({
            id: tx.recipient.id,
            status: RecipientStatus.FAILED,
          });
        });
    }
  }

  await processArray();
}

function getSwapParams(tokenFrom, tokenTo, value, isExchangeB, liquiditySource, paths, payload) {
  return api.swap.getResult(
    tokenFrom as Asset,
    tokenTo as Asset,
    value,
    isExchangeB,
    [liquiditySource].filter(Boolean) as Array<LiquiditySourceTypes>,
    paths,
    payload
  );
}

export default actions;
