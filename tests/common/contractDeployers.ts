import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { INTIAL_MINT, mockBalancerVaultValues } from '../constants'
import { mockToken } from '../constants/mockTokenList'
import { deploy } from './contract'
import { Vault } from '../../typechain/Vault'
import { MockWETH9 } from '../../typechain/MockWETH9'
import { MockToken } from '../../typechain/MockToken'
import { MockAggregator } from '../../typechain/MockAggregator'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'
import { MockABDK } from '../../typechain/MockABDK'
import { FXPool } from '../../typechain/FXPool'
import { MockWeightedPoolFactory } from '../../typechain/MockWeightedPoolFactory'
import { BigNumberish } from 'ethers'

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

// @todo re arrange the weights?
export interface FXPoolCurveParams {
  baseCurrency: string
  quoteCurrency: string
  baseWeight: BigNumberish
  quoteWeight: BigNumberish
  baseAssimilator: string
  quoteAssimilator: string
}
export const deployFXPool = async (
  assets: string[],
  expiration: string,
  unitSeconds: BigNumberish,
  vaultAddress: string,
  percentFee: BigNumberish,
  name: string, // LP Token name
  symbol: string // LP token symbol
): Promise<FXPool> => {
  const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity')
  const proportionalLiquidity = await ProportionalLiquidityFactory.deploy()

  await proportionalLiquidity.deployed()

  const FXPoolFactory = await ethers.getContractFactory('FXPool', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidity.address,
    },
  })

  const fxPool = await FXPoolFactory.deploy(
    assets,
    //curveParams.baseCurrency,
    //curveParams.quoteCurrency,
    //curveParams.baseWeight,
    //curveParams.quoteWeight,
    //curveParams.baseAssimilator,
    //curveParams.quoteAssimilator,
    expiration,
    unitSeconds,
    vaultAddress,
    percentFee,
    name,
    symbol
  )

  await fxPool.deployed()

  return fxPool as FXPool
}

export const deployMockWeightedPoolFactory = async (vaultAddress: string): Promise<MockWeightedPoolFactory> => {
  const MockWeightedPoolFactoryFactory = await ethers.getContractFactory('MockWeightedPoolFactory')
  const mockWeightedPoolFactory = await MockWeightedPoolFactoryFactory.deploy(vaultAddress)

  await mockWeightedPoolFactory.deployed()

  return mockWeightedPoolFactory as MockWeightedPoolFactory
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
