import {
  assertWalletMatches,
  fromCodec,
  type PaymentRequest,
  type WalletAdapter,
  type WalletState,
} from '@sora/sora-pay/core';
import { WalletNotSubmittedError } from '@sora/sora-pay/widget';
import { FPNumber } from '@/lib/substrate/math';
import { watch } from 'vue';

import { api } from '@/lib/soraneo-wallet/src/api';
import { getAssetBalance } from '@/lib/substrate/sdk/assets';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import type { TransactionNotificationResult } from '@/composables/useTransaction';

import { canonicalStoreAddress, STORE_MAINNET_GENESIS } from './client';

/** Host-controlled signing and durable relay lease hooks; no keys enter Sora Pay. */
export interface StoreWalletHooks {
  address(): string;
  connected(): boolean;
  connect(): Promise<void>;
  withNotifications(handler: () => Promise<void>): Promise<TransactionNotificationResult>;
  beginAttempt(): Promise<string>;
  cancelAttempt(token: string): Promise<void>;
  reportTransaction(hash: string, token: string): Promise<void>;
  onPending(): void;
}

/** Build only the native-XOR/comment transfer used by the existing wallet SDK. */
function paymentExtrinsic(request: PaymentRequest) {
  return api.connection.api.tx.liquidityProxy.xorlessTransfer(
    0,
    XOR.address,
    request.recipient,
    request.amountCodec,
    0,
    0,
    [],
    'Disabled',
    request.reference
  );
}

/** Adapter checks current native chain values again after unlock and before submission. */
export function createStoreWalletAdapter(hooks: StoreWalletHooks): WalletAdapter {
  /** Read fresh spendable funds and chain denomination, guarding asynchronous account switches. */
  async function getState(): Promise<WalletState> {
    const empty: WalletState = {
      account: null,
      chainGenesisHash: null,
      assetId: null,
      decimals: null,
      denomination: null,
    };
    const chain = api.connection?.api;
    const address = hooks.address();
    if (!hooks.connected() || !address || !chain?.isConnected) return empty;
    const account = canonicalStoreAddress(address);
    if (canonicalStoreAddress(api.account?.pair?.address ?? '') !== account)
      throw new WalletNotSubmittedError('wallet_account_changed');
    const genesis = chain.genesisHash.toString().toLowerCase();
    if (genesis !== STORE_MAINNET_GENESIS) throw new WalletNotSubmittedError('wallet_network_changed');
    const [denomination, assetInfo, balance] = await Promise.all([
      chain.query.denomination.denominator(),
      chain.query.assets.assetInfosV2({ code: XOR.address }),
      getAssetBalance(chain, address, XOR.address, XOR.decimals),
    ]);
    if (
      chain !== api.connection?.api ||
      !chain.isConnected ||
      !hooks.connected() ||
      canonicalStoreAddress(hooks.address()) !== account ||
      canonicalStoreAddress(api.account?.pair?.address ?? '') !== account
    )
      throw new WalletNotSubmittedError('wallet_account_changed');
    const decimals = Number((assetInfo as unknown as { precision: { toString(): string } }).precision.toString());
    const existential = BigInt(chain.consts.balances?.existentialDeposit?.toString() ?? '0');
    const balanceCodec = BigInt(balance.transferable);
    return {
      account,
      chainGenesisHash: genesis,
      assetId: XOR.address,
      decimals,
      denomination: denomination.toString(),
      balanceCodec: (balanceCodec > existential ? balanceCodec - existential : 0n).toString(),
    };
  }

  /** Estimate the actual constrained call; zero/unavailable fee is not considered safe. */
  async function estimateFee(request: PaymentRequest): Promise<{ amountCodec: string }> {
    assertWalletMatches(request, await getState());
    const fee = await paymentExtrinsic(request).paymentInfo(request.payer);
    const amountCodec = fee.partialFee.toString();
    if (!/^[1-9]\d*$/.test(amountCodec)) throw new WalletNotSubmittedError('fee_unavailable');
    assertWalletMatches(request, await getState(), Date.now(), amountCodec);
    return { amountCodec };
  }

  return {
    getState,
    async connect() {
      if (!hooks.connected()) await hooks.connect();
      return getState();
    },
    subscribe(listener) {
      let active = true;
      const stop = watch(
        () => [hooks.address(), hooks.connected(), api.connection?.api, api.connection?.api?.genesisHash?.toString()],
        () => {
          void getState()
            .then((state) => {
              if (active) listener(state);
            })
            .catch(() => {
              if (active)
                listener({ account: null, chainGenesisHash: null, assetId: null, decimals: null, denomination: null });
            });
        }
      );
      return () => {
        active = false;
        stop();
      };
    },
    estimateFee,
    async submit(request) {
      const intent = structuredClone(request);
      const fee = await estimateFee(intent);
      assertWalletMatches(intent, await getState(), Date.now(), fee.amountCodec);
      const attempt = await hooks.beginAttempt();
      let invoked = false;
      let result: TransactionNotificationResult;
      try {
        result = await hooks.withNotifications(async () => {
          const finalFee = await estimateFee(intent);
          assertWalletMatches(intent, await getState(), Date.now(), finalFee.amountCodec);
          if (finalFee.amountCodec !== fee.amountCodec) throw new WalletNotSubmittedError('fee_changed');
          const amount = fromCodec(intent.amountCodec, intent.decimals);
          // Ensure the vendored SDK's FPNumber path signs exactly the reviewed codec units.
          if (new FPNumber(amount, intent.decimals).toCodecString() !== intent.amountCodec)
            throw new WalletNotSubmittedError('amount_precision_loss');
          invoked = true;
          await api.assets.transfer(XOR, intent.recipient, amount, { feeType: 'xor', comment: intent.reference });
        });
      } catch (error) {
        result = { submitted: false, error };
      }
      if (!result.submitted && !invoked) {
        // A failed release remains safely locked at the relay and must not look ready to pay.
        await hooks.cancelAttempt(attempt);
        throw new WalletNotSubmittedError('payment_not_submitted');
      }
      hooks.onPending();
      const hash = result.transaction?.txId;
      if (typeof hash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(hash)) {
        const transactionHash = hash.toLowerCase();
        try {
          await hooks.reportTransaction(transactionHash, attempt);
        } catch {
          /* The durable chain watcher also discovers the reference. */
        }
        return { transactionHash };
      }
      // The relay watches the reference independently, including after a lost SDK response.
      throw new Error('payment_submission_uncertain');
    },
  };
}
