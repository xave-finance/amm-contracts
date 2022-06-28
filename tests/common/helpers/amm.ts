import { ethers } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { sortAddresses } from '../../../scripts/utils/sortAddresses'
import { Vault } from '../../../typechain/Vault'

export const simulateDeposit = async (
  quoteAmountsIn: string[],
  usdcAddress: string,
  tokenAddress: string,
  poolId: string,
  adminAddress: string,

  vault: Vault
) => {
  for (var i = 0; i < quoteAmountsIn.length; i++) {
    const numeraireAmount = quoteAmountsIn[i]

    const sortedAddresses = sortAddresses([tokenAddress, usdcAddress])

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address[]'],
      [parseEther(numeraireAmount), sortedAddresses]
    )

    const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddresses,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)
  }
}
