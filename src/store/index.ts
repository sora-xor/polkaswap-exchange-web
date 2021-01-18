import Vue from 'vue'
import Vuex from 'vuex'

const files = require.context('.', false, /\.ts$/)
const modules = {}

files.keys().forEach(key => {
  if (key === './index.ts') return
  modules[key.replace(/(\.\/|\.ts)/g, '')] = files(key).default
})

Vue.use(Vuex)

const store = new Vuex.Store({
  modules,
  strict: false
})

export default store
