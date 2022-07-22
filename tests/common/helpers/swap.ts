import { TestEnv } from '../..//common/setupEnvironment'
import { ethers } from 'hardhat'
import * as types from '../..//common/types/types'
import { BigNumber, BytesLike } from 'ethers'
import { parseUnits } from '@ethersproject/units'
import { FXPool } from '../../../typechain/FXPool'
import { expect } from 'chai'

export const buildExecute_BatchSwapGivenIn = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_in_decimals: number,
  sender_address: string,
  recipient_address: string,
  fxPool: FXPool,
  testEnv: TestEnv,
  log: boolean
) => {
  const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  if (log) {
    console.log(
      'Batch Swap Given In: afterTradeUserUsdcBalance: ',
      await ethers.utils.formatUnits(beforeTradeUserUsdcBalance, 6)
    )
    console.log(
      'Batch Swap Given In: afterTradeUserfxPHPBalance: ',
      await ethers.utils.formatUnits(beforeTradeUserfxPHPBalance, 18)
    )
    console.log(
      'Batch Swap Given In: afterTradefxPHPPoolBalance: ',
      await ethers.utils.formatUnits(beforeTradefxPHPPoolBalance, 18)
    )
    console.log(
      'Batch Swap Given In: afterTradeUSDCPoolBalance: ',
      await ethers.utils.formatUnits(beforeTradeUSDCPoolBalance, 6)
    )
  }

  // SwapKind is an Enum
  // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
  // 0 = GIVEN_IN, 1 = GIVEN_OUT
  const SWAP_KIND = 0

  // swap these values if you want to reverse the order of tokens, but you need to chagne in conjunction with swaps.assetInIndex and swaps.assetOutIndex + swapAssets element ordering
  const ASSET_IN_INDEX = 0
  const ASSET_OUT_INDEX = 1

  const fund_settings = {
    sender: ethers.utils.getAddress(sender_address),
    recipient: ethers.utils.getAddress(recipient_address),
    fromInternalBalance: false,
    toInternalBalance: false,
  }

  const fund_struct: types.SwapFundStructForVault = {
    sender: ethers.utils.getAddress(fund_settings['sender']),
    fromInternalBalance: fund_settings['fromInternalBalance'],
    recipient: ethers.utils.getAddress(fund_settings['recipient']),
    toInternalBalance: fund_settings['toInternalBalance'],
  }
  if (log) console.log('fund_struct: ', fund_struct)

  const inputAmount = parseUnits(amountToSwap.toString(), asset_in_decimals)

  const swaps: types.BatchSwapDataForVault[] = [
    {
      poolId: (await fxPool.getPoolId()) as BytesLike,
      assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
      assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
      amount: inputAmount,
      userData: '0x' as BytesLike,
    },
  ]
  if (log) console.log('swaps: ', swaps)

  // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
  const swapAssets: string[] = [asset_in_address, asset_out_address]
  if (log) console.log('swapAssets: ', swapAssets)
  const limits = [parseUnits('999999999', asset_in_decimals), parseUnits('999999999')]
  const deadline = ethers.constants.MaxUint256
  // making this static call in an isolated environment only. not to be used in production to prevent sandwich attacks
  const expectedDeltas = await testEnv.vault.callStatic.queryBatchSwap(SWAP_KIND, swaps, swapAssets, fund_struct)
  const expectedOutput1 = expectedDeltas[1].abs() // since in the test we only do one way. will end just incase

  //dev.balancer.fi/guides/swaps/batch-swaps
  await expect(testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline))
    .to.emit(fxPool, 'FeesAccrued')
    .to.emit(fxPool, 'Trade')
    .withArgs(sender_address, asset_in_address, asset_out_address, inputAmount, expectedOutput1)
    .to.emit(testEnv.vault, 'Swap')
    .withArgs(await fxPool.getPoolId(), asset_in_address, asset_out_address, inputAmount, expectedOutput1)

  const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  expect(
    afterTradeUserfxPHPBalance,
    'Batch Swap Given In: After trade user fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradeUserfxPHPBalance.sub(inputAmount)
      : beforeTradeUserfxPHPBalance.add(expectedOutput1)
  )

  expect(afterTradeUserUsdcBalance, 'Batch Swap Given In: After trade user balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUserUsdcBalance.sub(inputAmount)
      : beforeTradeUserUsdcBalance.add(expectedOutput1)
  )

  expect(
    afterTradefxPHPPoolBalance,
    'Batch Swap Given In: After trade pool fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradefxPHPPoolBalance.add(inputAmount)
      : beforeTradefxPHPPoolBalance.sub(expectedOutput1)
  )

  expect(afterTradeUSDCPoolBalance, 'Batch Swap Given In: After trade pool usdc balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUSDCPoolBalance.add(inputAmount)
      : beforeTradeUSDCPoolBalance.sub(expectedOutput1)
  )

  if (log) {
    console.log(
      'Batch Swap Given In: afterTradeUserUsdcBalance: ',
      await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6)
    )
    console.log(
      'Batch Swap Given In: afterTradeUserfxPHPBalance: ',
      await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18)
    )
    console.log(
      'Batch Swap Given In: afterTradefxPHPPoolBalance: ',
      await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18)
    )
    console.log(
      'Batch Swap Given In: afterTradeUSDCPoolBalance: ',
      await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6)
    )
  }
}

