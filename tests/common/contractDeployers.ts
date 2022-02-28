import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { INTIAL_MINT, mockBalancerVaultValues } from '../constants'
import { mockToken } from '../constants/mockTokenList'
import { deploy } from './contract'
import { Vault } from '../../typechain/Vault'
import { MockWETH9 } from '../../typechain/MockWETH9'
import { MockPool } from '../../typechain/MockPool'
import { MockToken } from '../../typechain/MockToken'
import { MockAggregator } from '../../typechain/MockAggregator'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'
import { MockABDK } from '../../typechain/MockABDK'

export const deployMockBalancerVault = async (adminAddress: string, WETHAddress: string): Promise<Vault> => {
  const vault = await deploy('Vault', {
    args: [
      adminAddress,
      WETHAddress,
      mockBalancerVaultValues.bufferPeriodEndTime,
      mockBalancerVaultValues.pauseWindowEndTime,
    ],
  })

  return vault as Vault
}

export const deployMockWETH = async (): Promise<MockWETH9> => {
  const MockWETHTokenFactory = await ethers.getContractFactory('MockWETH9')
  const WETH = await MockWETHTokenFactory.deploy()
  await WETH.deployed()

  return WETH as MockWETH9
}

export const deployMockPool = async (vaultAddress: string): Promise<MockPool> => {
  const mockPoolFactory = await ethers.getContractFactory('MockPool')
  const mockPool = await mockPoolFactory.deploy(vaultAddress, 0) // weighted pool
  await mockPool.deployed()

  return mockPool as MockPool
}

export const deployMockMintableERC20 = async (name: string, symbol: string, decimals: number): Promise<MockToken> => {
  const MockERC20Factory = await ethers.getContractFactory('MockToken')
  const mockERC20 = await MockERC20Factory.deploy(name, symbol, decimals)
  await mockERC20.deployed()

  return mockERC20 as MockToken
}

export const deployMockOracle = async (latestAnswer: string): Promise<MockAggregator> => {
  const mockOracleFactory = await ethers.getContractFactory('MockAggregator')
  const mockOracle = await mockOracleFactory.deploy()
  await mockOracle.deployed()

  await mockOracle.setAnswer(latestAnswer)
  return mockOracle as MockAggregator
}

export const deployAssimilatorFactory = async (
  usdcOracleAddress: string,
  usdcAddress: string
): Promise<AssimilatorFactory> => {
  const AssimilatorFactoryFactory = await ethers.getContractFactory('AssimilatorFactory')
  const assimilatorFactory = await AssimilatorFactoryFactory.deploy(usdcOracleAddress, usdcAddress)

  await assimilatorFactory.deployed()

  return assimilatorFactory as AssimilatorFactory
}

export const deployMockABDKLib = async (): Promise<MockABDK> => {
  const MockABDKLibFactory = await ethers.getContractFactory('MockABDK')
  const mockABDKLib = await MockABDKLibFactory.deploy()

  await mockABDKLib.deployed()

  return mockABDKLib as MockABDK
}

export interface MockTokenAndOracle {
  tokenInstance: MockToken
  oracleInstance: MockAggregator
}

export const deployAllMockTokensAndOracles = async (to: string): Promise<MockTokenAndOracle[]> => {
  let tokens: MockTokenAndOracle[] = []

  for (const token of mockToken) {
    const tokenInstance = await deployMockMintableERC20(token.name, token.symbol, token.decimal)
    await tokenInstance.mint(to, parseUnits(INTIAL_MINT, token.decimal))
    const oracleInstance = await deployMockOracle(token.mockOraclePrice)
    tokens.push({ tokenInstance, oracleInstance })
  }

  return tokens
}
