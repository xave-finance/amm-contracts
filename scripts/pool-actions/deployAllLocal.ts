import { ethers } from 'ethers'
import { setupEnvironment } from '../../tests/common/setupEnvironment'

const deploy = async () => {
  /**
   * Reuse test setup script to reploy (almost) everything
   */
  const env = await setupEnvironment()

  /**
   * Get pool id
   */
  const poolId = await env.fxPool.getPoolId()

  /**
   * Deploy base assimilator
   * (quote/USDC assimilator already deployed in `setupEnvironment()`)
   */
  await env.assimilatorFactory.newBaseAssimilator(
    env.fxPHP.address,
    ethers.utils.parseUnits('1', 18),
    env.fxPHPOracle.address
  )

  const baseAssimilatorAddress = await env.assimilatorFactory.getAssimilator(env.fxPHP.address)
  const quoteAssimilatorAddress = await env.assimilatorFactory.usdcAssimilator()

  /**
   * Initialize pool
   */
  const baseWeight = ethers.utils.parseUnits('0.5')
  const quoteWeight = ethers.utils.parseUnits('0.5')
  const assetsWeights = [baseWeight, quoteWeight]
  const assets = [
    env.fxPHP.address,
    baseAssimilatorAddress,
    env.fxPHP.address,
    baseAssimilatorAddress,
    env.fxPHP.address,
    env.USDC.address,
    quoteAssimilatorAddress,
    env.USDC.address,
    quoteAssimilatorAddress,
    env.USDC.address,
  ]
  await env.fxPool.initialize(assets, assetsWeights)

  /**
   * Print out addresses for easy copy/paste
   */
  console.table({
    'Vault address': env.vault.address,
    'Mock USDC': env.USDC.address,
    'Mock fxPHP': env.fxPHP.address,
    'fxPHP:USDC pool': env.fxPool.address,
    'fxPHP:USDC pool id': poolId,
  })
}

deploy().then(() => process.exit(0))
