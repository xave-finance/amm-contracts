import editJson from 'edit-json-file'
import open from 'open'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { FakeToken__factory } from '../../typechain/factories/FakeToken__factory'
import { BaseToUsdAssimilator__factory } from '../../typechain/factories/BaseToUsdAssimilator__factory'
import { UsdcToUsdAssimilator__factory } from '../../typechain/factories/UsdcToUsdAssimilator__factory'
import { CurveMath__factory } from '../../typechain/factories/CurveMath__factory'
import { Assimilators__factory } from '../../typechain/factories/Assimilators__factory'

import sleep from '../utils/sleep'
import { fp } from '../utils/numbers'
import { sortAddresses } from '../utils/sortAddresses'
import verifyContract from '../utils/verify'
import encodeDeploy from '../utils/encodeDeploy'

import DEPLOY_POOL_CONSTANTS from '../constants/DEPLOY_POOL.json'

declare const ethers: any
declare const hre: any

const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)

interface ExtendedJsonEditor extends editJson.JsonEditor {
	append: (key: any, item: any) => any
}

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`) as ExtendedJsonEditor

const DEPLOYMENT_STRATEGY = {
	FRESH_CONTRACTS: 'FRESH_CONTRACTS',
	CONSTANT_CONTRACTS: 'CONSTANT_CONTRACTS',
	SPECIFY_CONTRACTS: 'SPECIFY_CONTRACTS',
}

// const SWAP_FEE_PERCENTAGE = ethers.utils.parseEther('0.000001')
// const ASSET_WEIGHTS = [ethers.utils.parseEther('0.5'), ethers.utils.parseEther('0.5')]
const SWAP_FEE_PERCENTAGE = fp(0.000001)
const ASSET_WEIGHTS = [fp(0.5), fp(0.5)]
const PAUSE_WINDOW_DURATION = 7776000
const BUFFER_PERIOD_DURATION = 2592000

export default async (taskArgs: any) => {
	// await hre.compile() // @todo Find way to compile contracts during execution of deploy script
	switch (taskArgs.strategy) {
		case DEPLOYMENT_STRATEGY.FRESH_CONTRACTS:
			return freshContractsDeploy(taskArgs)
		case DEPLOYMENT_STRATEGY.CONSTANT_CONTRACTS:
			return constantContractsDeploy(taskArgs)
		case DEPLOYMENT_STRATEGY.SPECIFY_CONTRACTS:
			return specifyContractsDeploy(taskArgs)
	}
}

const _prepareFXPoolConstructor = (
	baseTokenAddress: string,
	quoteTokenAddress: string,
	baseAssimilator: string,
	quoteAssimilator: string
) => {
	return {
		tokens: sortAddresses([baseTokenAddress, quoteTokenAddress]),
		assets: [
			baseTokenAddress,
			baseAssimilator,
			baseTokenAddress,
			baseAssimilator,
			baseTokenAddress,
			quoteTokenAddress,
			quoteAssimilator,
			quoteTokenAddress,
			quoteAssimilator,
			quoteTokenAddress,
		],
	}
}

const _forceDeploy = async (
	deployer: any,
	network: string,
	FXPoolFactory: any,
	constructorArgs: any[]
) => {
	const bytecodePlusEncodedDeploy = await encodeDeploy(FXPoolFactory, constructorArgs)

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

		const reciept = await deployTxReceipt.wait()

		console.log('reciept:', reciept)
	} catch (Error) {
		console.error(Error)
	}

	console.log(`Transaction Hash:`, `https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)

	await open(`https://dashboard.tenderly.co/tx/${network}/${deployTxReceipt?.hash}`)
}

