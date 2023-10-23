import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';
import last from 'lodash/fp/last';

import { calcPriceChange } from '@/utils';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type {
  SubqueryAssetEntity,
  SubqueryConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  SubsquidAssetEntity,
  SubsquidAssetSnapshotEntity,
  SubsquidConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import type { AssetSnapshotEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const DAY = 60 * 60 * 24;

export type TokenData = {
  priceUSD: FPNumber;
  priceChangeDay: FPNumber;
  priceChangeWeek: FPNumber;
  volumeDayUSD: FPNumber;
  volumeWeekUSD: FPNumber;
  tvlUSD: FPNumber;
  velocity: FPNumber;
};

type SubqueryAssetData = SubqueryAssetEntity & {
  liquidityUSD?: number;
  priceChangeDay?: number;
  priceChangeWeek?: number;
  volumeDayUSD?: number;
  volumeWeekUSD?: number;
  velocity?: number;
};

type SubsquidAssetData = SubsquidAssetEntity & {
  hourSnapshots: SubsquidAssetSnapshotEntity[];
  daySnapshots: SubsquidAssetSnapshotEntity[];
};

const SubqueryAssetsQuery = gql<SubqueryConnectionQueryResponse<SubqueryAssetData>>`
  query AssetsQuery($after: Cursor, $ids: [String!]) {
    data: assets(orderBy: ID_ASC, after: $after, filter: { id: { in: $ids } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          priceUSD
          priceChangeDay
          priceChangeWeek
          volumeDayUSD
          volumeWeekUSD
          liquidityUSD
          velocity
        }
      }
    }
  }
`;

const SubsquidAssetsQuery = gql<SubsquidConnectionQueryResponse<SubsquidAssetData>>`
  query AssetsConnectionQuery($after: String, $ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
    data: assetsConnection(orderBy: id_ASC, after: $after, where: { AND: [{ id_in: $ids }] }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          priceUSD
          liquidity
          hourSnapshots: data(
            where: { AND: [{ timestamp_gte: $dayTimestamp }, { type_eq: HOUR }] }
            orderBy: timestamp_DESC
          ) {
            priceUSD {
              low
              high
              open
              close
            }
            volume {
              amount
              amountUSD
            }
          }
          daySnapshots: data(
            where: { AND: [{ timestamp_gte: $weekTimestamp }, { type_eq: DAY }] }
            orderBy: timestamp_DESC
          ) {
            priceUSD {
              low
              high
              open
              close
            }
            volume {
              amount
              amountUSD
            }
          }
        }
      }
    }
  }
`;

const calcVolume = (nodes: AssetSnapshotEntity[]): FPNumber => {
  return nodes.reduce((buffer, snapshot) => {
    const snapshotVolume = new FPNumber(snapshot.volume.amountUSD);

    return buffer.add(snapshotVolume);
  }, FPNumber.ZERO);
};

const parseSubquery = (item: SubqueryAssetData): Record<string, TokenData> => {
  return {
    [item.id]: {
      priceUSD: new FPNumber(item.priceUSD ?? 0),
      priceChangeDay: new FPNumber(item.priceChangeDay ?? 0),
      priceChangeWeek: new FPNumber(item.priceChangeDay ?? 0),
      volumeDayUSD: new FPNumber(item.volumeDayUSD ?? 0),
      volumeWeekUSD: new FPNumber(item.volumeWeekUSD ?? 0),
      tvlUSD: new FPNumber(item.liquidityUSD ?? 0),
      velocity: new FPNumber(item.velocity ?? 0),
    },
  };
};

const parseSubsquid = (item: SubsquidAssetData): Record<string, TokenData> => {
  const hourSnapshots = item.hourSnapshots;
  const daySnapshots = item.daySnapshots;
  const priceUSD = new FPNumber(item.priceUSD ?? 0);
  const startPriceDay = new FPNumber(last(hourSnapshots)?.priceUSD?.open ?? 0);
  const startPriceWeek = new FPNumber(last(daySnapshots)?.priceUSD?.open ?? 0);
  const priceChangeDay = calcPriceChange(priceUSD, startPriceDay);
  const priceChangeWeek = calcPriceChange(priceUSD, startPriceWeek);
  const volumeDayUSD = calcVolume(hourSnapshots);
  const volumeWeekUSD = calcVolume(daySnapshots);
  const reserves = FPNumber.fromCodecValue(item.liquidity ?? 0);
  const tvlUSD = reserves.mul(priceUSD);
  const velocity = tvlUSD.isZero() ? FPNumber.ZERO : volumeWeekUSD.div(tvlUSD);

  return {
    [item.id]: {
      priceUSD,
      priceChangeDay,
      priceChangeWeek,
      volumeDayUSD,
      volumeWeekUSD,
      tvlUSD,
      velocity,
    },
  };
};

export async function fetchTokensData(whitelistAssets: Asset[]): Promise<Record<string, TokenData>> {
  const now = Math.floor(Date.now() / (5 * 60_000)) * (5 * 60); // rounded to latest 5min snapshot (unix)
  const dayTimestamp = now - DAY; // latest day snapshot (unix)
  const weekTimestamp = now - DAY * 7; // latest week snapshot (unix)
  const ids = whitelistAssets.map((item) => item.address); // only whitelisted assets

  const variables = { ids, dayTimestamp, weekTimestamp };
  const indexer = getCurrentIndexer();
  let items: Nullable<Record<string, TokenData>[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      items = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAssetsQuery, variables, parseSubquery);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidAssetsQuery,
        variables,
        parseSubsquid
      );
      break;
    }
  }

  if (!items) return {};

  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
