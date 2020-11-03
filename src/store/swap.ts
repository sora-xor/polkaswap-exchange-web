import swapApi from '@/api/swap'

const state = {
  tokenFrom: null,
  tokenTo: null,
  slippageTolerance: 0,
  liquidityProviderFee: 0,
  isTokenFromPrice: true
}

const getters = {
  tokenFrom (state) {
    return state.tokenFrom
  },
  tokenTo (state) {
    return state.tokenTo
  },
  isTokenFromPrice (state) {
    return state.isTokenFromPrice
  },
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  }
}

const mutations = {
  GET_TOKEN_FROM (state, tokenFrom: any) {
    state.tokenFrom = tokenFrom
  },
  GET_TOKEN_TO (state, tokenTo: any) {
    state.tokenTo = tokenTo
  },
  GET_TOKEN_FROM_PRICE (state, isTokenFromPrice: boolean) {
    state.isTokenFromPrice = isTokenFromPrice
  },
  GET_SLIPPAGE_TOLERANCE (state, slippageTolerance: number) {
    state.slippageTolerance = slippageTolerance
  },
  GET_SLIPPAGE_TOLERANCE_FAILURE (state) {
    state.slippageTolerance = 0
  },
  GET_LIQUIDITY_PROVIDER_FEE (state, liquidityProviderFee: number) {
    state.liquidityProviderFee = liquidityProviderFee
  },
  GET_LIQUIDITY_PROVIDER_FEE_FAILURE (state) {
    state.liquidityProviderFee = 0
  }
}

const actions = {
  async getTokenFrom ({ commit }) {
    try {
      const tokenFrom = await swapApi.getTokens()
      commit('GET_TOKEN_FROM', tokenFrom.XOR)
    } catch (error) {
      // Add on Error
    }
  },
  async getTokenTo ({ commit }) {
    try {
      const tokenTo = await swapApi.getTokens()
      commit('GET_TOKEN_TO', tokenTo.ETH)
    } catch (error) {
      // Add on Error
    }
  },
  getTokenFromPrice ({ commit }) {
    commit('GET_TOKEN_FROM_PRICE', state.isTokenFromPrice)
  },
  async getSlippageTolerance ({ commit }) {
    try {
      const slippageTolerance = await swapApi.getSlippageTolerance() as number
      commit('GET_SLIPPAGE_TOLERANCE', slippageTolerance)
    } catch (error) {
      commit('GET_SLIPPAGE_TOLERANCE_FAILURE', error)
    }
  },
  async getLiquidityProviderFee ({ commit }) {
    try {
      const liquidityProviderFee = await swapApi.getLiquidityProviderFee() as number
      commit('GET_LIQUIDITY_PROVIDER_FEE', liquidityProviderFee)
    } catch (error) {
      commit('GET_LIQUIDITY_PROVIDER_FEE_FAILURE', error)
    }
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
