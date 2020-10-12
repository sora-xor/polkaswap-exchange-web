import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import { PageNames } from '@/consts'

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
    name: PageNames.Exchange
  },
  {
    path: '/stats',
    name: PageNames.Stats
  },
  {
    path: '/support',
    name: PageNames.Support
  }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

export default router
