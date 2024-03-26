import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation, Storage } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { NodesConnection } from '@/utils/connection';

import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export class SubAdapter {
  public readonly subNetwork!: SubNetwork;
  public readonly subNetworkConnection!: NodesConnection;

  constructor(subNetwork: SubNetwork) {
    this.subNetwork = subNetwork;
    this.subNetworkConnection = new NodesConnection(new Storage(this.subNetwork), new Connection({}), this.subNetwork);
  }

  get connection(): Connection {
    return this.subNetworkConnection.connection;
  }

  get api(): ApiPromise {
    return this.connection.api as ApiPromise;
  }

  get apiRx() {
    return this.api.rx as ApiRx;
  }

  get connected(): boolean {
    return !!this.api?.isConnected;
  }

  protected async withConnection<T>(onSuccess: AsyncFnWithoutArgs<T> | FnWithoutArgs<T>, fallback: T) {
    if (!this.connected && !this.connection.loading) return fallback;

    await this.api.isReady;

    return await onSuccess();
  }

  public setApi(api: ApiPromise): void {
    console.info(`[${this.subNetwork}] Api injected`);
    this.connection.api = api;
  }

  public async connect(): Promise<void> {
    if (!this.connected && !this.api && !this.connection.loading) {
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
      return result.toNumber();
    }, 0);
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    if (!accountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      const accountInfo = await this.api.query.system.account(accountAddress);
      const accountBalance = formatBalance(accountInfo.data);
      const balance = accountBalance.transferable;

      return balance;
    }, ZeroStringValue);
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    if (!subBridgeApi.account?.pair) throw new Error(`[${this.constructor.name}] Account pair is not set.`);

    const historyItem = subBridgeApi.getHistory(historyId as string) ?? {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: this.subNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.getTransferExtrinsic(asset, recipient, amount);

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    return await this.withConnection(async () => {
      const decimals = this.api.registry.chainDecimals[0];
      const tx = this.getTransferExtrinsic(asset, recipient, ZeroStringValue);
      const res = await tx.paymentInfo(sender);
      return new FPNumber(res.partialFee, decimals).toCodecString();
    }, ZeroStringValue);
  }

  public async getTokenBalance(accountAddress: string, address?: string): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  public async getAssetMinDeposit(assetAddress: string): Promise<CodecString> {
    return await this.getExistentialDeposit();
  }

  protected async getExistentialDeposit(): Promise<CodecString> {
    return await this.withConnection(() => this.api.consts.balances.existentialDeposit.toString(), ZeroStringValue);
  }

  protected getTransferExtrinsic(
    asset: RegisteredAsset,
    recipient: string,
    amount: string | number
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }
}
