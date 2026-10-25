import { AccountHistoryReferencesQuery, type AccountHistoryReference } from '../../queries/accountHistoryReferences';
import { HistoryElementsQuery } from '../../queries/historyElements';
import { AccountHistorySubscription } from '../../subscriptions/account';

import { PolkaswapBaseModule } from './_base';

import type { AnyVariables } from '../../client';
import type { ConnectionQueryResponseData, HistoryElement, QueryResponseNodes } from '../../types';

const ACCOUNT_HISTORY_REFERENCE_PAGE_SIZE = 100;

type AccountHistoryReferences = {
  ids: string[];
  totalCount: number;
};

/** Normalizes pagination inputs before they reach the public GraphQL connection. */
const normalizePaginationInteger = (value: unknown, fallback: number, minimum: number): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) return fallback;

  return value;
};

/** Adds the bounded history IDs without mutating the caller's residual filter. */
const withHistoryIds = (filter: unknown, ids: string[]): Record<string, unknown> => {
  const idFilter = { id: { in: ids } };

  if (!filter || typeof filter !== 'object' || Array.isArray(filter) || !Object.keys(filter).length) {
    return idFilter;
  }

  const source = filter as Record<string, unknown>;
  if (Array.isArray(source.and)) {
    return {
      ...source,
      and: [...source.and, idFilter],
    };
  }

  return {
    and: [source, idFilter],
  };
};

export class PolkaswapAccountModule extends PolkaswapBaseModule {
  public async getHistory(variables = {}): Promise<Nullable<QueryResponseNodes<HistoryElement>>> {
    const data = await this.getHistoryPaged(variables);
    if (data) {
      return {
        nodes: data.edges.map((edge) => {
          const node = edge.node;

          return {
            ...node,
            calls: (node.calls as any)?.nodes ?? [],
          };
        }),
        totalCount: data.totalCount,
      };
    }
    return data;
  }

  public async getHistoryPaged(variables = {}): Promise<Nullable<ConnectionQueryResponseData<HistoryElement>>> {
    return await this.root.fetchEntities(HistoryElementsQuery, variables);
  }

  /**
   * Loads wallet history through the account-participation index, then hydrates
   * the referenced history elements in one bounded ID query. This includes
   * incoming activity whose signer differs from the connected account.
   */
  public async getAccountHistory(
    account: string,
    variables: AnyVariables = {}
  ): Promise<Nullable<QueryResponseNodes<HistoryElement>>> {
    const preparedAccount = typeof account === 'string' ? account.trim() : '';
    const first = Math.min(normalizePaginationInteger(variables.first, 8, 1), ACCOUNT_HISTORY_REFERENCE_PAGE_SIZE);
    const offset = normalizePaginationInteger(variables.offset, 0, 0);

    if (!preparedAccount) {
      return {
        nodes: [],
        totalCount: 0,
      };
    }

    const references = await this.getAccountHistoryReferences(preparedAccount, first, offset);
    if (!references) return null;
    if (!references.ids.length) {
      return {
        nodes: [],
        totalCount: references.totalCount,
      };
    }

    const history = await this.getHistory({
      filter: withHistoryIds(variables.filter, references.ids),
      first: references.ids.length,
    });
    if (!history) return null;

    const nodesById = new Map(history.nodes.map((node) => [node.id, node]));
    const nodes = references.ids.map((id) => nodesById.get(id)).filter((node): node is HistoryElement => Boolean(node));
    const includesEveryAccountReference = offset === 0 && references.ids.length === references.totalCount;

    return {
      nodes,
      // When the complete reference set fits on this page, use the residual
      // operation/search filter's exact count. Otherwise the indexed account
      // count is the safe pagination upper bound.
      totalCount: includesEveryAccountReference ? history.totalCount : references.totalCount,
    };
  }

  /** Reads enough cursor pages to emulate the wallet's existing offset pagination. */
  private async getAccountHistoryReferences(
    account: string,
    first: number,
    offset: number
  ): Promise<Nullable<AccountHistoryReferences>> {
    const ids: string[] = [];
    const seen = new Set<string>();
    let after = '';
    let remainingOffset = offset;
    let totalCount = 0;

    while (ids.length < first) {
      const requested = Math.min(
        ACCOUNT_HISTORY_REFERENCE_PAGE_SIZE,
        Math.max(first - ids.length + remainingOffset, first)
      );
      const response = await this.root.fetchEntities(AccountHistoryReferencesQuery, {
        account,
        first: requested,
        after,
        orderBy: ['TIMESTAMP_DESC'],
      });

      if (!response) return null;
      totalCount = response.totalCount;

      for (const edge of response.edges) {
        const id = typeof edge.node?.extrinsicHash === 'string' ? edge.node.extrinsicHash.trim() : '';
        if (!id || seen.has(id)) continue;
        seen.add(id);

        if (remainingOffset > 0) {
          remainingOffset -= 1;
          continue;
        }

        ids.push(id);
        if (ids.length === first) break;
      }

      const nextCursor = response.pageInfo?.endCursor;
      if (!response.pageInfo?.hasNextPage || !nextCursor || nextCursor === after || !response.edges.length) break;
      after = nextCursor;
    }

    return { ids, totalCount };
  }

  public createHistorySubscription(accountAddress: string, handler: (entity: HistoryElement) => void) {
    const variables = { id: [accountAddress] };
    const createSubscription = this.root.subscribe(AccountHistorySubscription, variables);

    return createSubscription(async (payload) => {
      if (payload.data) {
        const txId = payload.data.payload._entity.latest_history_element_id;
        const variables = { filter: { id: { equalTo: txId } } };
        const response = await this.getHistory(variables);

        if (response && Array.isArray(response.nodes) && response.nodes[0]) {
          handler(response.nodes[0]);
        }
      }
    });
  }
}
