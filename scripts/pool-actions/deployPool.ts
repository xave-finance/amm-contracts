import sleep from '../utils/sleep'
import editJson from 'edit-json-file'

import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

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
	const network = taskArgs.to

	console.log(`Deploying on: ${network}`)

	const baseTokenAddress = await TOKENS_FILE.get(`${baseToken}.${network}`)
	const quoteTokenAddress = await TOKENS_FILE.get(`${quoteToken}.${network}`)

	console.log(`Base Token address: ${baseTokenAddress}`)
	console.log(`Quote Token address: ${quoteTokenAddress}`)

	let mockedProportionalLiquidity
	if (true) {
		const MockedProportionalLiquidity = await ethers.getContractFactory(
			'MockedProportionalLiquidity'
		)
		mockedProportionalLiquidity = await MockedProportionalLiquidity.deploy()
		await mockedProportionalLiquidity.deployed()

		console.log(`Mocked Proportional Liquidity deployed at: ${mockedProportionalLiquidity.address}`)
	}

	const CustomPool = await ethers.getContractFactory('CustomPool')
	const swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee

	const startTimestamp = (await ethers.provider.getBlock('latest')).timestamp
	const SECONDS_IN_YEAR = 31536000
	const tokens = sortAddresses([baseTokenAddress, quoteTokenAddress]) // need to be sorted
	const assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
	const pauseWindowDuration = 7776000
	const bufferPeriodDuration = 2592000
	const owner = false ? '0x0000000000000000000000000000000000000000' : deployer.address

	const customPool = await CustomPool.deploy(
		Vault.address,
		'Custom Pool',
		`${baseTokenAddress}-${quoteTokenAddress} LP`,
		tokens,
		swapFeePercentage,
		pauseWindowDuration,
		bufferPeriodDuration,
		owner,
		mockedProportionalLiquidity.address
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

	await hre.run('verify:verify', {
		address: customPool.address,
		constructorArguments: [
			Vault.address,
			'Custom Pool',
			`${baseTokenAddress}-${quoteTokenAddress} LP`,
			tokens,
			assetWeights,
			swapFeePercentage,
			pauseWindowDuration,
			bufferPeriodDuration,
			owner,
			mockedProportionalLiquidity.address,
		],
	})
}
