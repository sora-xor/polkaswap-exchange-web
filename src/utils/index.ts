export const formatNumber = (value: string | number, decimalLendth: number): string => {
  const valueNumber = +value
  return valueNumber.toFixed(decimalLendth || 4)
}
