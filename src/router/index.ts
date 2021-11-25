import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';

Vue.use(VueRouter);

const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`);

const routes: Array<RouteConfig> = [];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

export { lazyComponent };
export default router;
