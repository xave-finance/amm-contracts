import { BigNumberish, Wallet } from 'ethers'
import { Vault } from '../../typechain/Vault'

export type CustomPoolDeployParams = {
  vaultContract: Vault,
  name: string,
	symbol: string,
	tokens: string[],
	swapFeePercentage: BigNumberish,
	pauseWindowDuration: BigNumberish,
	bufferPeriodDuration: BigNumberish,
  owner: Wallet
}