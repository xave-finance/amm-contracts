import { BigNumber } from 'ethers'
import { MockABDK } from '../../../typechain/MockABDK'
import { ONE_ETHER, ONE_TO_THE_EIGHT, ONE_TO_THE_SIX } from '../../constants'

const calculator = (mockABDK: MockABDK) => {
  const calculateRawAmount = async (input: BigNumber, decimals: BigNumber, rate: BigNumber) => {
    const convertedAmount = await mockABDK.mulu(input, decimals)
    return convertedAmount.mul(ONE_TO_THE_EIGHT).div(rate)
  }

  const calculateRawAmountLpRatio = async (
    usdcBalance: BigNumber,
    baseWeight: BigNumber,
    quoteWeight: BigNumber,
    baseDecimals: BigNumber,
    baseTokenBal: BigNumber,
    input: BigNumber
  ) => {
    if (baseTokenBal.eq(0)) return BigNumber.from('0')

    const _baseTokenBal = baseTokenBal.mul(ONE_ETHER).div(baseWeight)
    const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
    const _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal)

    const convertedAmount = await mockABDK.mulu(input, baseDecimals)
    return convertedAmount.mul(ONE_TO_THE_SIX).div(_rate)
  }

  const calculateNumeraireAmount = async (inputAmount: BigNumber, rate: BigNumber, baseDecimals: BigNumber) => {
    return await mockABDK.divu(inputAmount.mul(rate).div(ONE_TO_THE_EIGHT), baseDecimals)
  }

  const calculateNumeraireBalance = async (numeraireBalance: BigNumber, rate: BigNumber, baseDecimals: BigNumber) => {
    return await mockABDK.divu(numeraireBalance.mul(rate).div(ONE_TO_THE_EIGHT), baseDecimals)
  }

  const calculateNumeraireBalanceLPRatio = async (
    usdcBalance: BigNumber,
    quoteWeight: BigNumber,
    baseTokenBal: BigNumber,
    baseWeight: BigNumber
  ) => {
    if (baseTokenBal.eq(0)) return BigNumber.from('0')

    const _usdcBal = usdcBalance.mul(ONE_ETHER).div(quoteWeight)
    const _rate = _usdcBal.mul(ONE_ETHER).div(baseTokenBal.mul(ONE_ETHER).div(baseWeight))

    return await mockABDK.divu(baseTokenBal.mul(_rate).div(ONE_TO_THE_SIX), ONE_ETHER)
  }

  return {
    calculateNumeraireAmount,
    calculateNumeraireBalance,
    calculateNumeraireBalanceLPRatio,
    calculateRawAmount,
    calculateRawAmountLpRatio,
  }
}

export default calculator
