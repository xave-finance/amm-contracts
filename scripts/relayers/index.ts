import DeployDepositRelayer from './deployDepositRelayer'

declare const task: any

export default () => {
  task('deploy-deposit-relayer', 'Deploy Deposit Relayer')
    .setAction(DeployDepositRelayer)
}