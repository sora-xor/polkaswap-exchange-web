import { derive as ormlDerives } from '@open-web3/orml-api-derive';

import {
  rpc as soraRpc,
  types as soraTypes,
  typesAlias as soraTypesAlias,
  typesBundle as soraTypesBundle,
} from '@sora-substrate/types';
import type { ApiOptions } from '@polkadot/api/types';

export const defaultOptions: ApiOptions = {
  types: soraTypes,
  rpc: soraRpc,
};

export const options = ({
  types = {},
  rpc = {},
  typesAlias = {},
  typesBundle = {},
  ...otherOptions
}: ApiOptions = {}): ApiOptions => ({
  types: {
    ...soraTypes,
    ...types,
  },
  rpc: {
    ...soraRpc,
    ...rpc,
  },
  typesAlias: {
    ...soraTypesAlias,
    ...typesAlias,
  },
  derives: {
    ...ormlDerives,
  },
  typesBundle: {
    ...typesBundle,
    spec: {
      ...typesBundle.spec,
      sora: {
        ...(soraTypesBundle?.spec?.['sora'] ?? {}),
        ...(typesBundle?.spec?.['sora'] ?? {}),
      },
    },
  },
  signedExtensions: {
    ChargeTransactionPayment2: {
      extrinsic: {
        charge_fee_info: 'ChargeFeeInfo',
      },
      payload: {},
    },
  },
  ...otherOptions,
});
