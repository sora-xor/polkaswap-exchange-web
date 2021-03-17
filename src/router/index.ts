import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import { PageNames, BridgeChildPages } from '@/consts'
import { isWalletConnected } from '@/utils'
import store from '@/store'

Vue.use(VueRouter)

export const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`)
export const lazyView = (name: string) => () => import(`@/views/${name}.vue`)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/exchange'
  },
  {
    path: '/exchange',
    redirect: '/exchange/swap'
  },
  {
    path: '/exchange',
    name: PageNames.Exchange,
    component: lazyView(PageNames.Exchange),
    children: [
      {
        path: 'swap',
        name: PageNames.Swap,
        component: lazyComponent(PageNames.Swap)
      },
      {
        path: 'pool',
        name: PageNames.Pool,
        component: lazyComponent(PageNames.Pool)
      }
    ]
  },
  {
    path: '/about',
    name: PageNames.About,
    component: lazyView(PageNames.About)
  },
  {
    path: '/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet)
  },
  {
    path: '/bridge',
    name: PageNames.Bridge,
    component: lazyView(PageNames.Bridge)
  },
  {
    path: '/bridge/transaction',
    name: PageNames.BridgeTransaction,
    component: lazyView(PageNames.BridgeTransaction),
    meta: { requiresAuth: true }
  },
  {
    path: '/bridge/history',
    name: PageNames.BridgeTransactionsHistory,
    component: lazyView(PageNames.BridgeTransactionsHistory),
    meta: { requiresAuth: true }
  },
  {
    path: '/exchange/pool/create-pair',
    name: PageNames.CreatePair,
    component: lazyView(PageNames.CreatePair),
    meta: { requiresAuth: true }
  },
  {
    path: '/exchange/pool/add/:firstAddress/:secondAddress',
    name: PageNames.AddLiquidityId,
    component: lazyView(PageNames.AddLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/exchange/pool/add',
    name: PageNames.AddLiquidity,
    component: lazyView(PageNames.AddLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/exchange/pool/remove/:firstAddress/:secondAddress',
    name: PageNames.RemoveLiquidity,
    component: lazyView(PageNames.RemoveLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/rewards',
    name: PageNames.Rewards,
    component: lazyView(PageNames.Rewards)
  },
  {
    path: '/stats',
    name: PageNames.Stats
  },
  {
    path: '/support',
    name: PageNames.Support
  },
  {
    path: '*',
    redirect: '/exchange'
    // TODO: Turn on redirect to PageNotFound
    // name: PageNames.PageNotFound,
    // component: lazyComponent(PageNames.PageNotFound)
  }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (BridgeChildPages.includes(to.name as PageNames) && isWalletConnected() && !store.getters['web3/isEthAccountConnected']) {
      next({
        name: PageNames.Bridge
      })
    }
    if (!isWalletConnected()) {
      next({
        name: PageNames.Wallet
      })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
