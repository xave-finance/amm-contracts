import { BigNumber } from 'ethers'
import { MockABDK } from '../../../typechain/MockABDK'
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
  if (baseTokenBal.eq(0)) return BigNumber.from('0')

  const _baseTokenBal = baseTokenBal.mul(ONE_ETHER).div(baseWeight)
  const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
  const _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal)

  return convertedAmount.mul(ONE_TO_THE_SIX).div(_rate)
}

export const calculateNumeraireAmount = async (
  inputAmount: BigNumber,
  rate: BigNumber,
  baseDecimals: BigNumber,
  mockABDK: MockABDK
) => {
  return await mockABDK.divu(inputAmount.mul(rate).div(ONE_TO_THE_EIGHT), baseDecimals)
}

export const calculateNumeraireBalance = async (
  numeraireBalance: BigNumber,
  rate: BigNumber,
  baseDecimals: BigNumber,
  mockABDK: MockABDK
) => {
  return await mockABDK.divu(numeraireBalance.mul(rate).div(ONE_TO_THE_EIGHT), baseDecimals)
}

export const calculateNumeraireBalanceLPRatio = async (
  usdcBalance: BigNumber,
  quoteWeight: BigNumber,
  baseTokenBal: BigNumber,
  baseWeight: BigNumber,
  mockABDK: MockABDK
) => {
  if (baseTokenBal.eq(0)) return BigNumber.from('0')

  const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
  const _rate = _usdcBal.mul(ONE_ETHER).div(baseTokenBal.mul(ONE_ETHER).div(baseWeight))

  return await mockABDK.divu(baseTokenBal.mul(_rate).div(ONE_TO_THE_SIX), ONE_ETHER)
}
