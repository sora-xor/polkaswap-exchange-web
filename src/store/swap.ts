import swapApi from '@/api/swap'

const state = {
  slippageTolerance: 0,
  liquidityProviderFee: 0
}

const getters = {
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  }
}

const mutations = {
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
