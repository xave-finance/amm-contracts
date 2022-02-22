import { Vault } from '../../typechain/Vault'
import { MockWETH9 } from '../../typechain/MockWETH9'
import { MockPool } from '../../typechain/MockPool'
import { MockAggregator } from '../../typechain/MockAggregator'
import { ethers } from 'hardhat'
import {
  deployAllMockTokensAndOracles,
  deployAssimilatorFactory,
  deployMockBalancerVault,
  deployMockOracle,
  deployMockPool,
  deployMockWETH,
  MockTokenAndOracle,
} from './contractDeployers'
import { mockToken } from '../constants/mockTokenList'
import { MockToken } from '../../typechain/MockToken'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'

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
  assimilatorFactory: AssimilatorFactory
}

export const setupEnvironment = async (): Promise<TestEnv> => {
  let mockTokenArray: MockTokenAndOracle[]
  const [deployer] = await ethers.getSigners()

  const WETH: MockWETH9 = await deployMockWETH()
  const vault: Vault = await deployMockBalancerVault(await deployer.getAddress(), WETH.address)
  const mockPool: MockPool = await deployMockPool(vault.address)
  const mockOracle: MockAggregator = await deployMockOracle(`${mockToken[0].mockOraclePrice}`)

  mockTokenArray = await deployAllMockTokensAndOracles(await deployer.getAddress())

  const XSGD = mockTokenArray[1].tokenInstance
  const USDC = mockTokenArray[0].tokenInstance
  const XSGDOracle = mockTokenArray[1].oracleInstance
  const USDCOracle = mockTokenArray[0].oracleInstance

  const assimilatorFactory = await deployAssimilatorFactory(USDCOracle.address, USDC.address)

  return { WETH, vault, mockPool, mockOracle, mockTokenArray, XSGD, USDC, XSGDOracle, USDCOracle, assimilatorFactory }
}
