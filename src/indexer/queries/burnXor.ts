import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  ConnectionQueryResponse,
  HistoryElement,
  HistoryElementAssetBurn,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type XorBurn = {
  address: string;
  amount: FPNumber;
  blockHeight: number;
};

const dataBeforeIndexing: XorBurn[] = [
  // https://sora.subscan.io/extrinsic/0xa072a5c6c0d847cef807e57c303fd60fdde67d8e10b1c080de428ba15b78bdb6
  {
    address: 'cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE',
    amount: FPNumber.fromCodecValue('2000000000000000000000000'),
    blockHeight: 14496081,
  },
  // https://sora.subscan.io/extrinsic/0x2727e182d531ad890f9937beded0527d4a6d68018977b484658391fdd1e80880
  {
    address: 'cnXES5tPEMkhLmhG57v55aYW4x1DtqHFM9Ft8rBcLNyHHFVSm',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14488966,
  },
  // https://sora.subscan.io/extrinsic/0xb90cb95d71bc43d7c4212b1aa7b97b199436e706cd6ff1a73a9cd81ed8842df9
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('25000000000000000000000000'),
    blockHeight: 14482098,
  },
  // https://sora.subscan.io/extrinsic/0x2db91f8192e84d38956f4335acc3e98a6085be5d3d1ec645e3588854ac6970a0
  {
    address: 'cnRdTJwjwpn67KgnWGcbBJpMipryNNos15NEFWV4sEfSnNnM6',
    amount: FPNumber.fromCodecValue('4000000000000000000000000'),
    blockHeight: 14473177,
  },
  // https://sora.subscan.io/extrinsic/0x6290185892566e17fdc70e29ac0227819d67e9ac85da6981c2036724ffa15dcd
  {
    address: 'cnW4cSTA6CB3zDw2kLknDwZRqPPwPDdFURN2nhHVg8C2SnrNX',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14471099,
  },
  // https://sora.subscan.io/extrinsic/0x580f85275b21e43a2923d4a0e3af9d92832bb8f63c2a9f0b2fa17dd9e97d1533
  {
    address: 'cnTmBrrR4CFs3GDA1DjWhAMsXXAJQJwUCkFtbsRsXhXJWTB3J',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14467209,
  },
  // https://sora.subscan.io/extrinsic/0x733da9635badd2692ff9c76b4ad761e7460fd88b72f04edb5f7e844dc6ce188e
  {
    address: 'cnTYLL7UNk9tak7gRZnZXxfor5UvMSEebBUsSLwwhyZvDdKWB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
    blockHeight: 14467173,
  },
  // https://sora.subscan.io/extrinsic/0xc51f24899e5d89765647bef5663a58db873bffbd4af26b9a6e39787e762bbeb7
  {
    address: 'cnVA8S2CNn2h4CjW2vTnqnSRqEL4P2ShvPWYA46TYEdTtao3S',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14467085,
  },
  // https://sora.subscan.io/extrinsic/0xa0fd341cbdb2c6de2873dd3edb2e59a5fbb3e6cdcd056a2f4f8f3ba4663cf68f
  {
    address: 'cnTdA96vs4okPqpfSaPwSCPunkEn6AYTLek6rBvP9LbXbinAh',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
    blockHeight: 14466510,
  },
  // https://sora.subscan.io/extrinsic/0xf1caed8923c9412f682a0181073358c1d0559219831693d9bf37ef6c77f33b6c
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
    blockHeight: 14465935,
  },
  // https://sora.subscan.io/extrinsic/0xc3319a9bfd7ea92d19b2910d16df189f8cbd81aa7809e8febc2c10a376996ec9
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
    blockHeight: 14464669,
  },
  // https://sora.subscan.io/extrinsic/0x626147716deb3059bfb4d0f3f564cb8d336e7d99dbf1d6a99125d852cb449046
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
    blockHeight: 14464111,
  },
];

const XorBurnQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query ($start: Int = 0, $end: Int = 0, $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { module: { equalTo: "assets" } }
          { method: { equalTo: "burn" } }
          { data: { contains: { assetId: "0x0200000000000000000000000000000000000000000000000000000000000000" } } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          address
          data
          blockHeight
        }
      }
    }
  }
`;

const parse = (item: HistoryElement): XorBurn => {
  const data = item.data as HistoryElementAssetBurn;

  return {
    address: item.address,
    amount: new FPNumber(data.amount),
    blockHeight: +item.blockHeight,
  };
};

export async function fetchData(start: number, end: number): Promise<XorBurn[]> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { start, end };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(XorBurnQuery, variables, parse);
      return [...(items ?? []), ...dataBeforeIndexing];
    }
    case IndexerType.SUBSQUID: {
      return [];
    }
  }

  return [];
}
