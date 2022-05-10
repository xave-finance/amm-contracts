import DeployPool from './deployPool'
import DeployFxPool from './deployFxPool'
import AddLiquidity from './addLiquidity'
import RemoveLiquidity from './removeLiquidity'

declare const task: any

export default () => {
  // task('deploy-pool', 'Deploy custom pool')
  //   .addParam('to', 'Network to deploy Pool')
  //   .addParam('strategy', 'Strategy of deployment')
  //   .addParam('force', 'Force deploy tx')
  //   .addParam('verify', 'Verify deployed contracts')
  //   .addOptionalParam('basetoken', 'Base Token of Pool')
  //   .addOptionalParam('quotetoken', 'Quote token of Pool')
  //   .addOptionalParam('baseassimilator', 'Base assimilator')
  //   .addOptionalParam('quoteassimilator', 'Quote assimilator')
  //   .addOptionalParam('proportionalliquidity', 'Proportional Liquidity contract address')
  //   .addOptionalParam('swaps', 'Swaps contract address')
  //   .setAction(DeployPool)

  task('deploy-fx-pool', 'Deploy an FX-accurate pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('basetoken', 'Base token for the pool')
    .addOptionalParam('fresh', 'Deploy a new AssimilatorFactory?')
    .setAction(DeployFxPool)

  task('add-liquidity', 'Add liquidity to custom balancer pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('vault', 'Vault address')
    .addParam('poolid', 'Pool to add liquidity')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .addParam('baseamount', 'Amount to add on base token side')
    .addParam('quoteamount', 'Amount to add on quote token side')
    .addParam('frominternalbalance', 'Add liquidity from vault internal balance')
    .setAction(AddLiquidity)

  task('remove-liquidity', 'Remove liquidity from custom balancer pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('pooladdress', 'Pool to remove liquidity from (address)')
    .addParam('poolid', 'Pool to remove liquidity from (vault pool id)')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .addParam('lptamount', 'Amount of LPT to withdraw')
    .addParam('tointernalbalance', 'Remove liquidity send to vault internal balance')
    .setAction(RemoveLiquidity)
}