export const buildExecute_BatchSwapGivenOut = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_out_decimals: number,
  sender_address: string,
  recipient_address: string,
  testEnv: TestEnv,
  fxPool: FXPool,
  log: boolean
) => {
  const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  if (log) {
    console.log('Batch Swap Given Out: beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('Batch Swap Given Out: beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('Batch Swap Given Out: beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('Batch Swap Given Out: beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)
  }

  const SWAP_KIND = 1

  // swap these values if you want to reverse the order of tokens, ie swap USDC for fxPHP instead of the current fxPHP for USDC
  const ASSET_IN_INDEX = '0'
  const ASSET_OUT_INDEX = '1'

  const fund_settings = {
    sender: ethers.utils.getAddress(sender_address),
    recipient: ethers.utils.getAddress(recipient_address),
    fromInternalBalance: false,
    toInternalBalance: false,
  }

  const fund_struct: types.SwapFundStructForVault = {
    sender: ethers.utils.getAddress(fund_settings['sender']),
    fromInternalBalance: fund_settings['fromInternalBalance'],
    recipient: ethers.utils.getAddress(fund_settings['recipient']),
    toInternalBalance: fund_settings['toInternalBalance'],
  }
  if (log) console.log('fund_struct: ', fund_struct)

  const outputAmount = parseUnits(amountToSwap.toString(), asset_out_decimals)
  const swaps: types.BatchSwapDataForVault[] = [
    {
      poolId: (await fxPool.getPoolId()) as BytesLike,
      assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
      assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
      amount: parseUnits(amountToSwap.toString(), asset_out_decimals),
      userData: '0x' as BytesLike,
    },
  ]
  if (log) console.log('swaps: ', swaps)

  // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
  const swapAssets: string[] = [asset_in_address, asset_out_address] // swap these positions to perform swap given out
  if (log) console.log('swapAssets: ', swapAssets)
  const limits = [parseUnits('999999999', asset_out_decimals), parseUnits('999999999')]
  const deadline = ethers.constants.MaxUint256
  // making this static call in an isolated environment only. not to be used in production to prevent sandwich attacks
  const expectedDeltas = await testEnv.vault.callStatic.queryBatchSwap(SWAP_KIND, swaps, swapAssets, fund_struct)
  const expectedInput1 = expectedDeltas[0].abs() // since in the test we only do one way. will end just incase

  //dev.balancer.fi/guides/swaps/batch-swaps

  await expect(testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline))
    .to.emit(fxPool, 'FeesAccrued')
    .to.emit(fxPool, 'Trade')
    .withArgs(sender_address, asset_in_address, asset_out_address, expectedInput1, outputAmount)
    .to.emit(testEnv.vault, 'Swap')
    .withArgs(await fxPool.getPoolId(), asset_in_address, asset_out_address, expectedInput1, outputAmount)

  const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  expect(
    afterTradeUserfxPHPBalance,
    'Batch Swap Given Out: After trade user fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradeUserfxPHPBalance.sub(expectedInput1)
      : beforeTradeUserfxPHPBalance.add(outputAmount)
  )

  expect(afterTradeUserUsdcBalance, 'Batch Swap Given Out: After trade user balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUserUsdcBalance.sub(expectedInput1)
      : beforeTradeUserUsdcBalance.add(outputAmount)
  )

  expect(
    afterTradefxPHPPoolBalance,
    'Batch Swap Given Out: After trade pool fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradefxPHPPoolBalance.add(expectedInput1)
      : beforeTradefxPHPPoolBalance.sub(outputAmount)
  )

  expect(afterTradeUSDCPoolBalance, 'Batch Swap Given Out: After trade pool usdc balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUSDCPoolBalance.add(expectedInput1)
      : beforeTradeUSDCPoolBalance.sub(outputAmount)
  )

  if (log) {
    console.log(
      'Batch Swap Given Out: afterTradeUserUsdcBalance: ',
      await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6)
    )
    console.log(
      'Batch Swap Given Out: afterTradeUserfxPHPBalance: ',
      await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18)
    )
    console.log(
      'Batch Swap Given Out: afterTradefxPHPPoolBalance: ',
      await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18)
    )
    console.log(
      'Batch Swap Given Out: afterTradeUSDCPoolBalance: ',
      await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6)
    )
  }
}

