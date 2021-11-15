import DeployPool from './deployPool'

declare const task: any

export default () => {
  task('deploy-pool', 'Deploy custom pool')
    .addParam('to', 'Network to deploy Pool')
    .addParam('basetoken', 'Base Token of Pool')
    .addParam('quotetoken', 'Quote token of Pool')
    .setAction(DeployPool)
}