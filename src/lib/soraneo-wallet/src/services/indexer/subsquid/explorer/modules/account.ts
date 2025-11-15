import { HistoryElementsConnectionQuery, HistoryElementsQuery } from '../../queries/historyElements';
import { AccountHistorySubscription } from '../../subscriptions/account';

import { BaseModule } from './_base';

import type { ConnectionQueryResponseData, HistoryElement, QueryResponseNodes } from '../../types';

export class SubsquidAccountModule extends BaseModule {
  public async getHistory(variables = {}): Promise<Nullable<QueryResponseNodes<HistoryElement>>> {
    return await this.root.fetchEntities(HistoryElementsQuery, variables);
  }

  public async getHistoryPaged(variables = {}): Promise<Nullable<ConnectionQueryResponseData<HistoryElement>>> {
    return await this.root.fetchEntitiesConnection(HistoryElementsConnectionQuery, variables);
  }

  public createHistorySubscription(accountAddress: string, handler: (entity: HistoryElement) => void) {
    const variables = { id: accountAddress };
    const createSubscription = this.root.subscribe(AccountHistorySubscription, variables);

    return createSubscription(async (payload) => {
      if (payload.data?.payload) {
        const txId = payload.data.payload.latestHistoryElement.id;
        const variables = { filter: { id_eq: txId } };
        const response = await this.getHistory(variables);

        if (response && Array.isArray(response.nodes) && response.nodes[0]) {
          handler(response.nodes[0]);
        }
      }
    });
  }
}
