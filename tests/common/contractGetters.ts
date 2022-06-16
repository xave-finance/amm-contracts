import { ethers } from 'hardhat'
import { BaseToUsdAssimilator } from '../../typechain/BaseToUsdAssimilator'
import { FXPool } from '../../typechain/FXPool'
import { UsdcToUsdAssimilator } from '../../typechain/UsdcToUsdAssimilator'

export const getAssimilatorContract = async (assimilatorAddress: string): Promise<BaseToUsdAssimilator> => {
  const BaseAssimilatorFactory = await ethers.getContractFactory('BaseToUsdAssimilator')

  const baseAssimilator = BaseAssimilatorFactory.attach(assimilatorAddress)

  return baseAssimilator as BaseToUsdAssimilator
}

export const getUSDCAssimilatorContract = async (assimilatorAddress: string): Promise<UsdcToUsdAssimilator> => {
  const UsdcAssimilatorFactory = await ethers.getContractFactory('UsdcToUsdAssimilator')

  const usdcAssimilator = UsdcAssimilatorFactory.attach(assimilatorAddress)

  return usdcAssimilator as UsdcToUsdAssimilator
}

export const getFxPoolContract = async (
  fxPoolAddress: string,
  proportionalLiquidityAddress: string,
  swapsLibAddress: string
): Promise<FXPool> => {
  const FXPoolFactory = await ethers.getContractFactory('FXPool', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidityAddress,
      FXSwaps: swapsLibAddress,
    },
  })

  const fxPool = FXPoolFactory.attach(fxPoolAddress)

  return fxPool as FXPool
}
