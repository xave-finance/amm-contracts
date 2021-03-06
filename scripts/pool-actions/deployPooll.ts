import sleep from '../utils/sleep'
import editJson from 'edit-json-file'
import open from 'open'

import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import { CurveMath__factory } from '../../typechain/factories/CurveMath__factory'
import { Assimilators__factory } from '../../typechain/factories/Assimilators__factory'

import { fp } from '../utils/numbers'

declare const ethers: any
declare const hre: any

const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)
const listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST')
import { sortAddresses } from '../utils/sortAddresses'

interface ExtendedJsonEditor extends editJson.JsonEditor {
	append: (key: any, item: any) => any
}

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`) as ExtendedJsonEditor

export default async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const baseToken = taskArgs.basetoken
	const quoteToken = taskArgs.quotetoken
	const baseAssimilator = taskArgs.baseAssimilator
	const quoteAssimilator = taskArgs.quoteassimilator
	const network = taskArgs.to
	const force = taskArgs.force
	const verify = taskArgs.verify

	console.log(`Deploying on: ${network}`)

	const baseTokenAddress = await TOKENS_FILE.get(`${baseToken}.${network}`)
	const quoteTokenAddress = await TOKENS_FILE.get(`${quoteToken}.${network}`)

	console.log(`Base Token address: ${baseTokenAddress}`)
	console.log(`Quote Token address: ${quoteTokenAddress}`)

	// const baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F' // W-PESO - W-USDC
	// const quoteAssimilator = '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC' // W-USDC - USD

	const baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F' // CHF
	const quoteAssimilator = '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC' // USDC
	const assimilators = { address: '0x15C31d61687981dec710D1EaC307488df60B6751' }
	const curveMath = { address: '0x1155bBF23f3c99583Ecd825592df8181f94830f8' }

	/** Deploy Assimilators */
	// const AssimilatorsLib = new Assimilators__factory(deployer)
	// const assimilators = await AssimilatorsLib.deploy()
	// await assimilators.deployed()

	// // console.log('assimilators:', assimilators.address)

	// /** Deploy Curve Math */
	// const CurveMathLib = new CurveMath__factory(deployer)
	// const curveMath = await CurveMathLib.deploy()
	// await curveMath.deployed()

	// console.log('curveMath:', curveMath.address)

	// const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity', {
	// 	// libraries: {
	// 	// 	Assimilators: assimilators.address,
	// 	// 	CurveMath: curveMath.address,
	// 	// }
	// })

  // const proportionalLiquidityContract = await ProportionalLiquidityFactory.deploy()
  // await proportionalLiquidityContract.deployed()

	// const SwapsFactory = await ethers.getContractFactory('AmmV1Swaps', {
	// 	libraries: {
	// 		Assimilators: assimilators.address,
	// 		// CurveMath: curveMath.address,
	// 	}
	// })

	// const swapsContract = await SwapsFactory.deploy()
  // await swapsContract.deployed()

	
	const proportionalLiquidityContract = { address: '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b' }
	const swapsContract = { address: '0x51dd683319f8b74ec9ac582b3881c6382093527c' }

	console.log('swapsContract:', swapsContract.address)

	const PROPORTIONAL_LIQUIDITY = proportionalLiquidityContract.address
	const SWAPS = swapsContract.address



	const CustomPool = await ethers.getContractFactory('FXPool', {
		libraries: {
			Assimilators: assimilators.address,
			CurveMath: curveMath.address,
		}
	})
	const swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee

	// const tokens = sortAddresses([baseTokenAddress, quoteTokenAddress]) // need to be sorted
	const tokens = [quoteTokenAddress, baseTokenAddress]
	console.log('tokens:', tokens)
	// const assets = [baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress, quoteTokenAddress, baseTokenAddress]
	const assets = [baseTokenAddress, baseAssimilator, baseTokenAddress, baseAssimilator, baseTokenAddress,
										quoteTokenAddress, quoteAssimilator, quoteTokenAddress, quoteAssimilator, quoteTokenAddress]
	const assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
	const pauseWindowDuration = 7776000
	const bufferPeriodDuration = 2592000
	const owner = false ? '0x0000000000000000000000000000000000000000' : deployer.address

	if (false) {
		const contractBytecode = CustomPool.bytecode

		const encodedDeploy = await CustomPool.interface.encodeDeploy([Vault.address,
			'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
			swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS])

		const bytecodePlusEncodedDeploy = ethers.utils.hexConcat([contractBytecode, encodedDeploy])

		const txPayload = {
			chainId: 42,
			data: bytecodePlusEncodedDeploy,
			nonce: await ethers.provider.getTransactionCount(deployer.address),
			value: ethers.utils.parseEther('0'),
			gasLimit: ethers.utils.parseUnits('0.01', 'gwei'),
		}
		let deployTxReceipt

		try {
			deployTxReceipt = await deployer.sendTransaction(txPayload as any)

			const reciepit = await deployTxReceipt.wait()

			console.log('reciepit:', reciepit)
		} catch (Error) {
			// console.error(Error)
		}
		
		console.log(`Transaction Hash:`,
			`https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)

		// await open(`https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)
		await open(`https://dashboard.tenderly.co/tx/${network}/${deployTxReceipt?.hash}`)
	} else {
		const customPool = await CustomPool.deploy(
			Vault.address,
			'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
			swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS
		)
	
		await customPool.deployed()
		console.log(`Custom Pool deployed at: ${customPool.address}`)
	
		const poolId = await customPool.getPoolId()
		console.log('Custom Pool ID:', poolId)

		await POOLS_FILE.set(`${baseToken}-${quoteToken}.${network}.address`, customPool.address).save()
		await POOLS_FILE.set(`${baseToken}-${quoteToken}.${network}.poolId`, poolId).save()
		await POOLS_FILE.set(
			`${baseToken}-${quoteToken}.${network}.baseTokenAddress`,
			baseTokenAddress
		).save()
		await POOLS_FILE.set(
			`${baseToken}-${quoteToken}.${network}.quoteTokenAddress`,
			quoteTokenAddress
		).save()
		await POOLS_FILE.append(`POOLS_LIST`, `${baseToken}-${quoteToken}`).save()

		await sleep(150000)

		// await hre.run('verify:verify', {
		// 	address: assimilators.address
		// })

		// await hre.run('verify:verify', {
		// 	address: curveMath.address
		// })

		// // await hre.run('verify:verify', {
		// // 	address: proportionalLiquidityContract.address
		// // })

		// await hre.run('verify:verify', {
		// 	address: swapsContract.address
		// })

		await customPool.setParams(
			fp(0.8),
			fp(0.48),
			fp(0.175),
			fp(0.0005),
			fp(0.3),
		)

		console.log(Vault.address,
			'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
			swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS)

		await hre.run('verify:verify', {
			address: customPool.address,
			constructorArguments: [Vault.address,
				'Custom V2 Pool', `${baseTokenAddress}-${quoteTokenAddress} LP`, tokens, assets, assetWeights,
				swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS],
		})
	}

	// const customPool = await CustomPool.deploy(
	// 	Vault.address,
	// 	'Custom V2 Pool',
	// 	`${baseTokenAddress}-${quoteTokenAddress} LP`,
	// 	tokens,
	// 	assetWeights,
	// 	swapFeePercentage,
	// 	pauseWindowDuration,
	// 	bufferPeriodDuration,
	// 	owner,
	// 	proportionalLiquidity.address
	// )

	// await customPool.deployed()
	// console.log(`Custom Pool deployed at: ${customPool.address}`)

	// const poolId = await customPool.getPoolId()
	// console.log('Custom Pool ID:', poolId)

	// await POOLS_FILE.set(`${baseToken}-${quoteToken}.${network}.address`, customPool.address).save()
	// await POOLS_FILE.set(`${baseToken}-${quoteToken}.${network}.poolId`, poolId).save()
	// await POOLS_FILE.set(
	// 	`${baseToken}-${quoteToken}.${network}.baseTokenAddress`,
	// 	baseTokenAddress
	// ).save()
	// await POOLS_FILE.set(
	// 	`${baseToken}-${quoteToken}.${network}.quoteTokenAddress`,
	// 	quoteTokenAddress
	// ).save()
	// await POOLS_FILE.append(`POOLS_LIST`, `${baseToken}-${quoteToken}`).save()

	// await hre.run('verify:verify', {
	// 	address: PROPORTIONAL_LIQUIDITY,
	// })

	// await hre.run('verify:verify', {
	// 	address: customPool.address,
	// 	constructorArguments: [
	// 		Vault.address,
	// 		'Custom Pool',
	// 		`${baseTokenAddress}-${quoteTokenAddress} LP`,
	// 		tokens,
	// 		assetWeights,
	// 		swapFeePercentage,
	// 		pauseWindowDuration,
	// 		bufferPeriodDuration,
	// 		owner,
	// 		proportionalLiquidity.address,
	// 	],
	// })
}
