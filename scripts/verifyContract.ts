import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { sortAddresses } from './utils/sortAddresses'

declare const ethers: any
declare const hre: any

const verify = async() => {

  const CONTRACT = '0x1e9Acc58DFCd3DCc9BE00a7cbe1e4FF633e9E3b5'

  const baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F' // W-PESO - W-USDC
	const quoteAssimilator = '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC' // W-USDC - USD
  const baseTokenAddress = '0xaE70265126c20F64A6b011b86F8E7852B0010eCe'
  const quoteTokenAddress = '0xa57c092a117C9dE50922A75674dd35ab34d82c4A'
  const swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee

	const tokens = sortAddresses([baseTokenAddress, quoteTokenAddress]) // need to be sorted
	// const assets = [baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress]
	const assets = [baseTokenAddress, baseAssimilator, baseTokenAddress, baseAssimilator, baseTokenAddress,
										quoteTokenAddress, quoteAssimilator, quoteTokenAddress, quoteAssimilator, quoteTokenAddress]
	const assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
	const pauseWindowDuration = 7776000
	const bufferPeriodDuration = 2592000

  const PROPORTIONAL_LIQUIDITY = '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b'
  const SWAPS = '0x2bde781a5B6c0747058c1e1C0998BCb87d4e2CE5'

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