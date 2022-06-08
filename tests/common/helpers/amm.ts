import { BigNumber, BigNumberish, ethers } from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { sortAddresses } from '../../../scripts/utils/sortAddresses'
import { FXPool } from '../../../typechain/FXPool'
import { Vault } from '../../../typechain/Vault'
import { TestEnv } from '../setupEnvironment'
import { calculateLptOutAndTokensIn, calculateOtherTokenIn } from './frontend'
import { orderDataLikeFE, sortDataLikeVault } from './sorter'

export const simulateDeposit = async (
  quoteAmountsIn: string[],
  usdcAddress: string,
  tokenAddress: string,
  poolId: string,
  tokenDecimals: number,
  usdcDecimals: number,
  tokenAssimilatorAddress: string,
  usdcAssimilatorAddress: string,
  adminAddress: string,
  fxPool: FXPool,
  vault: Vault
) => {
  for (var i = 0; i < quoteAmountsIn.length; i++) {
    const amountIn1 = quoteAmountsIn[i]

    // Frontend estimation of other token in amount
    const poolTokens = await vault.getPoolTokens(poolId)
    const balances = orderDataLikeFE(poolTokens.tokens, tokenAddress, poolTokens.balances)
    const otherTokenIn = await calculateOtherTokenIn(
      amountIn1,
      1,
      balances,
      [tokenDecimals, usdcDecimals],
      [tokenAssimilatorAddress, usdcAssimilatorAddress]
    )

    const amountIn0 = formatUnits(otherTokenIn, tokenDecimals)
    console.log(`Deposit [${i}] amounts in: `, amountIn0, amountIn1)

    const sortedAddresses = sortAddresses([tokenAddress, usdcAddress])
    const sortedAmountsIn = sortDataLikeVault(sortedAddresses, tokenAddress, [amountIn0, amountIn1])
    const sortedDecimals = sortDataLikeVault(sortedAddresses, tokenAddress, [tokenDecimals, usdcDecimals])

    console.log('Sorted Addresses: ', sortedAddresses)
    console.log('Sorted Amounts In: ', sortedAmountsIn)
    console.log('Sorted Decimals: ', sortedDecimals)
    console.log([amountIn0, amountIn1])

    // Backend estimation `viewDeposit()` of LPT amount to receive + actual token ins
    const [estimatedLptAmount, estimatedAmountsIn, adjustedAmountsIn] = await calculateLptOutAndTokensIn(
      [amountIn0, amountIn1],
      [tokenDecimals, usdcDecimals],
      sortedAddresses,
      tokenAddress,
      fxPool
    )

    console.log(`Deposit [${i}] estimated lpt amount: `, estimatedLptAmount)

    console.log(
      `Deposit [${i}] of ${tokenAddress} estimated amounts in: `,
      formatUnits(estimatedAmountsIn[0], tokenDecimals),
      formatUnits(estimatedAmountsIn[1], usdcDecimals)
    )

    // Actual deposit `joinPool()` request
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, tokenAddress, adjustedAmountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])
    console.log(`Deposit [${i}] joinPool payload: `, sortedAmounts.toString(), sortedAddresses)

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0], sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1], sortedDecimals[1]),
    ]
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
