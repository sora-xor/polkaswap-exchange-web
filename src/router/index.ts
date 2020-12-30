import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import { PageNames } from '@/consts'

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
    path: '/exchange/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet)
  },
  {
    path: '/exchange/pool/create-pair',
    name: PageNames.CreatePair,
    component: lazyView(PageNames.CreatePair)
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
    path: '/liquidity/add/:firstAddress/:secondAddress',
    name: PageNames.AddLiquidityId,
    component: lazyView(PageNames.AddLiquidity)
  },
  {
    path: '/liquidity/add',
    name: PageNames.AddLiquidity,
    component: lazyView(PageNames.AddLiquidity)
  },
  {
    path: '/liquidity/remove/:firstAddress/:secondAddress',
    name: PageNames.RemoveLiquidity,
    component: lazyView(PageNames.RemoveLiquidity)
  }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

export default router
