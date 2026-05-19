import { ApiPromise, WsProvider } from '@polkadot/api';
import { Connection } from '@sora-substrate/connection';
import { WithConnectionApi, FPNumber, Storage } from '@sora-substrate/sdk';
import { formatBalance } from '@sora-substrate/sdk/build/assets';

import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { NodesConnection } from '@/utils/connection';

import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

/**
 * Accepts only decimal codec strings from Substrate balance providers.
 */
const normalizeCodecString = (value: unknown): CodecString => {
  if (typeof value !== 'string') return ZeroStringValue;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return ZeroStringValue;

  return value as CodecString;
};

const normalizeStorageKeyPart = (value: unknown): string | number | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  return null;
};

const normalizeAccountAddress = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed || null;
};

const resolveAssetId = (asset: RegisteredAsset): string | number | null => {
  return (
    normalizeStorageKeyPart(asset.externalAddress) ??
    normalizeStorageKeyPart((asset as any).assetId) ??
    normalizeStorageKeyPart((asset as any).id) ??
    normalizeStorageKeyPart(asset.address)
  );
};

class BaseSubAdapter extends WithConnectionApi {
  public readonly subNetwork!: SubNetwork;
  public readonly subNetworkConnection!: NodesConnection;

  constructor(subNetwork: SubNetwork) {
    super();

    this.subNetwork = subNetwork;
    this.subNetworkConnection = new NodesConnection(
      new Storage(this.subNetwork),
      new Connection(ApiPromise as any, WsProvider as any, {}),
      this.subNetwork
    );

    this.setConnection(this.subNetworkConnection.connection);
  }

  get closed(): boolean {
    return !this.connected && !this.subNetworkConnection.nodeAddressConnecting;
  }

  protected async withConnection<T>(onSuccess: AsyncFnWithoutArgs<T> | FnWithoutArgs<T>, fallback: T) {
    if (this.closed) {
      return fallback;
    }

    await this.api.isReady;

    return await onSuccess();
  }

  public setApi(api: ApiPromise): void {
    console.info(`[${this.subNetwork}] Api injected`);
    (this.connection as any).api = api;
  }

  public async connect(): Promise<void> {
    if (this.closed && !this.api) {
      try {
        await this.subNetworkConnection.connect();
      } catch {}
    }

    await this.api.isReady;
  }

  public async stop(): Promise<void> {
    await this.subNetworkConnection.closeConnection();
  }

  public getParachainId(): number | undefined {
    return subBridgeApi.isParachain(this.subNetwork) ? subBridgeApi.getParachainId(this.subNetwork) : undefined;
  }

