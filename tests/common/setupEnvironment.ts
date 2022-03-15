import { Vault } from '../../typechain/Vault'
import { MockWETH9 } from '../../typechain/MockWETH9'
import { MockPool } from '../../typechain/MockPool'
import { MockAggregator } from '../../typechain/MockAggregator'
import { ethers } from 'hardhat'
import {
  deployAllMockTokensAndOracles,
  deployAssimilatorFactory,
  deployMockABDKLib,
  deployMockBalancerVault,
  deployMockOracle,
  deployMockPool,
  deployMockWeightedPoolFactory,
  deployMockWETH,
  MockTokenAndOracle,
} from './contractDeployers'
import { mockToken } from '../constants/mockTokenList'
import { MockToken } from '../../typechain/MockToken'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'
import { MockABDK } from '../../typechain/MockABDK'
import { MockWeightedPoolFactory } from '../../typechain/MockWeightedPoolFactory'

export interface TestEnv {
  WETH: MockWETH9
  vault: Vault
  // mockPool: MockPool
  mockOracle: MockAggregator
  mockTokenArray: MockTokenAndOracle[]
  XSGD: MockToken
  USDC: MockToken
  EURS: MockToken
  fxPHP: MockToken
  XSGDOracle: MockAggregator
  USDCOracle: MockAggregator
  EURSOracle: MockAggregator
  fxPHPOracle: MockAggregator
  assimilatorFactory: AssimilatorFactory
  mockABDK: MockABDK
  mockWeightedPoolFactory: MockWeightedPoolFactory
}

export const setupEnvironment = async (): Promise<TestEnv> => {
  let mockTokenArray: MockTokenAndOracle[]
  const [deployer] = await ethers.getSigners()

  const WETH: MockWETH9 = await deployMockWETH()
  const vault: Vault = await deployMockBalancerVault(await deployer.getAddress(), WETH.address)
  // const mockPool: MockPool = await deployMockPool(vault.address)
  const mockOracle: MockAggregator = await deployMockOracle(`${mockToken[0].mockOraclePrice}`)
  const mockABDK: MockABDK = await deployMockABDKLib()
  const mockWeightedPoolFactory: MockWeightedPoolFactory = await deployMockWeightedPoolFactory(vault.address)

  mockTokenArray = await deployAllMockTokensAndOracles(await deployer.getAddress())

  const USDC = mockTokenArray[0].tokenInstance
  const XSGD = mockTokenArray[1].tokenInstance
  const EURS = mockTokenArray[2].tokenInstance
  const fxPHP = mockTokenArray[3].tokenInstance
  const USDCOracle = mockTokenArray[0].oracleInstance
  const XSGDOracle = mockTokenArray[1].oracleInstance
  const EURSOracle = mockTokenArray[2].oracleInstance
  const fxPHPOracle = mockTokenArray[3].oracleInstance

  const assimilatorFactory = await deployAssimilatorFactory(USDCOracle.address, USDC.address)

  return {
    WETH,
    vault,
    // mockPool,
    mockOracle,
    mockTokenArray,
    XSGD,
    USDC,
    EURS,
    fxPHP,
    XSGDOracle,
    USDCOracle,
    EURSOracle,
    fxPHPOracle,
    assimilatorFactory,
    mockABDK,
    mockWeightedPoolFactory,
  }
}
