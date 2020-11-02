import { slippageTolerance, liquidityProviderFee } from '@/mocks/swap'

const getSlippageTolerance = () => {
  return Promise.resolve(slippageTolerance)
}

const getLiquidityProviderFee = () => {
  return Promise.resolve(liquidityProviderFee)
}

export default {
  getSlippageTolerance,
  getLiquidityProviderFee
}
