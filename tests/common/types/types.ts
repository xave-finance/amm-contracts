import { BigNumber, BigNumberish, BytesLike } from 'ethers'

export type ViewDepositData = {
  lptAmount: BigNumber
  deposits: BigNumber[]
}

export type TokenData = {
  symbol: string
  decimals: number
  limit: number
}

export type TokenDataMapping = {
  [key: string]: TokenData
}

export type BatchSwapDataForVault = {
  poolId: BytesLike
  assetInIndex: BigNumber
  assetOutIndex: BigNumber
  amount: BigNumberish
  userData: BytesLike
}

export type SingleSwapDataForVault = {
  poolId: BytesLike
  kind: BigNumberish
  assetIn: string
  assetOut: string
  amount: BigNumberish
  userData: BytesLike
}

export type SwapFundStructForVault = {
  sender: string
  fromInternalBalance: boolean
  recipient: string
  toInternalBalance: boolean
}
