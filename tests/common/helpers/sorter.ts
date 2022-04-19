import { BigNumber } from 'ethers'
import { ViewDepositData } from '../types/types'

export const sortTokenAddressesLikeVault = (
  addresses: string[],
  baseTokenAddress: string,
  viewDepositData: ViewDepositData
): BigNumber[] => {
  let liquidityToAdd: BigNumber[]

  console.log('sortTokensLikeVault: baseTokenAddress is ', baseTokenAddress)

  if (addresses[0] === baseTokenAddress) {
    console.log('sortTokensLikeVault: addresses[0] === baseTokenAddress')
    liquidityToAdd = [viewDepositData.deposits[0], viewDepositData.deposits[1]]
  } else if (addresses[1] === baseTokenAddress) {
    console.log('sortTokensLikeVault: addresses[1] === baseTokenAddress')
    liquidityToAdd = [viewDepositData.deposits[1], viewDepositData.deposits[0]]
  } else {
    throw console.error('sortTokensLikeVault: addresses[0] or addresses[1] is not expected')
  }

  return liquidityToAdd
}