const freshContractsDeploy = async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const network = taskArgs.to
	const force = taskArgs.force === 'true'
	const verify = taskArgs.verify === 'true'

	/** Deploy Base Token */
	const FakeTokenFactory = new FakeToken__factory(deployer)
	const baseToken = await FakeTokenFactory.deploy('Base Token', 'BASE', 8) // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
	await baseToken.deployed()
	console.log(`Base Token: ${baseToken.address}`)
	await TOKENS_FILE.set(`${await baseToken.symbol()}.${process.env.HARDHAT_NETWORK}`, baseToken.address).save()
  await TOKENS_FILE.append(`SYMBOLS_LIST`, await baseToken.symbol()).save()

	/** Deploy Quote Token */
	const quoteToken = await FakeTokenFactory.deploy('Quote Token', 'QUOTE', 6) // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
	await quoteToken.deployed()
	console.log(`Quote Token: ${quoteToken.address}`)
	await TOKENS_FILE.set(`${await quoteToken.symbol()}.${process.env.HARDHAT_NETWORK}`, quoteToken.address).save()
  await TOKENS_FILE.append(`SYMBOLS_LIST`, await quoteToken.symbol()).save()

	/** Deploy Base Assimilator */
	const BaseToUsdAssimilatorFactory = new BaseToUsdAssimilator__factory(deployer)
	const baseToUsdAssimilator = await BaseToUsdAssimilatorFactory.deploy(
		await baseToken.decimals(),
		baseToken.address,
		quoteToken.address,
		// '<ORACLE_ADDRESS>'
		'0xed0616BeF04D374969f302a34AE4A63882490A8C'
	)
	await baseToUsdAssimilator.deployed()
	console.log(`BaseToUSD Assimilator: ${baseToUsdAssimilator.address}`)

	/** Deploy Quote Assimilator */
	const UsdcToUsdAssimilatorFactory = new UsdcToUsdAssimilator__factory(deployer)
	const usdcToUsdAssimilator = await UsdcToUsdAssimilatorFactory.deploy(
		// MAKE SURE TO MANUALLY CHANGE DECIMALS IN UsdcToUsdAssimilator.sol
		// '<ORACLE ADDRESS>',
		'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
		quoteToken.address
	)
	await usdcToUsdAssimilator.deployed()
	console.log(`USDCToUSD Assimilator: ${usdcToUsdAssimilator.address}`)

	/** Deploy Assimilators */
	const AssimilatorsLib = new Assimilators__factory(deployer)
	const assimilators = await AssimilatorsLib.deploy()
	await assimilators.deployed()
	console.log(`Assimilator: ${assimilators.address}`)

	/** Deploy Curve Math */
	const CurveMathLib = new CurveMath__factory(deployer)
	const curveMath = await CurveMathLib.deploy()
	await curveMath.deployed()
	console.log(`Curve Math: ${curveMath.address}`)

	/** Deploy Proportional Liquidity */
	const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity', {
		libraries: {
			Assimilators: assimilators.address,
			CurveMath: curveMath.address,
		},
	})
	const proportionalLiquidityContract = await ProportionalLiquidityFactory.deploy()
	await proportionalLiquidityContract.deployed()
	console.log(`Proportional Liquidity: ${proportionalLiquidityContract.address}`)

	/** Deploy Swaps */
	const SwapsFactory = await ethers.getContractFactory('AmmV1Swaps', {
		libraries: {
			Assimilators: assimilators.address,
			// CurveMath: curveMath.address,
		},
	})
	const swapsContract = await SwapsFactory.deploy()
	await swapsContract.deployed()
	console.log(`Swaps: ${swapsContract.address}`)

	const { tokens, assets } = _prepareFXPoolConstructor(
		await baseToken.address,
		await quoteToken.address,
		await baseToUsdAssimilator.address,
		await usdcToUsdAssimilator.address
	)

	const FXPoolFactory = await ethers.getContractFactory('FXPool', {
		libraries: {
			Assimilators: await assimilators.address,
			CurveMath: await curveMath.address,
		},
	})

	const constructorArgs = [
		Vault.address,
		'FX Pool',
		`FX-HLP`,
		tokens,
		assets,
		ASSET_WEIGHTS,
		SWAP_FEE_PERCENTAGE,
		PAUSE_WINDOW_DURATION,
		BUFFER_PERIOD_DURATION,
		await proportionalLiquidityContract.address,
		await swapsContract.address,
	]

	let fxPool

	if (force) {
		await _forceDeploy(deployer, network, FXPoolFactory, constructorArgs)
	} else {
		try {
			fxPool = await FXPoolFactory.deploy(...constructorArgs)
			await fxPool.deployed()
			console.log(`FX Pool: ${fxPool.address}`)

			const poolId = await fxPool.getPoolId()
			console.log('FX Pool ID:', poolId)

			await POOLS_FILE.set(`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.address`, fxPool.address).save()
			await POOLS_FILE.set(`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.poolId`, poolId).save()
			await POOLS_FILE.set(
				`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.baseTokenAddress`,
				baseToken.address
			).save()
			await POOLS_FILE.set(
				`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.quoteTokenAddress`,
				quoteToken.address
			).save()
			await POOLS_FILE.append(`POOLS_LIST`, `${await baseToken.symbol()}-${await quoteToken.symbol()}`).save()
		} catch (DeployError) {
			console.error(`Deploy FX Pool Error:`, DeployError)
		}
	}

	if (verify) {
		console.log('Waiting for 250 seconds before attempting to verify deployed contracts.')
		await sleep(250000)
		// await verifyContract(hre, baseToken.address, ['Base Token', 'BASE', 8])
		// await verifyContract(hre, quoteToken.address, ['Quote Token', 'QUOTE', 6])
		// await verifyContract(hre, baseToUsdAssimilator.address, [
		// 	await baseToken.decimals(),
		// 	baseToken.address,
		// 	quoteToken.address,
		// 	'0xed0616BeF04D374969f302a34AE4A63882490A8C',
		// ])
		// await verifyContract(hre, usdcToUsdAssimilator.address, [
		// 	'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
		// 	quoteToken.address,
		// ])
		await verifyContract(hre, assimilators.address, [])
		await verifyContract(hre, curveMath.address, [])
		await verifyContract(hre, proportionalLiquidityContract.address, [])
		await verifyContract(hre, swapsContract.address, [])
		await verifyContract(hre, fxPool.address, constructorArgs)
	}
}

