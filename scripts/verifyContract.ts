import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { sortAddresses } from './utils/sortAddresses'

declare const ethers: any
declare const hre: any

const verify = async() => {

  const CONTRACT = '0x6F40a5aa86C6a96efE3C916182D22cF8B687B193'

  const baseAssimilator = '0xa99202DD31C78B7A4f5C608ab286f1ac2bc03627' // PHP - USD
	const quoteAssimilator = '0xbe8aD396DCdDB55013499AD11E5de919027C42ee' // USDC - USD
  const baseTokenAddress = '0x95C29AAbcB6aE30147d271D800c4Df14e3e569fA'
  const quoteTokenAddress = '0xF559A88Bc17B5a9D9859cE9Cab53d1B13A2fe30A'
  const swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee

	const tokens = sortAddresses([baseTokenAddress, quoteTokenAddress]) // need to be sorted
	// const assets = [baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress]
	const assets = [baseTokenAddress, baseAssimilator, baseTokenAddress, baseAssimilator, baseTokenAddress,
										quoteTokenAddress, quoteAssimilator, quoteTokenAddress, quoteAssimilator, quoteTokenAddress]
	const assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
	const pauseWindowDuration = 7776000
	const bufferPeriodDuration = 2592000

  const PROPORTIONAL_LIQUIDITY = '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b'
  const SWAPS = '0x51Dd683319F8B74EC9aC582b3881c6382093527C'

  const CONSTRUCTOR_ARGS = [Vault.address,
    'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
    swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS]

  await hre.run('verify:verify', {
    address: CONTRACT,
    constructorArguments: [Vault.address,
      'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
      swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS],
    // constructorArguments: []
  })
}

verify()
  .then(() => process.exit(0))
  .catch((error) => console.error(error))