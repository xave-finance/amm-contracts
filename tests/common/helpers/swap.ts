import { TestEnv } from '../..//common/setupEnvironment'
import { ethers } from 'hardhat'
import * as types from '../..//common/types/types'
import { BigNumber, BytesLike, Signer } from 'ethers'
import { parseEther, parseUnits } from '@ethersproject/units'

export const buildExecute_BatchSwapGivenIn = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_in_decimals: number,
  sender_address: string,
  recipient_address: string,
  testEnv: TestEnv,
  log: boolean
) => {
  if (testEnv) {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)
  }

  // SwapKind is an Enum
  // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
  // 0 = GIVEN_IN, 1 = GIVEN_OUT
  const SWAP_KIND = 0

  // swap these values if you want to reverse the order of tokens, ie swap USDC for fxPHP instead of the current fxPHP for USDC
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
  console.log('fund_struct: ', fund_struct)

  const swaps: types.BatchSwapDataForVault[] = [
    {
      poolId: (await testEnv.fxPool.getPoolId()) as BytesLike,
      assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
      assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
      amount: amountToSwap,
      userData: '0x' as BytesLike,
    },
  ]
  console.log('swaps: ', swaps)

  // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
  const swapAssets: string[] = [asset_in_address, asset_out_address]
  console.log('swapAssets: ', swapAssets)
  const limits = [parseUnits('999999999', asset_in_decimals), parseUnits('999999999')]
  const deadline = ethers.constants.MaxUint256

  //dev.balancer.fi/guides/swaps/batch-swaps
  await testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline)

  if (testEnv) {
    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('afterTradeUserUsdcBalance: ', await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6))
    console.log('afterTradeUserfxPHPBalance: ', await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18))
    console.log('afterTradefxPHPPoolBalance: ', await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18))
    console.log('afterTradeUSDCPoolBalance: ', await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6))
  }
}

export const buildExecute_BatchSwapGivenOut = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_in_decimals: number,
  sender_address: string,
  recipient_address: string,
  testEnv: TestEnv,
  log: boolean
) => {
  if (testEnv) {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)
  }

  const SWAP_KIND = 1

  // swap these values if you want to reverse the order of tokens, ie swap USDC for fxPHP instead of the current fxPHP for USDC
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
  console.log('fund_struct: ', fund_struct)

  const swaps: types.BatchSwapDataForVault[] = [
    {
      poolId: (await testEnv.fxPool.getPoolId()) as BytesLike,
      assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
      assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
      amount: amountToSwap,
      userData: '0x' as BytesLike,
    },
  ]
  console.log('swaps: ', swaps)

  // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
  const swapAssets: string[] = [asset_out_address, asset_in_address] // swap these positions to perform swap given out
  console.log('swapAssets: ', swapAssets)
  const limits = [parseUnits('999999999', asset_in_decimals), parseUnits('999999999')]
  const deadline = ethers.constants.MaxUint256

  //dev.balancer.fi/guides/swaps/batch-swaps
  await testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline)

  if (testEnv) {
    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('afterTradeUserUsdcBalance: ', await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6))
    console.log('afterTradeUserfxPHPBalance: ', await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18))
    console.log('afterTradefxPHPPoolBalance: ', await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18))
    console.log('afterTradeUSDCPoolBalance: ', await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6))
  }
}

export const buildExecute_SingleSwapGivenIn = async (
  asset_in_address: string,
  asset_out_address: string,
  amountToSwap: number,
  asset_in_decimals: number,
  sender_address: string,
  recipient_address: string,
  testEnv: TestEnv,
  log: boolean
) => {
  if (testEnv) {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)
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
  console.log('fund_struct: ', fund_struct)

  const singleSwap: types.SingleSwapDataForVault[] = [
    {
      poolId: (await testEnv.fxPool.getPoolId()) as BytesLike,
      kind: BigNumber.from(SWAP_KIND),
      assetIn: asset_in_address, // assetIn must match swap assets ordering, in this case usdc is origin
      assetOut: asset_out_address, // assetOut must match swap assets ordering, in this case fxPHP is target
      amount: amountToSwap,
      userData: '0x' as BytesLike,
    },
  ]
  console.log('singleSwap: ', singleSwap)

  const limit = parseUnits('999999999', asset_in_decimals)
  await testEnv.vault.swap(singleSwap[0], fund_struct, limit, deadline)

  if (testEnv) {
    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(sender_address)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(sender_address)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('afterTradeUserUsdcBalance: ', await ethers.utils.formatUnits(afterTradeUserUsdcBalance, 6))
    console.log('afterTradeUserfxPHPBalance: ', await ethers.utils.formatUnits(afterTradeUserfxPHPBalance, 18))
    console.log('afterTradefxPHPPoolBalance: ', await ethers.utils.formatUnits(afterTradefxPHPPoolBalance, 18))
    console.log('afterTradeUSDCPoolBalance: ', await ethers.utils.formatUnits(afterTradeUSDCPoolBalance, 6))
  }
}