export const buildExecute_SingleSwapGivenIn = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_in_decimals: number,
  sender_address: string,
  recipient_address: string,
  fxPool: FXPool,
  testEnv: TestEnv,
  log: boolean
) => {
  const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  if (log) {
    console.log('Single Swap Given Out: beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('Single Swap Given Out: beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('Single Swap Given Out: beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('Single Swap Given Out: beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)
  }

  const SWAP_KIND = 0

  const fund_settings = {
    sender: ethers.utils.getAddress(sender_address),
    recipient: ethers.utils.getAddress(recipient_address),
    fromInternalBalance: false,
    toInternalBalance: false,
  }

  const deadline = ethers.constants.MaxUint256

  const fund_struct: types.SwapFundStructForVault = {
    sender: ethers.utils.getAddress(fund_settings['sender']),
    fromInternalBalance: fund_settings['fromInternalBalance'],
    recipient: ethers.utils.getAddress(fund_settings['recipient']),
    toInternalBalance: fund_settings['toInternalBalance'],
  }
  if (log) console.log('fund_struct: ', fund_struct)

  const inputAmount = parseUnits(amountToSwap.toString(), asset_in_decimals)

  const singleSwap: types.SingleSwapDataForVault[] = [
    {
      poolId: (await fxPool.getPoolId()) as BytesLike,
      kind: BigNumber.from(SWAP_KIND),
      assetIn: asset_in_address, // assetIn must match swap assets ordering, in this case usdc is origin
      assetOut: asset_out_address, // assetOut must match swap assets ordering, in this case fxPHP is target
      amount: inputAmount,
      userData: '0x' as BytesLike,
    },
  ]
  if (log) console.log('singleSwap: ', singleSwap)

  const limit = '0' // max limit to receive
  // making this static call in an isolated environment only. not to be used in production to prevent sandwich attacks
  const expectedOutputAmount = await testEnv.vault.callStatic.swap(singleSwap[0], fund_struct, limit, deadline)

  await expect(testEnv.vault.swap(singleSwap[0], fund_struct, limit, deadline))
    .to.emit(fxPool, 'FeesAccrued')
    .to.emit(fxPool, 'Trade')
    .withArgs(sender_address, asset_in_address, asset_out_address, inputAmount, expectedOutputAmount)
    .to.emit(testEnv.vault, 'Swap')
    .withArgs(await fxPool.getPoolId(), asset_in_address, asset_out_address, inputAmount, expectedOutputAmount)

  const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
  const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
  const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  expect(
    afterTradeUserfxPHPBalance,
    'Single Swap Given Out: After trade user fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradeUserfxPHPBalance.sub(inputAmount)
      : beforeTradeUserfxPHPBalance.add(expectedOutputAmount)
  )

  expect(afterTradeUserUsdcBalance, 'Single Swap Given Out: After trade user balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUserUsdcBalance.sub(inputAmount)
      : beforeTradeUserUsdcBalance.add(expectedOutputAmount)
  )

  expect(
    afterTradefxPHPPoolBalance,
    'Single Swap Given Out: After trade pool fxPHP balance is not accurate'
  ).to.be.equals(
    asset_in_address === testEnv.fxPHP.address
      ? beforeTradefxPHPPoolBalance.add(inputAmount)
      : beforeTradefxPHPPoolBalance.sub(expectedOutputAmount)
  )

  expect(afterTradeUSDCPoolBalance, 'After trade pool usdc balance is not accurate').to.be.equals(
    asset_in_address === testEnv.USDC.address
      ? beforeTradeUSDCPoolBalance.add(inputAmount)
      : beforeTradeUSDCPoolBalance.sub(expectedOutputAmount)
  )

  if (log) {
    console.log(
      'Single Swap Given Out: afterTradeUserUsdcBalance: ',
      await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6)
    )
    console.log(
      'Single Swap Given Out: afterTradeUserfxPHPBalance: ',
      await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18)
    )
    console.log(
      'Single Swap Given Out: afterTradefxPHPPoolBalance: ',
      await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18)
    )
    console.log(
      'Single Swap Given Out: afterTradeUSDCPoolBalance: ',
      await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6)
    )
  }
}