  public getSoraParachainId(): number | undefined {
    try {
      const soraParachain = subBridgeApi.getSoraParachain(this.subNetwork);
      const soraParachainId = subBridgeApi.getParachainId(soraParachain);

      return soraParachainId;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  public async getBlockNumber(): Promise<number> {
    return await this.withConnection(async () => {
      const result = await this.api.query.system.number();
      return (result as any).toNumber();
    }, 0);
  }

  public async getTokenBalance(accountAddress: string, asset: RegisteredAsset): Promise<CodecString> {
    const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
    if (!normalizedAccountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      return asset.symbol === this.chainSymbol
        ? await this.getAccountBalance(normalizedAccountAddress)
        : await this.getAccountAssetBalance(normalizedAccountAddress, asset);
    }, ZeroStringValue);
  }

  /** Batch balances for mixed native/ERC20-like assets using queryMulti */
  public async getTokenBalancesBatch(
    pairs: Array<{ accountAddress: string; asset?: RegisteredAsset }>
  ): Promise<CodecString[]> {
    const balancePairs = Array.isArray(pairs) ? pairs : [];

    return await this.withConnection(
      async () => {
        const queries: any[] = [];
        const meta: Array<{ native: boolean; idx: number; assetId?: any; account: string }> = [];
        const out: CodecString[] = balancePairs.map(() => ZeroStringValue);
        balancePairs.forEach((p, idx) => {
          if (!p || typeof p !== 'object') {
            return;
          }

          const accountAddress = normalizeAccountAddress((p as any).accountAddress);
          if (!accountAddress) {
            return;
          }

          const asset = (p as any).asset as RegisteredAsset | undefined;
          const isNative = !asset || asset.symbol === this.chainSymbol;
          if (isNative) {
            queries.push([this.api.query.system.account, accountAddress]);
            meta.push({ native: true, idx, account: String(accountAddress) });
          } else {
            const assetId = resolveAssetId(asset);
            if (assetId === null) {
              return;
            }

            queries.push([(this.api.query.assets as any).account, [assetId, accountAddress]]);
            meta.push({ native: false, idx, assetId, account: String(accountAddress) });
          }
        });

        if (!queries.length) {
          return out;
        }

        const res = await this.api.queryMulti(queries);
        if (!Array.isArray(res)) {
          return out;
        }

        res.forEach((val: any, i: number) => {
          const m = meta[i];
          if (!m) return;

          try {
            if (m.native) {
              const balance = formatBalance(val.data, this.chainDecimals);
              out[m.idx] = normalizeCodecString(balance.transferable);
            } else {
              if (val?.isEmpty || typeof val?.unwrap !== 'function') {
                out[m.idx] = ZeroStringValue;
              } else {
                const data = val.unwrap();
                out[m.idx] =
                  data?.status?.isLiquid && typeof data?.balance?.toString === 'function'
                    ? normalizeCodecString(data.balance.toString())
                    : ZeroStringValue;
              }
            }
          } catch {
            out[m.idx] = ZeroStringValue;
          }
        });
        return out;
      },
      balancePairs.map(() => ZeroStringValue)
    );
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
    if (!normalizedAccountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      const accountInfo = await this.api.query.system.account(normalizedAccountAddress);
      const balance = formatBalance((accountInfo as any).data, this.chainDecimals);

      return normalizeCodecString(balance.transferable);
    }, ZeroStringValue);
  }

  protected async getAccountAssetBalance(accountAddress: string, asset: RegisteredAsset): Promise<CodecString> {
    throw new Error(`[${this.constructor.name}] "getAccountAssetBalance" method is not implemented`);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    return await this.withConnection(async () => {
      const tx = this.getTransferExtrinsic(asset, recipient, ZeroStringValue);
      const res = await (tx as any).paymentInfo(sender);
      return new FPNumber(res.partialFee, this.chainDecimals).toCodecString();
    }, ZeroStringValue);
  }

  public async getAssetMinDeposit(asset: RegisteredAsset): Promise<CodecString> {
    return await this.withConnection(async () => {
      return asset.symbol === this.chainSymbol ? await this.getExistentialDeposit() : await this.getAssetDeposit(asset);
    }, ZeroStringValue);
  }

  protected async getExistentialDeposit(): Promise<CodecString> {
    return await this.withConnection(() => this.api.consts.balances.existentialDeposit.toString(), ZeroStringValue);
  }

  protected async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    throw new Error(`[${this.constructor.name}] "getAssetDeposit" method is not implemented`);
  }

  public getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: string | number) {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId: string) {
    throw new Error(`[${this.constructor.name}] "transfer" method is not implemented`);
  }
}

export class SubAdapter extends BaseSubAdapter {
  protected async assetsAccountRequest(accountAddress: string, assetId: number | string): Promise<CodecString> {
    const normalizedAccountAddress = normalizeAccountAddress(accountAddress);
    if (!normalizedAccountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      const result = await (this.api.query.assets as any).account(assetId, normalizedAccountAddress);

      if (result.isEmpty) return ZeroStringValue;

      const data = result.unwrap();

      if (!data.status.isLiquid) return ZeroStringValue;

      return normalizeCodecString(data.balance.toString());
    }, ZeroStringValue);
  }

  protected async assetMinBalanceRequest(assetId: number | string): Promise<CodecString> {
    return await this.withConnection(async () => {
      const result = await (this.api.query.assets as any).asset(assetId);

      if (result.isEmpty) return ZeroStringValue;

      const data = result.unwrap();
      const minBalance = data.minBalance.toString();

      return minBalance > '1' ? minBalance : ZeroStringValue;
    }, ZeroStringValue);
  }
}
