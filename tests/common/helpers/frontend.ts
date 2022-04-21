import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

export const calculateOtherTokenIn = async (
  amountIn: string,
  tokenInIndex: number,
  liquidity: BigNumber[],
  tokenDecimals: number[],
  assimilators: string[]
) => {
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
