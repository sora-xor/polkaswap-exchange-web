import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './lang'
import { app } from './consts'
import LottieLoader from '@/components/LottieLoader.vue'

import './plugins'
import './styles'

const LOADING_CLASS = 'lottie-loader--loading'

Vue.config.productionTip = false
Vue.config.devtools = process.env.NODE_ENV === 'development'
Vue.directive('lottie-loader', {
  inserted: function (el, binding) {
    const loaderInstance = new LottieLoader()
    if (binding?.value?.size) {
      loaderInstance.$props.size = binding.value.size
    }
    loaderInstance.$mount()
    el.classList.add(LOADING_CLASS)
    el.appendChild(loaderInstance.$el)
  },
  componentUpdated: function (el, binding) {
    if (binding?.value?.loading === false) {
      el.classList.remove(LOADING_CLASS)
    }
  }
})

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
