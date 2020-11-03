import { tokens, slippageTolerance, liquidityProviderFee } from '@/mocks/swap'

const getTokens = () => {
  return Promise.resolve(tokens)
}

const getSlippageTolerance = () => {
  return Promise.resolve(slippageTolerance)
}

const getLiquidityProviderFee = () => {
  return Promise.resolve(liquidityProviderFee)
}

export default {
  getTokens,
  getSlippageTolerance,
  getLiquidityProviderFee
}
