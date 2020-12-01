import { liquidities } from '@/mocks/liquidity'

const getLiquidityById = id => Promise.resolve(liquidities.find(l => Number(l.id) === Number(id)))

const getLiquidities = () => Promise.resolve(liquidities)

export default {
  getLiquidityById,
  getLiquidities
}
