import { liquidity } from '@/mocks/liquidity'

const getLiquidity = () => {
  return Promise.resolve(liquidity)
}

export default {
  getLiquidity
}
