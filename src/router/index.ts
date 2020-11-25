import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import { AppName, PageNames } from '@/consts'
import i18n from '../lang'

Vue.use(VueRouter)

export const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`)
export const lazyView = (name: string) => () => import(`@/views/${name}.vue`)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/about'
  },
  {
    path: '/about',
    name: PageNames.About,
    component: lazyView(PageNames.About)
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
    path: '/exchange/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet)
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
    path: '/create-pair',
    name: PageNames.CreatePair,
    component: lazyView(PageNames.CreatePair)
  },
  {
    path: '/add-liquidity',
    name: PageNames.AddLiquidity,
    component: lazyView(PageNames.AddLiquidity)
  },
  {
    path: '/remove-liquidity/:id',
    name: PageNames.RemoveLiquidity,
    component: lazyView(PageNames.RemoveLiquidity)
  }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

router.beforeEach((to: any): void => {
  if (to && to.name) {
    document.title = `${i18n.t(`pageTitle.${to.name}`)} - ${AppName}`
  } else {
    document.title = AppName
  }
})

export default router
