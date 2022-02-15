import { Vault } from '../../typechain/Vault'
import { MockWETH9 } from '../../typechain/MockWETH9'
import { MockPool } from '../../typechain/MockPool'
import { MockAggregator } from '../../typechain/MockAggregator'
import { ethers } from 'hardhat'
import {
	deployAllMockTokensAndOracles,
	deployMockBalancerVault,
	deployMockOracle,
	deployMockPool,
	deployMockWETH,
	MockTokenAndOracle,
} from './contractDeployers'
import { mockToken } from '../constants/mockTokenList'
import { MockToken } from '../../typechain/MockToken'

export interface TestEnv {
	WETH: MockWETH9
	vault: Vault
	mockPool: MockPool
	mockOracle: MockAggregator
	mockTokenArray: MockTokenAndOracle[]
	XSGD: MockToken
	USDC: MockToken
	XSGDOracle: MockAggregator
	USDCOracle: MockAggregator
}

export const setupEnvironment = async (): Promise<TestEnv> => {
	let mockTokenArray: MockTokenAndOracle[]
	const [deployer] = await ethers.getSigners()

	const WETH: MockWETH9 = await deployMockWETH()
	const vault: Vault = await deployMockBalancerVault(await deployer.getAddress(), WETH.address)
	const mockPool: MockPool = await deployMockPool(vault.address)
	const mockOracle: MockAggregator = await deployMockOracle(`${mockToken[0].mockOraclePrice}`)

	mockTokenArray = await deployAllMockTokensAndOracles(await deployer.getAddress())

	// TODO: improve using something like: const MOCK_TOKEN_REFERENCE = mockToken.find((t) => t.name === tokenName)
	const XSGD = mockTokenArray[1].tokenInstance
	const USDC = mockTokenArray[0].tokenInstance
	const XSGDOracle = mockTokenArray[1].oracleInstance
	const USDCOracle = mockTokenArray[0].oracleInstance

	return { WETH, vault, mockPool, mockOracle, mockTokenArray, XSGD, USDC, XSGDOracle, USDCOracle }
}
