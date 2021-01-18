import axiosInstance from 'axios'

export const BASE_URL = process.env.BASE_URL

const axios = axiosInstance.create()
axios.defaults.baseURL = BASE_URL

export default axios