const constantContractsDeploy = async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const network = taskArgs.to
	const force = taskArgs.force === 'true'
	const verify = taskArgs.verify === 'true'

	const DEPLOY_PARAMS = DEPLOY_POOL_CONSTANTS[network as 'kovan']

	const { assets, tokens } = _prepareFXPoolConstructor(
		// DEPLOY_PARAMS.BASE_TOKEN,
		// DEPLOY_PARAMS.QUOTE_TOKEN,
		// DEPLOY_PARAMS.BASE_ASSIMILATOR,
		// DEPLOY_PARAMS.QUOTE_ASSIMILATOR
		'0x008486BF13E7eaf140A0168b7f7cb724a01B2092',
		'0x7c4e10f2A9e8e23882675e48e8979708349341Ee',
		'0x9e7A854E962aA8BB0E010Dad13FBB22C94935867',
		'0xa44f1922A3b2Effc53D3d8AcbAd02d4ABc744384',
	)
	const constructorArgs = [
		Vault.address,
		'FX Pool',
		`FX-HLP`,
		tokens,
		assets,
		ASSET_WEIGHTS,
		SWAP_FEE_PERCENTAGE,
		PAUSE_WINDOW_DURATION,
		BUFFER_PERIOD_DURATION,
		DEPLOY_PARAMS.PROPORTIONAL_LIQUIDITY,
		DEPLOY_PARAMS.SWAPS,
	]

	// JUST WANT TO VERIFY
	// if (true) {
	// 	await verifyContract(hre, '0x52031682FDa01930102f730B1ba0C909C6821c4d', constructorArgs)
	// 	return
	// }

	const FXPoolFactory = await ethers.getContractFactory('FXPool', {
		libraries: {
			Assimilators: DEPLOY_PARAMS.ASSIMILATORS,
			CurveMath: DEPLOY_PARAMS.CURVE_MATH,
		},
	})

	console.log(`Using constants:`)
	console.table(DEPLOY_PARAMS)

	const ERC20 = await ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20')
	const baseToken = await ERC20.attach(DEPLOY_PARAMS.BASE_TOKEN,)
  const quoteToken = await ERC20.attach(DEPLOY_PARAMS.QUOTE_TOKEN)

	let fxPool

	if (force) {
		await _forceDeploy(deployer, network, FXPoolFactory, constructorArgs)
	} else {
		try {
			fxPool = await FXPoolFactory.deploy(...constructorArgs)
			await fxPool.deployed()
			console.log(`FX Pool: ${fxPool.address}`)

			const poolId = await fxPool.getPoolId()
			console.log('FX Pool ID:', poolId)

			await POOLS_FILE.set(`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.address`, fxPool.address).save()
			await POOLS_FILE.set(`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.poolId`, poolId).save()
			await POOLS_FILE.set(
				`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.baseTokenAddress`,
				baseToken.address
			).save()
			await POOLS_FILE.set(
				`${await baseToken.symbol()}-${await quoteToken.symbol()}.${network}.quoteTokenAddress`,
				quoteToken.address
			).save()
			await POOLS_FILE.append(`POOLS_LIST`, `${await baseToken.symbol()}-${await quoteToken.symbol()}`).save()
		} catch (DeployError) {
			console.error(`Deploy FX Pool Error:`, DeployError)
		}
		// @todo Save to POOLS.json record
	}

	if (verify) {
		console.log(`Waiting for 150 seconds before attempting to verify.`);
		await sleep(150000)

		await verifyContract(hre, fxPool.address, constructorArgs)
	}
}

const specifyContractsDeploy = async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const network = taskArgs.to
	const force = taskArgs.force
	const verify = taskArgs.verify
}
