import { BigNumber } from 'ethers'
import { parseEther } from 'ethers/lib/utils'

import { maxUint, maxInt, minInt } from '../common/v2-helpers/numbers'

// reference: https://etherscan.io/address/0xba12222222228d8ba445958a75a0704d566bf2c8
export const mockBalancerVaultValues = {
  pauseWindowEndTime: 100,
  bufferPeriodEndTime: 100,
}

export const MAX_UINT256: BigNumber = maxUint(256)
export const MAX_UINT112: BigNumber = maxUint(112)
export const MAX_UINT10: BigNumber = maxUint(10)
export const MAX_UINT31: BigNumber = maxUint(31)
export const MAX_UINT32: BigNumber = maxUint(32)
export const MAX_UINT64: BigNumber = maxUint(64)

export const MIN_INT22: BigNumber = minInt(22)
export const MAX_INT22: BigNumber = maxInt(22)
export const MIN_INT53: BigNumber = minInt(53)
export const MAX_INT53: BigNumber = maxInt(53)
export const MAX_INT256: BigNumber = maxInt(256)

export const MAX_GAS_LIMIT = 8e6
export const MAX_WEIGHTED_TOKENS = 100

export const INTIAL_MINT = '1000000000'

export const ONE_TO_THE_EIGHT_NUM = 100000000
export const ONE_TO_THE_EIGHT: BigNumber = BigNumber.from(`${ONE_TO_THE_EIGHT_NUM}`)
export const ONE_TO_THE_SIX_NUM = 1000000
export const ONE_TO_THE_SIX: BigNumber = BigNumber.from(`${ONE_TO_THE_SIX_NUM}`)
export const ONE_ETHER: BigNumber = parseEther('1')

export enum CONTRACT_REVERT {
  Ownable = 'Ownable: caller is not the owner',
  CapLimit = 'FXPool/amount-beyond-set-cap',
  CapLessThanLiquidity = 'FXPool/cap-less-than-total-liquidity',
}
