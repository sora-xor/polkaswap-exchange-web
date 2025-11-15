import { map, combineLatest } from 'rxjs';
import { FPNumber } from '@sora-substrate/math';

import type { Observable, Signer } from '@polkadot/types/types';
import type { CreateResult } from '@polkadot/ui-keyring/types';
import type { Connection } from '@sora-substrate/connection';
import type { CodecString } from '@sora-substrate/math';

import { EthBridgeApi } from './eth';
import { EvmBridgeApi } from './evm';
import { SubBridgeApi } from './sub';

import { BridgeNetworkType } from './consts';
import { getEvmNetworkId, getEvmNetworkType } from './methods';
import { PolkadotParachains, KusamaParachains, AlphanetParachains, RococoParachains } from './sub/consts';
import type { Api } from '../api';
import type { Storage } from '../storage';
import type { SupportedApps } from './types';
import type { SubNetwork } from './sub/types';
import type { EvmSupportedApp } from './evm/types';

export class BridgeProxyModule<T> {
  constructor(private readonly root: Api<T>) {}

  public readonly eth = new EthBridgeApi<T>();
  public readonly evm = new EvmBridgeApi<T>();
  public readonly sub = new SubBridgeApi<T>();

  public setConnection(connection: Connection) {
    this.eth.setConnection(connection);
    this.evm.setConnection(connection);
    this.sub.setConnection(connection);
  }

  public initAccountStorage() {
    this.eth.initAccountStorage();
    this.evm.initAccountStorage();
    this.sub.initAccountStorage();
  }

  public setStorage(storage: Storage): void {
    this.eth.setStorage(storage);
    this.evm.setStorage(storage);
    this.sub.setStorage(storage);
  }

  public setSigner(signer: Signer): void {
    this.eth.setSigner(signer);
    this.evm.setSigner(signer);
    this.sub.setSigner(signer);
  }

  public setAccount(account: CreateResult): void {
    this.eth.setAccount(account);
    this.evm.setAccount(account);
    this.sub.setAccount(account);
  }

  public logout(): void {
    this.eth.logout();
    this.evm.logout();
    this.sub.logout();
  }

  // prettier-ignore
  public async getListApps(): Promise<SupportedApps> { // NOSONAR
    const apps: SupportedApps = {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    };

    const data = await this.root.api.rpc.bridgeProxy.listApps();

    for (const appInfo of data) {
      if (appInfo.isEvm) {
        const [genericNetworkId, evmAppInfo] = appInfo.asEvm;
        const id = getEvmNetworkId(genericNetworkId);
        const type = getEvmNetworkType(genericNetworkId);
        const kind = evmAppInfo.appKind.toString();
        const address = evmAppInfo.evmAddress.toString();

        if (!apps[type][id]) apps[type][id] = {};

        apps[type][id][kind as keyof Partial<EvmSupportedApp>] = address;
      } else {
        const genericNetworkId = appInfo.asSub;
        const type = BridgeNetworkType.Sub;
        const subNetwork = genericNetworkId.asSub;

        // adding parachains we work through relaychain
        if (subNetwork.isRococo) {
          apps[type].push(...RococoParachains);
        } else if (subNetwork.isKusama) {
          apps[type].push(...KusamaParachains);
        } else if (subNetwork.isPolkadot) {
          apps[type].push(...PolkadotParachains);
        } else if (subNetwork.isAlphanet) {
          apps[type].push(...AlphanetParachains);
        } else if (subNetwork.isMainnet) {
          // SORA-SORA bridge is not exists
          console.info(`"Mainnet" sub network is not supported app`);
          continue;
        } else if (subNetwork.isCustom) {
          // Custom bridge is not supported yet
          console.info(`"${subNetwork.asCustom.toNumber()}" sub network is not supported app`);
          continue;
        }

        apps[type].push(subNetwork.type as SubNetwork);
      }
    }

    return apps;
  }

  public async isAssetTransferLimited(assetAddress: string): Promise<boolean> {
    const result = await this.root.api.query.bridgeProxy.limitedAssets(assetAddress);

    return result.isTrue;
  }

  public getTransferLimitObservable(): Observable<CodecString> {
    return this.root.apiRx.query.bridgeProxy
      .transferLimit()
      .pipe(map((limitSettings) => limitSettings.maxAmount.toString()));
  }

  public getConsumedTransferLimitObservable(): Observable<CodecString> {
    return this.root.apiRx.query.bridgeProxy.consumedTransferLimit().pipe(map((limit) => limit.toString()));
  }

  public getCurrentTransferLimitObservable(): Observable<CodecString> {
    return combineLatest([this.getTransferLimitObservable(), this.getConsumedTransferLimitObservable()]).pipe(
      map(([maxLimit, consumedLimit]) => {
        const max = FPNumber.fromCodecValue(maxLimit);
        const consumed = FPNumber.fromCodecValue(consumedLimit);
        const current = max.sub(consumed);
        const checked = FPNumber.isGreaterThan(current, FPNumber.ZERO) ? current : FPNumber.ZERO;

        return checked.toCodecString();
      })
    );
  }

  public async getTransferLimitUnlockSchedule(): Promise<{ blockNumber: number; amount: CodecString }[]> {
    const data = await this.root.api.query.bridgeProxy.transferLimitUnlockSchedule.entries();
    const unlocks = data
      .map(([key, value]) => {
        const blockNumber = key.args[0].toNumber();
        const amount = value.toString();

        return { blockNumber, amount };
      })
      .sort((a, b) => a.blockNumber - b.blockNumber);

    return unlocks;
  }
}
