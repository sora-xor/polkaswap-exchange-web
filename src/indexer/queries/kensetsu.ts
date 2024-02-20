import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { SubqueryHistoryElement } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  ConnectionQueryResponse,
  HistoryElementAssetBurn,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type KensetsuBurn = {
  address: string;
  amount: FPNumber;
};

const dataBeforeIndexing: KensetsuBurn[] = [
  {
    address: 'cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE',
    amount: FPNumber.fromCodecValue('2000000000000000000000000'),
  },
  {
    address: 'cnXES5tPEMkhLmhG57v55aYW4x1DtqHFM9Ft8rBcLNyHHFVSm',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
  },
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('25000000000000000000000000'),
  },
  {
    address: 'cnRdTJwjwpn67KgnWGcbBJpMipryNNos15NEFWV4sEfSnNnM6',
    amount: FPNumber.fromCodecValue('4000000000000000000000000'),
  },
  {
    address: 'cnW4cSTA6CB3zDw2kLknDwZRqPPwPDdFURN2nhHVg8C2SnrNX',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
  },
  {
    address: 'cnTmBrrR4CFs3GDA1DjWhAMsXXAJQJwUCkFtbsRsXhXJWTB3J',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
  },
  {
    address: 'cnTYLL7UNk9tak7gRZnZXxfor5UvMSEebBUsSLwwhyZvDdKWB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
  },
  {
    address: 'cnVA8S2CNn2h4CjW2vTnqnSRqEL4P2ShvPWYA46TYEdTtao3S',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
  },
  {
    address: 'cnTdA96vs4okPqpfSaPwSCPunkEn6AYTLek6rBvP9LbXbinAh',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
  },
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('1500000000000000000000000'),
  },
  {
    address: 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB',
    amount: FPNumber.fromCodecValue('10000000000000000000000000'),
  },
  {
    address: 'cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN',
    amount: FPNumber.fromCodecValue('1000000000000000000000000'),
  },
];

const KensetsuQuery = gql<ConnectionQueryResponse<SubqueryHistoryElement>>`
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
        }
      }
    }
  }
`;

const parse = (item: SubqueryHistoryElement): KensetsuBurn => {
  const data = item.data as HistoryElementAssetBurn;

  return {
    address: item.address,
    amount: new FPNumber(data.amount),
  };
};

export async function fetchData(start: number, end: number): Promise<KensetsuBurn[]> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { start, end };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(KensetsuQuery, variables, parse);
      return [...(items ?? []), ...dataBeforeIndexing];
    }
  }

  return [];
}
