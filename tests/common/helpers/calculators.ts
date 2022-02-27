import { BigNumber } from 'ethers'
import { ONE_ETHER, ONE_TO_THE_EIGHT, ONE_TO_THE_SIX } from '../../constants'

export const calculateRawAmount = (convertedAmount: BigNumber, rate: BigNumber): BigNumber => {
  return convertedAmount.mul(ONE_TO_THE_EIGHT).div(rate)
}

export const calculateRawAmountLpRatio = (
  usdcBalance: BigNumber,
  baseWeight: BigNumber,
  quoteWeight: BigNumber,
  baseDecimals: BigNumber,
  baseTokenBal: BigNumber,
  convertedAmount: BigNumber
): BigNumber => {
  const _baseTokenBal = baseTokenBal.mul(ONE_ETHER).div(baseWeight)
  const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
  const _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal)

  return convertedAmount.mul(ONE_TO_THE_SIX).div(_rate)
}

export const calculateNumeraireAmount = (inputAmount: BigNumber, rate: BigNumber) => {
  return inputAmount.mul(rate).div(ONE_TO_THE_EIGHT)
}

export const calculateNumeraireBalance = (numeraireBalance: BigNumber, rate: BigNumber) => {
  return numeraireBalance.mul(rate).div(ONE_TO_THE_EIGHT)
}

export const calculateNumeraireBalanceLPRatio = (
  usdcBalance: BigNumber,
  quoteWeight: BigNumber,
  baseTokenBal: BigNumber,
  baseWeight: BigNumber
) => {
  const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
  const _rate = _usdcBal.mul(ONE_ETHER).div(baseTokenBal.mul(ONE_ETHER).div(baseWeight))

  return baseTokenBal.mul(_rate).div(ONE_TO_THE_SIX)
}
