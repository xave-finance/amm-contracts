import {
  getTokenAddress,
  getTokenOracleAddress,
  getAssimilatorFactoryAddress,
  getVaultAddress,
  getProportionalLiquidityAddress,
  getSwapLibAddress,
  getFxPoolFactoryAddress,
} from '../utils/addresses'
import { AssimilatorFactory } from '../../typechain/AssimilatorFactory'
import { FXPool } from '../../typechain/FXPool'
import { FXPoolFactory } from '../../typechain/FXPoolFactory'
import verifyContract from '../utils/verify'
import { getFastGasPrice } from '../utils/gas'

declare const ethers: any
declare const hre: any

export default async (taskArgs: any) => {
  const ALPHA = ethers.utils.parseUnits('0.8')
  const BETA = ethers.utils.parseUnits('0.48')
  const MAX = ethers.utils.parseUnits('0.175')
  const EPSILON = ethers.utils.parseUnits('0.0005')
  const LAMBDA = ethers.utils.parseUnits('0.3')

  const network = taskArgs.to
  const baseToken = taskArgs.basetoken
  const freshDeploy = taskArgs.fresh ? taskArgs.fresh === 'true' : false
  const name = taskArgs.name
  const symbol = taskArgs.symbol
  const fee = taskArgs.fee

  console.log(`Deploying ${baseToken}:USDC pool to ${network}...`)

  const gasPrice = await getFastGasPrice()
  console.log('Using gas price: ', gasPrice.toString())

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

  /** Step# - get ProportionalLiquidity, Swap Library, AssimilatorFactory, S address */
  let assimilatorFactoryAddress: string | undefined
  let proportionalLiquidityAddress: string | undefined
  let swapLibAddress: string | undefined
  let fxPoolFactoryAddress: string | undefined
  if (!freshDeploy) {
    assimilatorFactoryAddress = getAssimilatorFactoryAddress(network)
    if (!assimilatorFactoryAddress) {
      console.error(`Address for AssimilatorFactory not available on ${network}!`)
      return
    }
    proportionalLiquidityAddress = getProportionalLiquidityAddress(network)
    if (!proportionalLiquidityAddress) {
      console.error(`Address for ProportionalLiquidity not available on ${network}!`)
      return
    }
    swapLibAddress = getSwapLibAddress(network)
    if (!swapLibAddress) {
      console.error(`Address for Swap Library not available on ${network}!`)
      return
    }
    fxPoolFactoryAddress = getFxPoolFactoryAddress(network)
    if (!fxPoolFactoryAddress) {
      console.error(`Address for Swap Library not available on ${network}!`)
      return
    }
  }

  /**
   * Step# - deploy or get assimilator factory
   **/
  let assimilatorFactory: AssimilatorFactory
  const AssimilatorFactoryFactory = await ethers.getContractFactory('AssimilatorFactory')

  if (freshDeploy) {
    console.log(`> Deploying AssimilatorFactory...`)
    console.table({
      oracle: quoteTokenOracleAddress,
      quote: quoteTokenAddress,
    })
    assimilatorFactory = await AssimilatorFactoryFactory.deploy(quoteTokenOracleAddress, quoteTokenAddress, {
      gasPrice,
    })
    await assimilatorFactory.deployed()
    console.log(`> AssimilatorFactory deployed at: ${assimilatorFactory.address}`)
  } else {
    console.log(`> Reusing AssimilatorFactory at `, assimilatorFactoryAddress)
    assimilatorFactory = AssimilatorFactoryFactory.attach(assimilatorFactoryAddress)
  }

  const quoteAssimilatorAddress = await assimilatorFactory.usdcAssimilator()
  console.log(`> USDC assimilator address: ${quoteAssimilatorAddress}`)

  /**
   * Step# - deploy baseToken assimilator
   **/
  let baseAssimilatorAddress: string
  console.log(`> Checking if ${baseToken} assimilator is already deployed...`)
  const baseAssimilator = await assimilatorFactory.getAssimilator(baseTokenAddress)
  if (baseAssimilator !== ethers.constants.AddressZero) {
    baseAssimilatorAddress = baseAssimilator
    console.log(`> ${baseToken} assimilator is already deployed at ${baseAssimilator}`)
  } else {
    console.log(`> Deploying ${baseToken} assimilator...`)
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
    baseAssimilatorAddress = await assimilatorFactory.getAssimilator(baseTokenAddress)
    console.log(`> ${baseToken} assimilator deployed at: ${baseAssimilatorAddress}`)
  }

  /**
   * Step# - deploy or get libs
   **/
  let proportionalLiquidity
  const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity')

  let swapContract
  const swapContractFactory = await ethers.getContractFactory('FXSwaps')

  if (freshDeploy) {
    proportionalLiquidity = await ProportionalLiquidityFactory.deploy({ gasPrice })
    await proportionalLiquidity.deployed()
    console.log('> ProportionalLiquidity deployed at:', proportionalLiquidity.address)

    swapContract = await swapContractFactory.deploy({ gasPrice })
    await swapContract.deployed()
    console.log('> Swap Library deployed at:', swapContract.address)
  } else {
    console.log(`> Reusing ProportionalLiquidity at `, proportionalLiquidityAddress)
    proportionalLiquidity = ProportionalLiquidityFactory.attach(proportionalLiquidityAddress)

    console.log('Need to add Swap Library to halodao-contract-addresses')
    console.log(`> Reusing Swap Library at `, swapLibAddress)
    swapContract = swapContractFactory.attach(swapLibAddress)
  }

  /**
   * Step# - deploy or get FxPoolFactory
   **/
  console.log(`> Deploying FxPoolFactory...`)
  let fxPoolFactory: FXPoolFactory
  const FXPoolFactoryFactory = await ethers.getContractFactory('FXPoolFactory', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidity.address,
      FXSwaps: swapContract.address,
    },
  })

  if (freshDeploy) {
    fxPoolFactory = await FXPoolFactoryFactory.deploy({ gasPrice })
    await fxPoolFactory.deployed()
    console.log(`> FxPoolFactory successfully deployed at: ${fxPoolFactory.address}`)
  } else {
    console.log(`> Reusing FXPoolFactory at `, fxPoolFactoryAddress)
    fxPoolFactory = FXPoolFactoryFactory.attach(fxPoolFactoryAddress)
  }

  /**
   * Step# - deploy FXPool
   **/
  const sortedAssets = [baseTokenAddress, quoteTokenAddress].sort()
  console.log(`> Deploying FxPool...`)
  console.table({
    name,
    symbol,
    fee,
    vaultAddress,
    sortedAssets,
  })
  const poolId = await fxPoolFactory.newFXPool(name, symbol, ethers.utils.parseUnits(fee), vaultAddress, sortedAssets, {
    gasPrice,
  })
  const fxPoolAddress = await fxPoolFactory.getActiveFxPool(sortedAssets)
  console.log(`> FxPool successfully deployed at: ${fxPoolAddress}`)
  console.log(`> Balancer vault pool id: ${poolId}`)
  //console.log('> Balancer vault pool id: ', toUtf8String(poolId as any))

  /**
   * Step# - initialize pool
   */
  console.log(`> Initializing FxPool...`)
  const baseWeight = ethers.utils.parseUnits('0.5')
  const quoteWeight = ethers.utils.parseUnits('0.5')
  const assetsWeights = [baseWeight, quoteWeight]
  const assets = [
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
  ]
  console.table({
    assets: assets.toString(),
    assetsWeights: assetsWeights.toString(),
  })

  const FXPoolFactory = await ethers.getContractFactory('FXPool', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidity.address,
      FXSwaps: swapContract.address,
    },
  })

  const fxPool: FXPool = FXPoolFactory.attach(fxPoolAddress)

  await fxPool.initialize(assets, assetsWeights, { gasPrice })
  console.log(`> FxPool initialized!`)

  /**
   * Step# - set pool/curve params
   **/
  console.log(`> Setting FxPool params...`)
  await fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA, { gasPrice })
  console.log(`> FxPool params set!`)

  /**
   * Step# - set collector address
   **/
  console.log(`> Setting collector address...`)
  const signers = await ethers.getSigners()
  await fxPool.setCollectorAddress(await signers[0].getAddress(), { gasPrice })
  console.log(`> Collector address set!`)

  /**
   * Step# - verify FxPool contract
   */
  console.log(`> Verifying FxPool...`)
  await verifyContract(hre, fxPoolAddress, [sortedAssets, vaultAddress, ethers.utils.parseUnits(fee), name, symbol])
}
