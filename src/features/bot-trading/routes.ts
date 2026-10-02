import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';
import type { RouteRecordRaw } from 'vue-router';

/** Public strategy workspace; connecting a wallet is required only for live trading. */
export const botTradingRoutes: RouteRecordRaw[] = [
  {
    path: '/bots/:section(discover|lab|backtesting|my-bots)?',
    name: PageNames.Bots,
    component: () => loadAsyncImportWithRetry(() => import('./pages/BotsPage.vue')),
  },
  { path: '/bots/:pathMatch(.*)*', redirect: '/bots/lab' },
];
