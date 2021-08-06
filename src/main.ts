import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './lang'
import { updateDocumentTitle } from './utils'

import './plugins'
import './styles'

Vue.config.productionTip = false
Vue.config.devtools = process.env.NODE_ENV === 'development'

router.beforeEach((to, from, next): void => {
  updateDocumentTitle(to)
  next()
})

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
