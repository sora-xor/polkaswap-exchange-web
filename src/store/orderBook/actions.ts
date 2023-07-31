import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { orderBookActionContext } from '.';

const actions = defineActions({
  async fetchOrderBooks(context): Promise<void> {
    const { commit } = orderBookActionContext(context);

    // await api.orderBook.getOrderBooks();

    // commit.setOrderBooks(api.orderBook.orderBooks);
  },
});

export default actions;
