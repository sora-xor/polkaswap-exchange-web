import { BridgeTxDirection } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { NetworkData, SubNetworksFees } from '@/types/bridge';

import { Alphanet, AlphanetMoonbase, AlphanetSora } from './networks/alphanet';
import { Kusama, KusamaAssetHub, KusamaCurio, KusamaShiden, KusamaSora } from './networks/kusama';
import { Liberland } from './networks/liberland';
import { Polkadot, PolkadotAcala, PolkadotAstar, PolkadotMoonbeam, PolkadotSora } from './networks/polkadot';
import { Rococo, RococoSora } from './networks/rococo';

import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

export const SUB_NETWORKS: Partial<Record<SubNetwork, NetworkData>> = [
  Alphanet,
  AlphanetMoonbase,
  AlphanetSora,
  Kusama,
  KusamaAssetHub,
  KusamaCurio,
  KusamaShiden,
  KusamaSora,
  Liberland,
  Polkadot,
  PolkadotAcala,
  PolkadotAstar,
  PolkadotMoonbeam,
  PolkadotSora,
  Rococo,
  RococoSora,
].reduce((acc, data) => ({ ...acc, [data.id]: data }), {});

export const SUB_TRANSFER_FEES: SubNetworksFees = {
  [SubNetworkId.Rococo]: {
    ROC: {
      [BridgeTxDirection.Outgoing]: '10124190',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Kusama]: {
    KSM: {
      [BridgeTxDirection.Outgoing]: '78327426',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Polkadot]: {
    DOT: {
      [BridgeTxDirection.Outgoing]: '19978738',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.PolkadotAcala]: {
    ACA: {
      [BridgeTxDirection.Outgoing]: '6429600000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.PolkadotAstar]: {
    ASTR: {
      [BridgeTxDirection.Outgoing]: '36000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.Alphanet]: {
    ALPHA: {
      [BridgeTxDirection.Outgoing]: '2700000000',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.AlphanetMoonbase]: {
    GLMR: {
      [BridgeTxDirection.Outgoing]: '34313700000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    ALPHA: {
      [BridgeTxDirection.Outgoing]: '44415350668',
      [BridgeTxDirection.Incoming]: '46453162841',
    },
    XOR: {
      [BridgeTxDirection.Outgoing]: '8140448382622083802',
      [BridgeTxDirection.Incoming]: '0',
    },
  },
  [SubNetworkId.KusamaCurio]: {
    XOR: {
      [BridgeTxDirection.Outgoing]: '500000000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    VAL: {
      [BridgeTxDirection.Outgoing]: '348000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    PSWAP: {
      [BridgeTxDirection.Outgoing]: '16000000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    CGT: {
      [BridgeTxDirection.Outgoing]: '112000000000000000',
      [BridgeTxDirection.Incoming]: '0',
    },
    KSM: {
      [BridgeTxDirection.Outgoing]: '1900000000',
      [BridgeTxDirection.Incoming]: '50407940264',
    },
  },
};
