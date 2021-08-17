import axiosInstance from 'axios'
import VueRouter from 'vue-router'

export const BASE_URL = process.env.BASE_URL

const axios = axiosInstance.create()

axios.defaults.headers.common['Cache-Control'] = 'no-cache'

export const detectBaseUrl = (router?: VueRouter): string => {
  if (BASE_URL) return BASE_URL

  if (router && router.mode === 'hash') {
    const { origin, pathname } = window.location

    return `${origin}${pathname}`
  }

  return ''
}

export const updateBaseUrl = (router: VueRouter): void => {
  const baseUrl = detectBaseUrl(router)
  axios.defaults.baseURL = baseUrl
}

export default axios
