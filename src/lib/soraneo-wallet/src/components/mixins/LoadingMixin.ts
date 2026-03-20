import { defineComponent } from 'vue';
import { mapState } from 'vuex';

import { delay } from '../../util';

import type { WithConnectionApi } from '@sora-substrate/sdk';

const resolveChainApi = (chainApi: WithConnectionApi): WithConnectionApi['api'] | null => {
  try {
    return chainApi.api;
  } catch {
    // Connection can be attached asynchronously; keep polling instead of throwing.
    return null;
  }
};

export default defineComponent({
  props: {
    parentLoading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      loading: false,
    };
  },
  computed: {
    ...mapState('wallet/settings', ['isWalletLoaded']),
  },
  methods: {
    async withLoading<T = void>(this: any, func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T> {
      this.loading = true;
      try {
        return await func();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    /**
     * Function for any request to blockchain.
     * It is guaranteed that api has a connection
     * @param func
     */
    async withApi<T = void>(this: any, func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T> {
      this.loading = true;

      if (!this.isWalletLoaded) {
        await delay();
        return await this.withApi(func);
      }

      return await this.withLoading(func);
    },
    async withChainApi<T = void>(
      this: any,
      chainApi: WithConnectionApi,
      func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>
    ): Promise<T> {
      this.loading = true;

      const api = resolveChainApi(chainApi);

      if (!api) {
        await delay();
        return await this.withChainApi(chainApi, func);
      }

      await api.isReady;
      return await this.withLoading(func);
    },
    async withParentLoading<T = void>(this: any, func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T> {
      if (this.parentLoading) {
        await delay();
        return await this.withParentLoading(func);
      }

      return await func();
    },
  },
});
