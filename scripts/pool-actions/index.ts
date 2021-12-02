import DeployPool from './deployPool'

import AddLiquidity from './addLiquidity'
import RemoveLiquidity from './removeLiquidity'

declare const task: any

export default () => {
  task('deploy-pool', 'Deploy custom pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .setAction(DeployPool)

  task('add-liquidity', 'Add liquidity to custom balancer pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('pool', 'Pool to add liquidity')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .addParam('baseamount', 'Amount to add on base token side')
    .addParam('quoteamount', 'Amount to add on quote token side')
    .addParam('frominternalbalance', 'Add liquidity from vault internal balance')
    .setAction(AddLiquidity)

    task('remove-liquidity', 'Remove liquidity from custom balancer pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('pool', 'Pool to add liquidity')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .addParam('baseamount', 'Amount to add on base token side')
    .addParam('quoteamount', 'Amount to add on quote token side')
    .addParam('tointernalbalance', 'Remove liquidity send to vault internal balance')
    .setAction(RemoveLiquidity)
}