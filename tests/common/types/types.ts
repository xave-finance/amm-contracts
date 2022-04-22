import { BigNumber, BytesLike } from 'ethers'

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

export type SwapDataForVault = {
  poolId: BytesLike
  assetInIndex: BigNumber
  assetOutIndex: BigNumber
  amount: number
  userData: BytesLike
}

// export type SwapStructDataForVault = {
//   swaps: SwapDataForVault[]
//   maxOriginAmount: number
//   minTargetAmount: number
// }

export type SwapFundStructForVault = {
  sender: string
  fromInternalBalance: boolean
  recipient: string
  toInternalBalance: boolean
}

// export type TxObjectForVault = {
//   chainId: string,
//     gas: string,
//     gasPrice: web3.utils.toHex(web3.utils.toWei(gas_price, 'gwei')),
//     nonce: await web3.eth.getTransactionCount(address),
//     data: single_swap_function.encodeABI(),
//     to: address_vault,
// }
