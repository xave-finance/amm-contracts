import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { sortTokenAddressesLikeVault } from './sorter'
import { FXPool } from '../../../typechain/FXPool'
import { bigNumberToNumber } from './numbers'

export const calculateOtherTokenIn = async (
  amountIn: string,
  tokenInIndex: number,
  liquidity: BigNumber[],
  tokenDecimals: number[],
  assimilators: string[]
): Promise<BigNumber> => {
  const tokenInAmount = parseUnits(amountIn, tokenDecimals[tokenInIndex])

  if (liquidity[0].gt(0)) {
    // there is liquidity
    const tokenInBalance = liquidity[tokenInIndex]
    const otherTokenInIndex = tokenInIndex === 0 ? 1 : 0
    const otherTokenInBalance = liquidity[otherTokenInIndex]
    return tokenInAmount.mul(otherTokenInBalance).div(tokenInBalance)
  } else {
    // pool is new or empty
    const AssimilatorFactory = await ethers.getContractFactory('BaseToUsdAssimilator')
    const tokenInAssim = tokenInIndex === 0 ? assimilators[0] : assimilators[1]
    const otherTokenInAssim = tokenInIndex === 0 ? assimilators[1] : assimilators[0]
    const tokenInAssimContract = await AssimilatorFactory.attach(tokenInAssim)
    const otherTokenInAssimContract = await AssimilatorFactory.attach(otherTokenInAssim)
    const tokenInNumeraire = await tokenInAssimContract?.viewNumeraireAmount(tokenInAmount)
    const otherTokenInAmount = await otherTokenInAssimContract?.viewRawAmount(tokenInNumeraire)
    return otherTokenInAmount
  }
}

export const calculateLptOutAndTokensIn = async (
  tokenAmounts: string[],
  tokenDecimals: number[],
  sortedAddresses: string[],
  baseTokenAddress: string,
  fxPoolContract: FXPool,
  alreadyAdjusted: boolean = false
): Promise<[BigNumber, BigNumber[], BigNumber[]]> => {
  const tokenAmountsBN = [parseUnits(tokenAmounts[0], tokenDecimals[0]), parseUnits(tokenAmounts[1], tokenDecimals[1])]
  const sortedAmounts = sortTokenAddressesLikeVault(sortedAddresses, baseTokenAddress, {
    lptAmount: BigNumber.from(0),
    deposits: tokenAmountsBN,
  })

  const userData = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])

  const res = await fxPoolContract.viewDeposit(userData)

  const inputAmountIn0 = Number(tokenAmounts[0])
  const inputAmountIn1 = Number(tokenAmounts[1])
  const estimatedAmountIn0 = bigNumberToNumber(res[1][0], tokenDecimals[0])
  const estimatedAmountIn1 = bigNumberToNumber(res[1][1], tokenDecimals[1])

  if ((estimatedAmountIn0 > inputAmountIn0 || estimatedAmountIn1 > inputAmountIn1) && !alreadyAdjusted) {
    const adjustedAmountIn0 = inputAmountIn0 * (inputAmountIn0 / estimatedAmountIn0)
    const adjustedAmountIn1 = inputAmountIn1 * (inputAmountIn1 / estimatedAmountIn1)
    const adjustedAmountIn0Str = adjustedAmountIn0.toFixed(tokenDecimals[0])
    const adjustedAmountIn1Str = adjustedAmountIn1.toFixed(tokenDecimals[1])

    console.log('Estimated tokenIn amounts is bigger than input! ', estimatedAmountIn0, estimatedAmountIn1)
    console.log('Adjusting tokenIn amounts to: ', adjustedAmountIn0Str, adjustedAmountIn1Str)

    return calculateLptOutAndTokensIn(
      [adjustedAmountIn0Str, adjustedAmountIn1Str],
      tokenDecimals,
      sortedAddresses,
      baseTokenAddress,
      fxPoolContract,
      true
    )
  } else {
    return [res[0], res[1], tokenAmountsBN]
  }
}
