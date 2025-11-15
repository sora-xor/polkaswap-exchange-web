import type { ToastsDisplayPlacementHorizontal, ToastsDisplayPlacementVertical } from './types'

const VERTICAL = new Set<ToastsDisplayPlacementVertical>(['bottom', 'top'])
const HORIZONTAL = new Set<ToastsDisplayPlacementHorizontal>(['left', 'right', 'center'])

export function validateVerticalPlacement(x: any) {
  return VERTICAL.has(x)
}

export function validateHorizontalPlacement(x: any) {
  return HORIZONTAL.has(x)
}
