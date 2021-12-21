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

		const reciepit = await deployTxReceipt.wait()

		console.log('reciepit:', reciepit)
	} catch (Error) {
		// console.error(Error)
	}

	console.log(`Transaction Hash:`, `https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)

	await open(`https://dashboard.tenderly.co/tx/${network}/${deployTxReceipt?.hash}`)
}

const freshContractsDeploy = async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const network = taskArgs.to
	const force = taskArgs.force
	const verify = taskArgs.verify

	/** Deploy Base Token */
	const FakeTokenFactory = new FakeToken__factory(deployer)
	const baseToken = await FakeTokenFactory.deploy('Base Token', 'BASE') // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
	await baseToken.deployed()

	/** Deploy Quote Token */
	const quoteToken = await FakeTokenFactory.deploy('Quote Token', 'QUOTE') // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
	await quoteToken.deployed()

	/** Deploy Base Assimilator */
	const BaseToUsdAssimilatorFactory = new BaseToUsdAssimilator__factory(deployer)
	const baseToUsdAssimilator = await BaseToUsdAssimilatorFactory.deploy(
		await baseToken.decimals(),
		await baseToken.address,
		await quoteToken.address,
		// '<ORACLE_ADDRESS>'
		'0xed0616BeF04D374969f302a34AE4A63882490A8C',
	)
	await baseToUsdAssimilator.deployed()

	/** Deploy Quote Assimilator */
	const UsdcToUsdAssimilatorFactory = new UsdcToUsdAssimilator__factory(deployer)
	const usdcToUsdAssimilator = await UsdcToUsdAssimilatorFactory.deploy(
		// MAKE SURE TO MANUALLY CHANGE DECIMALS IN UsdcToUsdAssimilator.sol
		// '<ORACLE ADDRESS>',
		'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
		quoteToken.address
	)
	await usdcToUsdAssimilator.deployed()

	/** Deploy Assimilators */
	const AssimilatorsLib = new Assimilators__factory(deployer)
	const assimilators = await AssimilatorsLib.deploy()
	await assimilators.deployed()

	/** Deploy Curve Math */
	const CurveMathLib = new CurveMath__factory(deployer)
	const curveMath = await CurveMathLib.deploy()
	await curveMath.deployed()

	/** Deploy Proportional Liquidity */
	const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity', {
		libraries: {
			Assimilators: assimilators.address,
			CurveMath: curveMath.address,
		},
	})
	const proportionalLiquidityContract = await ProportionalLiquidityFactory.deploy()
	await proportionalLiquidityContract.deployed()

	/** Deploy Swaps */
	const SwapsFactory = await ethers.getContractFactory('AmmV1Swaps', {
		libraries: {
			Assimilators: assimilators.address,
			// CurveMath: curveMath.address,
		},
	})
	const swapsContract = await SwapsFactory.deploy()
	await swapsContract.deployed()

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
		_forceDeploy(deployer, network, FXPoolFactory, constructorArgs)
	} else {
		fxPool = await FXPoolFactory.deploy(...constructorArgs)
		await fxPool.deployed()
	}

	if (verify) {
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

	const FXPoolFactory = await ethers.getContractFactory('FXPool', {
		libraries: {
			Assimilators: DEPLOY_PARAMS.ASSIMILATORS,
			CurveMath: DEPLOY_PARAMS.CURVE_MATH,
		},
	})

	const { assets, tokens } = _prepareFXPoolConstructor(
		DEPLOY_PARAMS.BASE_TOKEN,
		DEPLOY_PARAMS.QUOTE_TOKEN,
		DEPLOY_PARAMS.BASE_ASSIMILATOR,
		DEPLOY_PARAMS.QUOTE_ASSIMILATOR
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

	if (force) {
		_forceDeploy(deployer, network, FXPoolFactory, constructorArgs)
	}

	if (verify) {
		await sleep(150000)

		// await verifyContract(hre, )
	}
}

const specifyContractsDeploy = async (taskArgs: any) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const network = taskArgs.to
	const force = taskArgs.force
	const verify = taskArgs.verify
}
