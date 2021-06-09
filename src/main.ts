import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './lang'
import { app } from './consts'

import './plugins'
import './styles'

Vue.config.productionTip = false
Vue.config.devtools = process.env.NODE_ENV === 'development'

router.beforeEach((to, from, next): void => {
  if (to && to.name && i18n.te(`pageTitle.${to.name}`)) {
    document.title = `${i18n.t(`pageTitle.${to.name}`)} - ${app.name}`
  } else {
    document.title = app.name
  }
  next()
})

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
