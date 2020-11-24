import { liquidity } from '@/mocks/liquidity'

const getLiquidityById = (id) => {
  return Promise.resolve(liquidity[0])
}

export default {
  getLiquidityById
}
