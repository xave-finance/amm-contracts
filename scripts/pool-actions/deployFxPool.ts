import {
  getTokenAddress,
  getTokenOracleAddress,
  getAssimilatorFactoryAddress,
  getVaultAddress,
} from '../utils/addresses'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'
import { FXPool } from '../../typechain/FXPool'
import { BaseToUsdAssimilator } from '../../typechain/BaseToUsdAssimilator'
import { UsdcToUsdAssimilator } from '../../typechain/UsdcToUsdAssimilator'
import { fxPHPUSDCFxPool } from '../../tests/constants/mockPoolList'

declare const ethers: any

export default async (taskArgs: any) => {
  const network = taskArgs.to
  const baseToken = taskArgs.basetoken
  const freshDeploy = taskArgs.fresh ? taskArgs.fresh === 'true' : false

  console.log(`Deploying ${baseToken}:USDC pool to ${network}...`)

  /** Step# - identify baseToken address */
  const baseTokenAddress = getTokenAddress(network, baseToken)
  if (!baseTokenAddress) {
    console.error(`Address for ${baseToken} not available on ${network}!`)
    return
  }

  /** Step# - get baseToken decimals */
  const ERC20 = await ethers.getContractFactory('MockToken')
  const baseTokenDecimals = await ERC20.attach(baseTokenAddress).decimals()

  /** Step# - get baseToken price feed oracle */
  const baseTokenOracleAddress = getTokenOracleAddress(network, baseToken)
  if (!baseTokenOracleAddress) {
    console.error(`Oracle for ${baseToken} not available on ${network}!`)
    return
  }

  /** Step# - get quoteToken (USDC) address */
  const quoteTokenAddress = getTokenAddress(network, 'USDC')
  if (!quoteTokenAddress) {
    console.error(`Address for USDC not available on ${network}!`)
    return
  }

  /** Step# - get quoteToken (USDC) price feed oracle */
  const quoteTokenOracleAddress = getTokenOracleAddress(network, 'USDC')
  if (!quoteTokenOracleAddress) {
    console.error(`Oracle for USDC not available on ${network}!`)
    return
  }

  /** Step# - get balancer vault address */
  const vaultAddress = getVaultAddress(network)
  if (!vaultAddress) {
    console.error(`Address for balancer vault not available on ${network}!`)
    return
  }

  /**
   * Step# - deploy or get assimilator factory
   **/
  let assimilatorFactory: AssimilatorFactory
  let assimilatorFactoryAddress: string
  const AssimilatorFactoryFactory = await ethers.getContractFactory('AssimilatorFactory')

  if (freshDeploy) {
    console.log(`> Deploying AssimilatorFactory...`)
    console.table({
      oracle: quoteTokenOracleAddress,
      quote: quoteTokenAddress,
    })
    assimilatorFactory = await AssimilatorFactoryFactory.deploy(quoteTokenOracleAddress, quoteTokenAddress)
    await assimilatorFactory.deployed()
    console.log(`> AssimilatorFactory deployed at: ${assimilatorFactory.address}`)
    assimilatorFactoryAddress = assimilatorFactory.address
  } else {
    assimilatorFactoryAddress = getAssimilatorFactoryAddress(network)
    assimilatorFactory = AssimilatorFactoryFactory.attach(assimilatorFactoryAddress)
  }

  const quoteAssimilatorAddress = await assimilatorFactory.usdcAssimilator()
  console.log(`> USDC assimilator address: ${quoteAssimilatorAddress}`)

  /**
   * Step# - deploy baseToken assimilator
   **/
  console.log(`> Deploying base assimilator...`)
  console.table({
    base: baseTokenAddress,
    baseDecimals: baseTokenDecimals,
    oracle: baseTokenOracleAddress,
  })
  await assimilatorFactory.newBaseAssimilator(
    baseTokenAddress,
    ethers.utils.parseUnits('1', baseTokenDecimals),
    baseTokenOracleAddress
  )
  const baseAssimilatorAddress = await assimilatorFactory.getAssimilator(baseTokenAddress)
  console.log(`> Base assimilator deployed at: ${baseAssimilatorAddress}`)

  /**
   * Step# - deploy pool
   **/
  const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity')
  const proportionalLiquidity = await ProportionalLiquidityFactory.deploy()
  await proportionalLiquidity.deployed()

  const FXPoolFactory = await ethers.getContractFactory('FXPool', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidity.address,
    },
  })

  const assets = [baseTokenAddress, quoteTokenAddress].sort()
  const deadline = new Date().getTime() + 60 * 5 * 1000 // 5 minutes from now
  console.log(`> Deploying FxPool...`)
  console.table({
    assets: assets.join(', '),
    expiration: deadline,
    unitSeconds: fxPHPUSDCFxPool.unitSeconds,
    vault: vaultAddress,
    percentFee: fxPHPUSDCFxPool.percentFee,
    name: fxPHPUSDCFxPool.name,
    symbol: fxPHPUSDCFxPool.symbol,
  })
  const fxPool: FXPool = await FXPoolFactory.deploy(
    assets,
    deadline,
    ethers.utils.parseUnits('100'),
    vaultAddress,
    ethers.utils.parseUnits('0.01'),
    `HALO ${baseToken}USDC FXPool`,
    `HFX-${baseToken}USDC`
  )
  await fxPool.deployed()
  console.log(`> FxPool successfully deployed at: ${fxPool.address}`)

  /**
   * Step# - initialize pool
   */
  console.log(`> Initializing FxPool...`)
  const baseWeight = ethers.utils.parseUnits('0.5')
  const quoteWeight = ethers.utils.parseUnits('0.5')
  fxPool.initialize(
    [
      baseTokenAddress,
      baseAssimilatorAddress,
      baseTokenAddress,
      baseAssimilatorAddress,
      baseTokenAddress,
      quoteTokenAddress,
      quoteAssimilatorAddress,
      quoteTokenAddress,
      quoteAssimilatorAddress,
      quoteTokenAddress,
    ],
    [baseWeight, quoteWeight]
  )
  console.log(`> FxPool initialized!`)

  /**
   * Step# - update vault & poolId on assimilators
   */
  console.log(`> Updating assimilators...`)
  const poolId = await fxPool.getPoolId()
  console.log(`> Balancer vault pool id: ${poolId}`)

  const BaseToUsdAssimilator = await ethers.getContractFactory('BaseToUsdAssimilator')
  const baseAssimilator: BaseToUsdAssimilator = BaseToUsdAssimilator.attach(baseAssimilatorAddress)
  console.log(`setting vault to ${vaultAddress}...`)
  await baseAssimilator.setVault(vaultAddress)
  console.log('finished setting vault!')
  await baseAssimilator.setPoolId(poolId)

  const UsdcToUsdAssimilator = await ethers.getContractFactory('UsdcToUsdAssimilator')
  const quoteAssimilator: UsdcToUsdAssimilator = UsdcToUsdAssimilator.attach(quoteAssimilatorAddress)
  await quoteAssimilator.setVault(vaultAddress)
  await quoteAssimilator.setPoolId(poolId)
  console.log(`> Assimilators updated!`)
}
